/**
 * TestCoverageAnalyzer.ts
 * 
 * Maps test files to endpoints they cover.
 * Detects untested endpoints and coverage gaps.
 * Supports multiple test frameworks: Jest, Playwright, Cypress, Mocha, etc.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestFile, TestCase, Endpoint, EndpointCoverageMatrix, GapItem, GapType, GapSeverity } from '../../models/RunOrchestrator';

// Re-export TestCase for convenience
export { TestCase };

export interface TestFrameworkConfig {
    testPatterns: string[];       // file patterns: *.test.ts, *.spec.ts, etc.
    extractTestCases: (content: string, filePath: string) => TestCase[];
    extractEndpoints: (content: string, filePath: string) => string[];
}

const FRAMEWORK_CONFIGS: Record<string, TestFrameworkConfig> = {
    jest: {
        testPatterns: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js'],
        extractTestCases: extractJestTestCases,
        extractEndpoints: extractJestEndpoints
    },
    playwright: {
        testPatterns: ['**/*.spec.ts', '**/*.spec.js', '**/tests/**/*.ts'],
        extractTestCases: extractPlaywrightTestCases,
        extractEndpoints: extractPlaywrightEndpoints
    },
    cypress: {
        testPatterns: ['**/cypress/e2e/**/*.cy.ts', '**/cypress/integration/**/*.spec.ts'],
        extractTestCases: extractCypressTestCases,
        extractEndpoints: extractCypressEndpoints
    },
    mocha: {
        testPatterns: ['**/*.mocha.ts', '**/*.mocha.js', '**/test/**/*.ts'],
        extractTestCases: extractMochaTestCases,
        extractEndpoints: extractMochaEndpoints
    }
};

/**
 * TestCoverageAnalyzer: discovers tests and maps to endpoints
 */
export class TestCoverageAnalyzer {
    /**
     * Find all test files in workspace
     */
    async findTestFiles(workspaceRoot: string): Promise<TestFile[]> {
        const testFiles: TestFile[] = [];

        // For each known framework, search for test files
        for (const [framework, config] of Object.entries(FRAMEWORK_CONFIGS)) {
            for (const pattern of config.testPatterns) {
                const files = await this.findFilesByPattern(workspaceRoot, pattern);
                for (const filePath of files) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        const testCases = config.extractTestCases(content, filePath);
                        const testedEndpoints = config.extractEndpoints(content, filePath);

                        if (testCases.length > 0 || testedEndpoints.length > 0) {
                            testFiles.push({
                                testId: this.hashTestFile(filePath),
                                path: path.relative(workspaceRoot, filePath),
                                framework: framework as any,
                                testedEndpoints,
                                testCases
                            });
                        }
                    } catch (error) {
                        console.warn(`Failed to analyze test file ${filePath}:`, error);
                    }
                }
            }
        }

        return testFiles;
    }

    /**
     * Build coverage matrix: endpoint → test coverage info
     */
    buildCoverageMatrix(
        endpoints: Endpoint[],
        testFiles: TestFile[]
    ): EndpointCoverageMatrix {
        const matrix: EndpointCoverageMatrix = {};

        for (const endpoint of endpoints) {
            const endpointKey = `${endpoint.method} ${endpoint.path}`;
            const coveringTests: string[] = [];

            // Find all tests that mention this endpoint
            for (const testFile of testFiles) {
                const testsCoveringThis = testFile.testCases.filter((tc: TestCase) =>
                    tc.endpoints.some((ep: string) => this.isEndpointMatch(ep, endpoint.path, endpoint.method))
                );

                for (const test of testsCoveringThis) {
                    coveringTests.push(test.caseId);
                }
            }

            matrix[endpointKey] = {
                tested: coveringTests.length > 0,
                testIds: coveringTests,
                coverage: coveringTests.length > 0 ? 100 : 0
            };
        }

        return matrix;
    }

    /**
     * Detect untested endpoints (coverage gaps)
     */
    detectUntestedEndpoints(
        endpoints: Endpoint[],
        coverageMatrix: EndpointCoverageMatrix
    ): GapItem[] {
        const gaps: GapItem[] = [];

        for (const endpoint of endpoints) {
            const endpointKey = `${endpoint.method} ${endpoint.path}`;
            const coverageInfo = coverageMatrix[endpointKey];

            if (!coverageInfo?.tested) {
                gaps.push({
                    type: GapType.UNTESTED_ENDPOINT,
                    severity: this.computeSeverityForUntestedEndpoint(endpoint),
                    message: `${endpoint.method} ${endpoint.path} has no test coverage`,
                    file: endpoint.file,
                    line: endpoint.line,
                    suggestedFix: 'Generate and add test cases for this endpoint',
                    gapId: '',
                    priorityScore: 0,
                    blastRadius: 1,
                    frequency: 1,
                    lastDetected: Date.now(),
                    status: 'OPEN',
                    linkedTests: [],
                    linkedPatches: [],
                    linkedExecutions: []
                });
            }
        }

        return gaps;
    }

    /**
     * Compute coverage percentage
     */
    computeCoveragePercent(
        endpoints: Endpoint[],
        coverageMatrix: EndpointCoverageMatrix
    ): number {
        if (endpoints.length === 0) return 100;

        const tested = endpoints.filter(ep => {
            const key = `${ep.method} ${ep.path}`;
            return coverageMatrix[key]?.tested ?? false;
        }).length;

        return Math.round((tested / endpoints.length) * 100);
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    private hashTestFile(filePath: string): string {
        return `test_${Math.abs(filePath.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0))}`;
    }

    private isEndpointMatch(testEndpoint: string, actualPath: string, actualMethod: string): boolean {
        // Simple substring matching for now; can be enhanced with more sophisticated parsing
        return testEndpoint.includes(this.normalizeEndpoint(actualPath)) &&
               (testEndpoint.toUpperCase().includes(actualMethod) || testEndpoint === '*');
    }

    private normalizeEndpoint(path: string): string {
        path = path.split('?')[0];
        path = path.replace(/\/\d+/g, '/:id');
        path = path.replace(/\/\$\{[^}]+\}/g, '/:id');
        path = path.replace(/\/:[a-zA-Z0-9_]+/g, '/:id');
        return path;
    }

    private computeSeverityForUntestedEndpoint(endpoint: Endpoint): GapSeverity {
        // Endpoints with side effects (POST, PUT, DELETE) are more critical
        const method = endpoint.method.toUpperCase();
        if (method === 'DELETE') return GapSeverity.CRITICAL;
        if (['POST', 'PUT', 'PATCH'].includes(method)) return GapSeverity.HIGH;
        return GapSeverity.MEDIUM;
    }

    private async findFilesByPattern(workspaceRoot: string, pattern: string): Promise<string[]> {
        const files: string[] = [];
        const walk = (dir: string) => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
                            walk(fullPath);
                        }
                    } else {
                        if (this.matchesPattern(entry.name, pattern)) {
                            files.push(fullPath);
                        }
                    }
                }
            } catch (error) {
                // Silently ignore errors
            }
        };
        walk(workspaceRoot);
        return files;
    }

    private matchesPattern(filename: string, pattern: string): boolean {
        // Simple glob matching
        const regexPattern = pattern
            .replace(/\//g, '\\/')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '.');
        return new RegExp(`^${regexPattern}$`).test(filename);
    }
}

// ============================================================================
// Framework-specific extractors
// ============================================================================

function extractJestTestCases(content: string, filePath: string): TestCase[] {
    const cases: TestCase[] = [];
    
    // Match describe and it/test blocks
    const testRegex = /(?:describe|it|test)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s+)?\(\s*(?:\w+)?\s*\)\s*=>\s*\{/g;
    let match;
    
    while ((match = testRegex.exec(content)) !== null) {
        const testName = match[1];
        // Extract endpoint references from the matched test
        const endpoints = extractEndpointsFromTestCode(content.substring(match.index));
        
        cases.push({
            caseId: `jest_${Buffer.from(testName).toString('hex').substring(0, 16)}`,
            name: testName,
            endpoints,
            assertions: countAssertions(content.substring(match.index, match.index + 500))
        });
    }
    
    return cases;
}

function extractJestEndpoints(content: string, filePath: string): string[] {
    return extractEndpointsFromTestCode(content);
}

function extractPlaywrightTestCases(content: string, filePath: string): TestCase[] {
    const cases: TestCase[] = [];
    
    // Match test blocks in Playwright
    const testRegex = /test\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s+)?\(\s*(?:\w+)?\s*\)\s*=>\s*\{/g;
    let match;
    
    while ((match = testRegex.exec(content)) !== null) {
        const testName = match[1];
        const endpoints = extractEndpointsFromTestCode(content.substring(match.index));
        
        cases.push({
            caseId: `pw_${Buffer.from(testName).toString('hex').substring(0, 16)}`,
            name: testName,
            endpoints,
            assertions: countAssertions(content.substring(match.index, match.index + 500))
        });
    }
    
    return cases;
}

function extractPlaywrightEndpoints(content: string, filePath: string): string[] {
    return extractEndpointsFromTestCode(content);
}

function extractCypressTestCases(content: string, filePath: string): TestCase[] {
    const cases: TestCase[] = [];
    
    // Match describe and it blocks in Cypress
    const testRegex = /(?:describe|it|context)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\(\s*\)\s*=>\s*\{/g;
    let match;
    
    while ((match = testRegex.exec(content)) !== null) {
        const testName = match[1];
        const endpoints = extractEndpointsFromTestCode(content.substring(match.index));
        
        cases.push({
            caseId: `cy_${Buffer.from(testName).toString('hex').substring(0, 16)}`,
            name: testName,
            endpoints,
            assertions: countAssertions(content.substring(match.index, match.index + 500))
        });
    }
    
    return cases;
}

function extractCypressEndpoints(content: string, filePath: string): string[] {
    return extractEndpointsFromTestCode(content);
}

function extractMochaTestCases(content: string, filePath: string): TestCase[] {
    const cases: TestCase[] = [];
    
    // Match describe and it blocks in Mocha
    const testRegex = /(?:describe|it)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s+)?\(\s*(?:\w+)?\s*\)\s*=>\s*\{/g;
    let match;
    
    while ((match = testRegex.exec(content)) !== null) {
        const testName = match[1];
        const endpoints = extractEndpointsFromTestCode(content.substring(match.index));
        
        cases.push({
            caseId: `mocha_${Buffer.from(testName).toString('hex').substring(0, 16)}`,
            name: testName,
            endpoints,
            assertions: countAssertions(content.substring(match.index, match.index + 500))
        });
    }
    
    return cases;
}

function extractMochaEndpoints(content: string, filePath: string): string[] {
    return extractEndpointsFromTestCode(content);
}

// ============================================================================
// Common extractors
// ============================================================================

function extractEndpointsFromTestCode(content: string): string[] {
    const endpoints: Set<string> = new Set();
    
    // Look for common patterns: GET, POST, etc. followed by endpoint paths
    const patterns = [
        /(?:GET|POST|PUT|DELETE|PATCH|OPTIONS)\s+['"`]([^'"`]+)['"`]/gi,
        /\.(?:get|post|put|delete|patch|request)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
        /fetch\s*\(\s*['"`]([^'"`]+)['"`]/gi,
        /axios\.(?:get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    ];
    
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const endpoint = match[1];
            // Filter out obviously non-endpoint strings
            if (endpoint.includes('/') && !endpoint.includes('?') && endpoint.length < 200) {
                endpoints.add(endpoint);
            }
        }
    }
    
    return Array.from(endpoints);
}

function countAssertions(testCodeSnippet: string): number {
    const patterns = [
        /(?:expect|assert|should|toBe|toEqual|toContain)/gi
    ];
    
    let count = 0;
    for (const pattern of patterns) {
        const matches = testCodeSnippet.match(pattern);
        count += matches?.length ?? 0;
    }
    
    return count;
}
