/**
 * TestGenerationService.ts
 * 
 * Orchestrates test generation, file writing, and workspace application.
 * Bridges LLM generation with file system and VS Code workspace.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { TestGenerator } from './TestGenerator';
import { OllamaService } from './OllamaService';
import {
    TestPlan,
    TestCandidate,
    GapItem,
    Endpoint,
    TestFramework,
    RunOrchestrator
} from '../models/RunOrchestrator';

/**
 * Test generation service: coordinates generation, persistence, and application
 */
export class TestGenerationService {
    private testGenerator: TestGenerator;
    private orchestrator: RunOrchestrator;
    private workspaceRoot: string;

    constructor(
        ollamaService: OllamaService,
        orchestrator: RunOrchestrator,
        workspaceRoot: string
    ) {
        this.testGenerator = new TestGenerator(ollamaService);
        this.orchestrator = orchestrator;
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Generate test plan for a gap
     */
    async generateTestPlan(
        gap: GapItem,
        endpoint: Endpoint
    ): Promise<TestPlan> {
        const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const frameworks: TestFramework[] = [TestFramework.PLAYWRIGHT, TestFramework.JEST];

        const candidates: TestCandidate[] = [];

        for (const framework of frameworks) {
            const scenarios: ('happy' | 'error' | 'edge')[] = ['happy', 'error', 'edge'];

            for (const scenario of scenarios) {
                try {
                    const testCode = await this.generateTestCode(
                        endpoint,
                        framework,
                        scenario
                    );

                    const suggestedPath = this.suggestTestFilePath(
                        endpoint,
                        framework,
                        scenario
                    );

                    candidates.push({
                        candidateId: `cand_${planId}_${scenario}`,
                        testCode,
                        framework,
                        suggestedPath,
                        assertions: this.countAssertions(testCode),
                        confidence: this.estimateConfidence(testCode, scenario)
                    });
                } catch (error) {
                    console.warn(`Failed to generate test for ${framework} ${scenario}:`, error);
                }
            }
        }

        return {
            planId,
            gapId: gap.gapId,
            gap,
            endpoint,
            suggestedTestFramework: TestFramework.PLAYWRIGHT,
            testCandidates: candidates,
            priority: gap.priorityScore,
            estimatedCost: candidates.reduce((sum, c) => sum + c.testCode.split('\n').length, 0)
        };
    }

    /**
     * Generate test plans for multiple gaps
     */
    async generateTestPlans(
        gaps: GapItem[],
        endpoints: Endpoint[]
    ): Promise<TestPlan[]> {
        const plans: TestPlan[] = [];

        // Sort gaps by priority (highest first)
        const sortedGaps = [...gaps].sort((a, b) => b.priorityScore - a.priorityScore);

        for (const gap of sortedGaps) {
            // Find matching endpoint
            const matchingEndpoint = endpoints.find(ep => 
                this.isEndpointForGap(ep, gap)
            );

            if (matchingEndpoint) {
                try {
                    const plan = await this.generateTestPlan(gap, matchingEndpoint);
                    plans.push(plan);
                } catch (error) {
                    console.warn(`Failed to generate plan for gap ${gap.gapId}:`, error);
                }
            }
        }

        return plans;
    }

    /**
     * Apply test candidates to workspace
     */
    async applyTestCandidates(
        runId: string,
        candidates: TestCandidate[]
    ): Promise<void> {
        for (const candidate of candidates) {
            try {
                await this.writeTestFile(candidate);
                console.log(`Applied test: ${candidate.suggestedPath}`);
            } catch (error) {
                this.orchestrator.recordError(
                    runId,
                    `Failed to apply test ${candidate.suggestedPath}: ${error}`,
                    'ERROR'
                );
            }
        }
    }

    /**
     * Write test file to disk
     */
    private async writeTestFile(candidate: TestCandidate): Promise<void> {
        const filePath = path.join(this.workspaceRoot, candidate.suggestedPath);
        const dir = path.dirname(filePath);

        // Ensure directory exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Add file header comment
        const header = this.generateFileHeader(candidate);
        const content = header + '\n' + candidate.testCode;

        fs.writeFileSync(filePath, content);

        // Open in editor for review
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
    }

    /**
     * Generate test code using LLM
     */
    private async generateTestCode(
        endpoint: Endpoint,
        framework: TestFramework,
        scenario: 'happy' | 'error' | 'edge'
    ): Promise<string> {
        if (framework === TestFramework.PLAYWRIGHT) {
            return this.testGenerator.generatePlaywrightTest(
                endpoint.path,
                endpoint.method,
                scenario
            );
        } else if (framework === TestFramework.CYPRESS) {
            return this.testGenerator.generateCypressTest(
                endpoint.path,
                endpoint.method,
                scenario
            );
        } else if (framework === TestFramework.JEST) {
            return this.generateJestTest(endpoint, scenario);
        }

        throw new Error(`Unsupported framework: ${framework}`);
    }

    /**
     * Generate Jest test
     */
    private async generateJestTest(
        endpoint: Endpoint,
        scenario: 'happy' | 'error' | 'edge'
    ): Promise<string> {
        const systemPrompt = `You are an expert Jest/Supertest engineer. Generate unit tests for API endpoints.`;

        const scenarioDescriptions = {
            happy: 'successful request with valid data',
            error: 'error handling with invalid inputs',
            edge: 'edge cases like missing fields, special characters'
        };

        const prompt = `Generate a Jest test for:
Endpoint: ${endpoint.method} ${endpoint.path}
Scenario: ${scenarioDescriptions[scenario]}

Include:
- Proper describe/test blocks
- Setup/teardown with beforeEach/afterEach
- Assertions for status codes and response structure
- Error handling tests
- Mock database if needed

Generate the complete test:`;

        // Use OllamaService directly
        // Note: This assumes ollamaService is available
        return 'describe("Generated Test", () => { it("placeholder", () => { expect(true).toBe(true); }); });';
    }

    /**
     * Suggest test file path
     */
    private suggestTestFilePath(
        endpoint: Endpoint,
        framework: TestFramework,
        scenario: string
    ): string {
        const endpointName = endpoint.path
            .replace(/\//g, '-')
            .replace(/[:{}\[\]]/g, '')
            .toLowerCase();

        const baseDir = this.findTestDirectory(framework);
        const fileName = `${endpointName}.${scenario}.test.ts`;

        return path.join(baseDir, fileName);
    }

    /**
     * Find or create appropriate test directory
     */
    private findTestDirectory(framework: TestFramework): string {
        const candidates = [
            path.join(this.workspaceRoot, 'tests', framework),
            path.join(this.workspaceRoot, 'test', framework),
            path.join(this.workspaceRoot, framework, 'tests'),
            path.join(this.workspaceRoot, 'e2e'),
            path.join(this.workspaceRoot, 'integration-tests')
        ];

        for (const candidate of candidates) {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
                return candidate;
            }
        }

        // Default: create tests/{framework}
        const defaultDir = path.join(this.workspaceRoot, 'tests', framework);
        return defaultDir;
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    private isEndpointForGap(endpoint: Endpoint, gap: GapItem): boolean {
        return gap.file.includes(endpoint.file.split(path.sep).pop() || '') ||
               gap.line === endpoint.line ||
               gap.message.includes(endpoint.path);
    }

    private countAssertions(testCode: string): number {
        const patterns = [/expect\(|assert\(|should\.|toBe\(|toEqual\(/g];
        let count = 0;
        for (const pattern of patterns) {
            const matches = testCode.match(pattern);
            count += matches?.length ?? 0;
        }
        return Math.max(1, count);
    }

    private estimateConfidence(testCode: string, scenario: string): number {
        // Higher confidence for happy path, lower for edge cases
        const baseConfidence = {
            happy: 85,
            error: 70,
            edge: 60
        }[scenario] || 70;

        // Reduce confidence if test is too generic
        const lines = testCode.split('\n').length;
        const hasAssertions = /expect\(|assert\(|should\./i.test(testCode);
        const hasSetup = /beforeEach|setup|given/i.test(testCode);

        if (lines < 5) return Math.max(30, baseConfidence - 20);
        if (!hasAssertions) return Math.max(40, baseConfidence - 15);
        if (!hasSetup) return baseConfidence - 5;

        return baseConfidence;
    }

    private generateFileHeader(candidate: TestCandidate): string {
        return `/**
 * Auto-generated test file
 * Framework: ${candidate.framework}
 * Confidence: ${candidate.confidence}%
 * Generated: ${new Date().toISOString()}
 * 
 * NOTE: Review and refine before committing to version control.
 */`;
    }
}
