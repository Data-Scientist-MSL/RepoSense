/**
 * TestExecutor.ts
 * 
 * Orchestrates test execution across multiple frameworks.
 * Handles: Playwright, Cypress, Jest, Mocha, Vitest, Pytest
 * Captures: stdout, stderr, results, screenshots, videos, traces
 */

import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import {
    ExecutionResult,
    TestRunResult,
    ExecutionArtifact,
    TestFramework,
    RunOrchestrator
} from '../models/RunOrchestrator';

export interface ExecutorConfig {
    workingDirectory: string;
    timeout: number;
    env?: Record<string, string>;
    captureScreenshots?: boolean;
    captureVideo?: boolean;
    captureTrace?: boolean;
}

/**
 * Executes tests and captures results across frameworks
 */
export class TestExecutor {
    private orchestrator: RunOrchestrator;
    private config: ExecutorConfig;

    constructor(orchestrator: RunOrchestrator, config: ExecutorConfig) {
        this.orchestrator = orchestrator;
        this.config = config;
    }

    /**
     * Execute tests for a specific framework
     */
    async executeTests(
        runId: string,
        framework: TestFramework,
        testPattern?: string
    ): Promise<ExecutionResult> {
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();

        try {
            // Build command based on framework
            const { command, args } = this.buildCommand(framework, testPattern);

            // Execute command
            const { stdout, stderr, exitCode } = await this.executeCommand(
                command,
                args,
                this.config.timeout
            );

            const endTime = Date.now();
            const durationMs = endTime - startTime;

            // Parse results
            const results = this.parseResults(framework, stdout, stderr);
            const testRuns = this.parseTestRuns(framework, stdout);

            // Collect artifacts
            const artifacts = await this.collectArtifacts(
                runId,
                executionId,
                framework
            );

            const execution: ExecutionResult = {
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

            return execution;
        } catch (error: any) {
            const endTime = Date.now();
            const durationMs = endTime - startTime;

            this.orchestrator.recordError(
                runId,
                `Test execution failed: ${error.message}`,
                'ERROR',
                { executionId, framework }
            );

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
    async executeTestsParallel(
        runId: string,
        frameworks: TestFramework[]
    ): Promise<ExecutionResult[]> {
        const promises = frameworks.map(fw => this.executeTests(runId, fw));
        return Promise.all(promises);
    }

    // ========================================================================
    // Command Building
    // ========================================================================

    private buildCommand(
        framework: TestFramework,
        testPattern?: string
    ): { command: string; args: string[] } {
        switch (framework) {
            case TestFramework.PLAYWRIGHT:
                return this.buildPlaywrightCommand(testPattern);
            case TestFramework.CYPRESS:
                return this.buildCypressCommand(testPattern);
            case TestFramework.JEST:
                return this.buildJestCommand(testPattern);
            case TestFramework.MOCHA:
                return this.buildMochaCommand(testPattern);
            case TestFramework.VITEST:
                return this.buildVitestCommand(testPattern);
            case TestFramework.PYTEST:
                return this.buildPytestCommand(testPattern);
            default:
                throw new Error(`Unsupported framework: ${framework}`);
        }
    }

    private buildPlaywrightCommand(testPattern?: string): { command: string; args: string[] } {
        const args = ['test'];
        if (testPattern) args.push(testPattern);
        args.push('--reporter=json', '--reporter=list');
        if (this.config.captureVideo) args.push('--record-video=on');
        if (this.config.captureScreenshots) args.push('--screenshot=on');
        args.push('--workers=1');  // Serial execution for deterministic results
        return { command: 'npx', args: ['playwright', ...args] };
    }

    private buildCypressCommand(testPattern?: string): { command: string; args: string[] } {
        const args = ['run'];
        if (testPattern) args.push('--spec', testPattern);
        if (this.config.captureVideo) args.push('--record', 'true');
        args.push('--headless');
        return { command: 'npx', args: ['cypress', ...args] };
    }

    private buildJestCommand(testPattern?: string): { command: string; args: string[] } {
        const args = ['--json', '--outputFile=test-results.json', '--coverage'];
        if (testPattern) args.push(testPattern);
        args.push('--reporters=default', '--reporters=jest-junit');
        return { command: 'npx', args: ['jest', ...args] };
    }

    private buildMochaCommand(testPattern?: string): { command: string; args: string[] } {
        const args = ['--reporter=json', '--reporter=spec'];
        if (testPattern) args.push(testPattern);
        args.push('--timeout=10000');
        return { command: 'npx', args: ['mocha', ...args] };
    }

    private buildVitestCommand(testPattern?: string): { command: string; args: string[] } {
        const args = ['run', '--reporter=json', '--reporter=verbose'];
        if (testPattern) args.push(testPattern);
        args.push('--coverage');
        return { command: 'npx', args: ['vitest', ...args] };
    }

    private buildPytestCommand(testPattern?: string): { command: string; args: string[] } {
        const args = ['--json-report', '--json-report-file=report.json'];
        if (testPattern) args.push(testPattern);
        args.push('-v', '--tb=short');
        return { command: 'pytest', args };
    }

    // ========================================================================
    // Command Execution
    // ========================================================================

    private executeCommand(
        command: string,
        args: string[],
        timeout: number
    ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        return new Promise((resolve, reject) => {
            const process = child_process.spawn(command, args, {
                cwd: this.config.workingDirectory,
                env: { ...process.env, ...this.config.env }
            });

            let stdout = '';
            let stderr = '';
            let timedOut = false;

            const timer = setTimeout(() => {
                timedOut = true;
                process.kill('SIGTERM');
            }, timeout);

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (exitCode) => {
                clearTimeout(timer);

                if (timedOut) {
                    reject(new Error(`Test execution timeout after ${timeout}ms`));
                } else {
                    resolve({
                        stdout,
                        stderr,
                        exitCode: exitCode || 0
                    });
                }
            });

            process.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    // ========================================================================
    // Result Parsing
    // ========================================================================

    private parseResults(
        framework: TestFramework,
        stdout: string,
        stderr: string
    ): { totalTests: number; passed: number; failed: number; skipped: number } {
        const combinedOutput = stdout + stderr;

        switch (framework) {
            case TestFramework.PLAYWRIGHT:
                return this.parsePlaywrightResults(combinedOutput);
            case TestFramework.CYPRESS:
                return this.parseCypressResults(combinedOutput);
            case TestFramework.JEST:
                return this.parseJestResults(combinedOutput);
            case TestFramework.MOCHA:
                return this.parseMochaResults(combinedOutput);
            case TestFramework.VITEST:
                return this.parseVitestResults(combinedOutput);
            case TestFramework.PYTEST:
                return this.parsePytestResults(combinedOutput);
            default:
                return { totalTests: 0, passed: 0, failed: 0, skipped: 0 };
        }
    }

    private parsePlaywrightResults(output: string): any {
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

    private parseCypressResults(output: string): any {
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

    private parseJestResults(output: string): any {
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

    private parseMochaResults(output: string): any {
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

    private parseVitestResults(output: string): any {
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

    private parsePytestResults(output: string): any {
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

    private parseTestRuns(framework: TestFramework, stdout: string): TestRunResult[] {
        // Parse individual test results
        // This is framework-specific; for now, return empty array
        // In production, parse JSON reports from each framework
        return [];
    }

    // ========================================================================
    // Artifact Collection
    // ========================================================================

    private async collectArtifacts(
        runId: string,
        executionId: string,
        framework: TestFramework
    ): Promise<ExecutionArtifact[]> {
        const artifacts: ExecutionArtifact[] = [];

        // Framework-specific artifact locations
        if (framework === TestFramework.PLAYWRIGHT) {
            // Look for test-results, videos, traces
            const playwrightArtifacts = await this.findPlaywrightArtifacts(
                this.config.workingDirectory,
                executionId
            );
            artifacts.push(...playwrightArtifacts);
        } else if (framework === TestFramework.JEST) {
            // Look for coverage, junit reports
            const jestArtifacts = await this.findJestArtifacts(
                this.config.workingDirectory,
                executionId
            );
            artifacts.push(...jestArtifacts);
        }

        return artifacts;
    }

    private async findPlaywrightArtifacts(
        workDir: string,
        executionId: string
    ): Promise<ExecutionArtifact[]> {
        const artifacts: ExecutionArtifact[] = [];
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

    private async findJestArtifacts(
        workDir: string,
        executionId: string
    ): Promise<ExecutionArtifact[]> {
        const artifacts: ExecutionArtifact[] = [];
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

    private mapExitCodeToStatus(
        exitCode: number,
        duration: number
    ): 'PASSED' | 'FAILED' | 'TIMEOUT' | 'ERROR' {
        if (duration > this.config.timeout) return 'TIMEOUT';
        if (exitCode === 0) return 'PASSED';
        return 'FAILED';
    }

    private getMimeType(fileName: string): string {
        if (fileName.endsWith('.json')) return 'application/json';
        if (fileName.endsWith('.xml')) return 'application/xml';
        if (fileName.endsWith('.png')) return 'image/png';
        if (fileName.endsWith('.mp4') || fileName.endsWith('.webm')) return 'video/webm';
        return 'application/octet-stream';
    }
}

// Export singleton
let executorInstance: TestExecutor | null = null;

export function getTestExecutor(
    orchestrator: RunOrchestrator,
    config: ExecutorConfig
): TestExecutor {
    executorInstance = new TestExecutor(orchestrator, config);
    return executorInstance;
}
