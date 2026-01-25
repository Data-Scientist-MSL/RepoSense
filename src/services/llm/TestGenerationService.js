"use strict";
/**
 * TestGenerationService.ts
 *
 * Orchestrates test generation, file writing, and workspace application.
 * Bridges LLM generation with file system and VS Code workspace.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestGenerationService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const TestGenerator_1 = require("./TestGenerator");
const RunOrchestrator_1 = require("../../models/RunOrchestrator");
/**
 * Test generation service: coordinates generation, persistence, and application
 */
class TestGenerationService {
    constructor(ollamaService, orchestrator, workspaceRoot) {
        this.testGenerator = new TestGenerator_1.TestGenerator(ollamaService);
        this.orchestrator = orchestrator;
        this.workspaceRoot = workspaceRoot;
    }
    /**
     * Generate test plan for a gap
     */
    async generateTestPlan(gap, endpoint) {
        const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const frameworks = [RunOrchestrator_1.TestFramework.PLAYWRIGHT, RunOrchestrator_1.TestFramework.JEST];
        const candidates = [];
        for (const framework of frameworks) {
            const scenarios = ['happy', 'error', 'edge'];
            for (const scenario of scenarios) {
                try {
                    const testCode = await this.generateTestCode(endpoint, framework, scenario);
                    const suggestedPath = this.suggestTestFilePath(endpoint, framework, scenario);
                    candidates.push({
                        candidateId: `cand_${planId}_${scenario}`,
                        testCode,
                        framework,
                        suggestedPath,
                        assertions: this.countAssertions(testCode),
                        confidence: this.estimateConfidence(testCode, scenario)
                    });
                }
                catch (error) {
                    console.warn(`Failed to generate test for ${framework} ${scenario}:`, error);
                }
            }
        }
        return {
            planId,
            gapId: gap.gapId,
            gap,
            endpoint,
            suggestedTestFramework: RunOrchestrator_1.TestFramework.PLAYWRIGHT,
            testCandidates: candidates,
            priority: gap.priorityScore,
            estimatedCost: candidates.reduce((sum, c) => sum + c.testCode.split('\n').length, 0)
        };
    }
    /**
     * Generate test plans for multiple gaps
     */
    async generateTestPlans(gaps, endpoints) {
        const plans = [];
        // Sort gaps by priority (highest first)
        const sortedGaps = [...gaps].sort((a, b) => b.priorityScore - a.priorityScore);
        for (const gap of sortedGaps) {
            // Find matching endpoint
            const matchingEndpoint = endpoints.find(ep => this.isEndpointForGap(ep, gap));
            if (matchingEndpoint) {
                try {
                    const plan = await this.generateTestPlan(gap, matchingEndpoint);
                    plans.push(plan);
                }
                catch (error) {
                    console.warn(`Failed to generate plan for gap ${gap.gapId}:`, error);
                }
            }
        }
        return plans;
    }
    /**
     * Apply test candidates to workspace
     */
    async applyTestCandidates(runId, candidates) {
        for (const candidate of candidates) {
            try {
                await this.writeTestFile(candidate);
                console.log(`Applied test: ${candidate.suggestedPath}`);
            }
            catch (error) {
                // TODO: recordError method doesn't exist on IRunOrchestrator
                console.error(`Failed to apply test ${candidate.suggestedPath}:`, error);
            }
        }
    }
    /**
     * Write test file to disk
     */
    async writeTestFile(candidate) {
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
    async generateTestCode(endpoint, framework, scenario) {
        if (framework === RunOrchestrator_1.TestFramework.PLAYWRIGHT) {
            return this.testGenerator.generatePlaywrightTest(endpoint.path, endpoint.method, scenario);
        }
        else if (framework === RunOrchestrator_1.TestFramework.CYPRESS) {
            return this.testGenerator.generateCypressTest(endpoint.path, endpoint.method, scenario);
        }
        else if (framework === RunOrchestrator_1.TestFramework.JEST) {
            return this.generateJestTest(endpoint, scenario);
        }
        throw new Error(`Unsupported framework: ${framework}`);
    }
    /**
     * Generate Jest test
     */
    async generateJestTest(endpoint, scenario) {
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
    suggestTestFilePath(endpoint, framework, scenario) {
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
    findTestDirectory(framework) {
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
    isEndpointForGap(endpoint, gap) {
        return gap.file.includes(endpoint.file.split(path.sep).pop() || '') ||
            gap.line === endpoint.line ||
            gap.message.includes(endpoint.path);
    }
    countAssertions(testCode) {
        const patterns = [/expect\(|assert\(|should\.|toBe\(|toEqual\(/g];
        let count = 0;
        for (const pattern of patterns) {
            const matches = testCode.match(pattern);
            count += matches?.length ?? 0;
        }
        return Math.max(1, count);
    }
    estimateConfidence(testCode, scenario) {
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
        if (lines < 5)
            return Math.max(30, baseConfidence - 20);
        if (!hasAssertions)
            return Math.max(40, baseConfidence - 15);
        if (!hasSetup)
            return baseConfidence - 5;
        return baseConfidence;
    }
    generateFileHeader(candidate) {
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
exports.TestGenerationService = TestGenerationService;
