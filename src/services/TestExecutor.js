"use strict";
/**
 * TestExecutor.ts
 *
 * Orchestrates test execution across multiple frameworks.
 * Handles: Playwright, Cypress, Jest, Mocha, Vitest, Pytest
 * Captures: stdout, stderr, results, screenshots, videos, traces
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
exports.TestExecutor = void 0;
exports.getTestExecutor = getTestExecutor;
const child_process = __importStar(require("child_process"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const RunOrchestrator_1 = require("../models/RunOrchestrator");
const AgentOrchestrator_1 = require("./agents/AgentOrchestrator");
/**
 * Executes tests and captures results across frameworks
 */
class TestExecutor {
    constructor(orchestrator, agentOrchestrator, config) {
        this.orchestrator = orchestrator;
        this.agentOrchestrator = agentOrchestrator;
        this.config = config;
    }
    /**
     * Execute tests for a specific framework
     */
    async executeTests(runId, framework, testPattern) {
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        try {
            // Build command based on framework
            const { command, args } = this.buildCommand(framework, testPattern);
            // Execute command
            const { stdout, stderr, exitCode } = await this.executeCommand(command, args, this.config.timeout);
            const endTime = Date.now();
            const durationMs = endTime - startTime;
            // Parse results
            const results = this.parseResults(framework, stdout, stderr);
            const testRuns = this.parseTestRuns(framework, stdout);
            // Collect artifacts
            const artifacts = await this.collectArtifacts(runId, executionId, framework);
            const execution = {
                executionId,
                timestamp: startTime,
                framework,
                command,
                workingDirectory: this.config.workingDirectory,
                env: this.config.env || {},
                startTime,
                endTime,
                durationMs,
                exitCode,
                status: this.mapExitCodeToStatus(exitCode, durationMs),
                stdout,
                stderr,
                results,
                testRuns,
                artifacts
            };
            // Hook: Trigger autonomous agent if test failed
            if (execution.status === 'FAILED') {
                this.agentOrchestrator.createTask(AgentOrchestrator_1.AgentType.REMEDIATION, {
                    executionId,
                    stdout,
                    stderr,
                    framework
                });
            }
            return execution;
        }
        catch (error) {
            const endTime = Date.now();
            const durationMs = endTime - startTime;
            // TODO: recordError method doesn't exist on IRunOrchestrator
            // this.orchestrator.recordError(
            //     runId,
            //     `Test execution failed: ${error.message}`,
            //     'ERROR',
            //     { executionId, framework }
            // );
            return {
                executionId,
                timestamp: startTime,
                framework,
                command: '',
                workingDirectory: this.config.workingDirectory,
                env: this.config.env || {},
                startTime,
                endTime,
                durationMs,
                exitCode: -1,
                status: 'ERROR',
                stdout: '',
                stderr: error.message,
                results: {
                    totalTests: 0,
                    passed: 0,
                    failed: 0,
                    skipped: 0
                },
                testRuns: [],
                artifacts: []
            };
        }
    }
    /**
     * Execute tests in parallel across multiple frameworks
     */
    async executeTestsParallel(runId, frameworks) {
        const promises = frameworks.map(fw => this.executeTests(runId, fw));
        return Promise.all(promises);
    }
    // ========================================================================
    // Command Building
    // ========================================================================
    buildCommand(framework, testPattern) {
        switch (framework) {
            case RunOrchestrator_1.TestFramework.PLAYWRIGHT:
                return this.buildPlaywrightCommand(testPattern);
            case RunOrchestrator_1.TestFramework.CYPRESS:
                return this.buildCypressCommand(testPattern);
            case RunOrchestrator_1.TestFramework.JEST:
                return this.buildJestCommand(testPattern);
            case RunOrchestrator_1.TestFramework.MOCHA:
                return this.buildMochaCommand(testPattern);
            case RunOrchestrator_1.TestFramework.VITEST:
                return this.buildVitestCommand(testPattern);
            case RunOrchestrator_1.TestFramework.PYTEST:
                return this.buildPytestCommand(testPattern);
            default:
                throw new Error(`Unsupported framework: ${framework}`);
        }
    }
    buildPlaywrightCommand(testPattern) {
        const args = ['test'];
        if (testPattern)
            args.push(testPattern);
        args.push('--reporter=json', '--reporter=list');
        if (this.config.captureVideo)
            args.push('--record-video=on');
        if (this.config.captureScreenshots)
            args.push('--screenshot=on');
        args.push('--workers=1'); // Serial execution for deterministic results
        return { command: 'npx', args: ['playwright', ...args] };
    }
    buildCypressCommand(testPattern) {
        const args = ['run'];
        if (testPattern)
            args.push('--spec', testPattern);
        if (this.config.captureVideo)
            args.push('--record', 'true');
        args.push('--headless');
        return { command: 'npx', args: ['cypress', ...args] };
    }
    buildJestCommand(testPattern) {
        const args = ['--json', '--outputFile=test-results.json', '--coverage'];
        if (testPattern)
            args.push(testPattern);
        args.push('--reporters=default', '--reporters=jest-junit');
        return { command: 'npx', args: ['jest', ...args] };
    }
    buildMochaCommand(testPattern) {
        const args = ['--reporter=json', '--reporter=spec'];
        if (testPattern)
            args.push(testPattern);
        args.push('--timeout=10000');
        return { command: 'npx', args: ['mocha', ...args] };
    }
    buildVitestCommand(testPattern) {
        const args = ['run', '--reporter=json', '--reporter=verbose'];
        if (testPattern)
            args.push(testPattern);
        args.push('--coverage');
        return { command: 'npx', args: ['vitest', ...args] };
    }
    buildPytestCommand(testPattern) {
        const args = ['--json-report', '--json-report-file=report.json'];
        if (testPattern)
            args.push(testPattern);
        args.push('-v', '--tb=short');
        return { command: 'pytest', args };
    }
    // ========================================================================
    // Command Execution
    // ========================================================================
    executeCommand(command, args, timeout) {
        return new Promise((resolve, reject) => {
            const proc = child_process.spawn(command, args, {
                cwd: this.config.workingDirectory,
                env: { ...process.env, ...this.config.env }
            });
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            const timer = setTimeout(() => {
                timedOut = true;
                proc.kill('SIGTERM');
            }, timeout);
            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            proc.on('close', (exitCode) => {
                clearTimeout(timer);
                if (timedOut) {
                    reject(new Error(`Test execution timeout after ${timeout}ms`));
                }
                else {
                    resolve({
                        stdout,
                        stderr,
                        exitCode: exitCode || 0
                    });
                }
            });
            proc.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }
    // ========================================================================
    // Result Parsing
    // ========================================================================
    parseResults(framework, stdout, stderr) {
        const combinedOutput = stdout + stderr;
        switch (framework) {
            case RunOrchestrator_1.TestFramework.PLAYWRIGHT:
                return this.parsePlaywrightResults(combinedOutput);
            case RunOrchestrator_1.TestFramework.CYPRESS:
                return this.parseCypressResults(combinedOutput);
            case RunOrchestrator_1.TestFramework.JEST:
                return this.parseJestResults(combinedOutput);
            case RunOrchestrator_1.TestFramework.MOCHA:
                return this.parseMochaResults(combinedOutput);
            case RunOrchestrator_1.TestFramework.VITEST:
                return this.parseVitestResults(combinedOutput);
            case RunOrchestrator_1.TestFramework.PYTEST:
                return this.parsePytestResults(combinedOutput);
            default:
                return { totalTests: 0, passed: 0, failed: 0, skipped: 0 };
        }
    }
    parsePlaywrightResults(output) {
        // Look for patterns like "passed 10 | failed 2 | skipped 1"
        const passedMatch = output.match(/passed\s+(\d+)/);
        const failedMatch = output.match(/failed\s+(\d+)/);
        const skippedMatch = output.match(/skipped\s+(\d+)/);
        const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
        const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
        const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
        return {
            totalTests: passed + failed + skipped,
            passed,
            failed,
            skipped
        };
    }
    parseCypressResults(output) {
        const passedMatch = output.match(/(\d+)\s+passing/);
        const failedMatch = output.match(/(\d+)\s+failing/);
        const skippedMatch = output.match(/(\d+)\s+pending/);
        const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
        const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
        const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
        return {
            totalTests: passed + failed + skipped,
            passed,
            failed,
            skipped
        };
    }
    parseJestResults(output) {
        const testMatch = output.match(/Tests:\s+(\d+)\s+passed.*?(\d+)\s+total/);
        const passedMatch = output.match(/✓\s+(\d+)\s+passed/);
        const failedMatch = output.match(/✕\s+(\d+)\s+failed/);
        return {
            totalTests: testMatch ? parseInt(testMatch[2], 10) : 0,
            passed: passedMatch ? parseInt(passedMatch[1], 10) : 0,
            failed: failedMatch ? parseInt(failedMatch[1], 10) : 0,
            skipped: 0
        };
    }
    parseMochaResults(output) {
        const passedMatch = output.match(/(\d+)\s+passing/);
        const failedMatch = output.match(/(\d+)\s+failing/);
        const skippedMatch = output.match(/(\d+)\s+pending/);
        const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
        const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
        const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
        return {
            totalTests: passed + failed + skipped,
            passed,
            failed,
            skipped
        };
    }
    parseVitestResults(output) {
        const passedMatch = output.match(/✓\s+(\d+)/);
        const failedMatch = output.match(/✗\s+(\d+)/);
        const skippedMatch = output.match(/⊙\s+(\d+)/);
        const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
        const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
        const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
        return {
            totalTests: passed + failed + skipped,
            passed,
            failed,
            skipped
        };
    }
    parsePytestResults(output) {
        const matchAll = output.match(/(\d+)\s+passed(?:,?\s+(\d+)\s+failed)?(?:,?\s+(\d+)\s+skipped)?/);
        const passed = matchAll ? parseInt(matchAll[1], 10) : 0;
        const failed = matchAll && matchAll[2] ? parseInt(matchAll[2], 10) : 0;
        const skipped = matchAll && matchAll[3] ? parseInt(matchAll[3], 10) : 0;
        return {
            totalTests: passed + failed + skipped,
            passed,
            failed,
            skipped
        };
    }
    parseTestRuns(framework, stdout) {
        // Parse individual test results
        // This is framework-specific; for now, return empty array
        // In production, parse JSON reports from each framework
        return [];
    }
    // ========================================================================
    // Artifact Collection
    // ========================================================================
    async collectArtifacts(runId, executionId, framework) {
        const artifacts = [];
        // Framework-specific artifact locations
        if (framework === RunOrchestrator_1.TestFramework.PLAYWRIGHT) {
            // Look for test-results, videos, traces
            const playwrightArtifacts = await this.findPlaywrightArtifacts(this.config.workingDirectory, executionId);
            artifacts.push(...playwrightArtifacts);
        }
        else if (framework === RunOrchestrator_1.TestFramework.JEST) {
            // Look for coverage, junit reports
            const jestArtifacts = await this.findJestArtifacts(this.config.workingDirectory, executionId);
            artifacts.push(...jestArtifacts);
        }
        return artifacts;
    }
    async findPlaywrightArtifacts(workDir, executionId) {
        const artifacts = [];
        const possiblePaths = [
            'test-results',
            'blob-report',
            '.playwright'
        ];
        for (const possiblePath of possiblePaths) {
            const fullPath = path.join(workDir, possiblePath);
            if (fs.existsSync(fullPath)) {
                const files = fs.readdirSync(fullPath);
                for (const file of files) {
                    artifacts.push({
                        type: file.endsWith('.json') ? 'report' : 'trace',
                        path: path.join(possiblePath, file),
                        mimeType: this.getMimeType(file),
                        sizeBytes: fs.statSync(path.join(fullPath, file)).size,
                        timestamp: Date.now()
                    });
                }
            }
        }
        return artifacts;
    }
    async findJestArtifacts(workDir, executionId) {
        const artifacts = [];
        const possibleFiles = [
            'test-results.json',
            'coverage/coverage-final.json',
            'junit.xml'
        ];
        for (const possibleFile of possibleFiles) {
            const fullPath = path.join(workDir, possibleFile);
            if (fs.existsSync(fullPath)) {
                artifacts.push({
                    type: 'report',
                    path: possibleFile,
                    mimeType: this.getMimeType(possibleFile),
                    sizeBytes: fs.statSync(fullPath).size,
                    timestamp: Date.now()
                });
            }
        }
        return artifacts;
    }
    // ========================================================================
    // Helpers
    // ========================================================================
    mapExitCodeToStatus(exitCode, duration) {
        if (duration > this.config.timeout)
            return 'TIMEOUT';
        if (exitCode === 0)
            return 'PASSED';
        return 'FAILED';
    }
    getMimeType(fileName) {
        if (fileName.endsWith('.json'))
            return 'application/json';
        if (fileName.endsWith('.xml'))
            return 'application/xml';
        if (fileName.endsWith('.png'))
            return 'image/png';
        if (fileName.endsWith('.mp4') || fileName.endsWith('.webm'))
            return 'video/webm';
        return 'application/octet-stream';
    }
}
exports.TestExecutor = TestExecutor;
// Export singleton
let executorInstance = null;
function getTestExecutor(orchestrator, agentOrchestrator, config) {
    executorInstance = new TestExecutor(orchestrator, agentOrchestrator, config);
    return executorInstance;
}
