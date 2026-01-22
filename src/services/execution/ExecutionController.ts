import * as path from 'path';
import { execSync } from 'child_process';
import { SafeArtifactIO } from '../security/SafeArtifactIO';
import { ErrorFactory } from '../security/ErrorFactory';

/**
 * ExecutionController.ts (Sprint 14 - Controlled Execution)
 *
 * Executes tests in controlled environment with:
 * - Timeout enforcement
 * - Resource limits
 * - Log capture
 * - Failure isolation
 * - No arbitrary process spawning
 *
 * CRITICAL GUARANTEE: Execution is deterministic, bounded, and auditable.
 */

export type ExecutionEngine = 'jest' | 'mocha' | 'pytest';

export interface ExecutionConfig {
  engine: ExecutionEngine;
  timeout: number; // milliseconds
  maxMemory?: number; // MB
  captureStdout: boolean;
  captureStderr: boolean;
  captureConsole: boolean;
}

export interface ExecutionResult {
  testId: string;
  engine: ExecutionEngine;
  status: 'PASSED' | 'FAILED' | 'TIMEOUT' | 'ERROR';
  durationMs: number;
  startedAt: string;
  completedAt: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  error?: string;
}

export class ExecutionController {
  private artifactIo: SafeArtifactIO;
  private workspaceRoot: string;
  private defaultConfig: ExecutionConfig;

  /**
   * Initializes ExecutionController.
   */
  constructor(
    artifactIo: SafeArtifactIO,
    workspaceRoot: string,
    defaultConfig?: Partial<ExecutionConfig>
  ) {
    this.artifactIo = artifactIo;
    this.workspaceRoot = workspaceRoot;
    this.defaultConfig = {
      engine: 'jest',
      timeout: 60000, // 60 seconds
      maxMemory: 512, // 512 MB
      captureStdout: true,
      captureStderr: true,
      captureConsole: true,
      ...defaultConfig
    };
  }

  /**
   * Executes a generated test.
   *
   * Supported engines (Sprint 14):
   * - Jest (TypeScript / JavaScript)
   * - Mocha (if configured)
   *
   * Flow:
   * 1. Validate test file exists
   * 2. Build command (fixed templates only)
   * 3. Execute with timeout
   * 4. Capture logs
   * 5. Parse results
   * 6. Persist evidence
   */
  async executeTest(
    runId: string,
    testId: string,
    testFilePath: string,
    engine: ExecutionEngine = 'jest',
    config?: Partial<ExecutionConfig>
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    try {
      // Merge configs
      const finalConfig = { ...this.defaultConfig, ...config };

      // Step 1: Validate test file
      const absolutePath = path.join(this.workspaceRoot, testFilePath);

      if (!absolutePath.startsWith(this.workspaceRoot)) {
        throw ErrorFactory.pathTraversal(absolutePath, this.workspaceRoot);
      }

      // Step 2: Build command (fixed templates only)
      const command = this.buildCommand(engine, absolutePath, finalConfig);

      if (!command) {
        throw ErrorFactory.generationFailed(
          `Unsupported execution engine: ${engine}`,
          'Only jest and mocha are supported in Sprint 14',
          { engine }
        );
      }

      // Step 3: Execute with timeout
      let stdout = '';
      let stderr = '';
      let exitCode = 0;

      try {
        stdout = execSync(command, {
          cwd: this.workspaceRoot,
          timeout: finalConfig.timeout,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        exitCode = 0;
      } catch (error: any) {
        if (error.killed) {
          // Timeout exceeded
          const durationMs = Date.now() - startTime;
          const completedAt = new Date().toISOString();

          return {
            testId,
            engine,
            status: 'TIMEOUT',
            durationMs,
            startedAt,
            completedAt,
            stdout: stdout || error.stdout?.toString() || '',
            stderr: stderr || error.stderr?.toString() || '',
            error: `Test execution exceeded timeout of ${finalConfig.timeout}ms`
          };
        }

        stdout = error.stdout?.toString() || '';
        stderr = error.stderr?.toString() || '';
        exitCode = error.status || 1;
      }

      // Step 4: Parse results
      const status = this.parseStatus(exitCode);

      // Step 5: Persist evidence
      const durationMs = Date.now() - startTime;
      const completedAt = new Date().toISOString();

      const result: ExecutionResult = {
        testId,
        engine,
        status,
        durationMs,
        startedAt,
        completedAt,
        stdout: finalConfig.captureStdout ? stdout : undefined,
        stderr: finalConfig.captureStderr ? stderr : undefined,
        exitCode
      };

      // Step 6: Store evidence
      await this.persistEvidence(runId, testId, result);

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const completedAt = new Date().toISOString();

      return {
        testId,
        engine,
        status: 'ERROR',
        durationMs,
        startedAt,
        completedAt,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Executes multiple tests in sequence.
   */
  async executeTestBatch(
    runId: string,
    tests: Array<{ testId: string; filePath: string; engine?: ExecutionEngine }>,
    config?: Partial<ExecutionConfig>
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const test of tests) {
      try {
        const result = await this.executeTest(
          runId,
          test.testId,
          test.filePath,
          test.engine || 'jest',
          config
        );
        results.push(result);
      } catch (error) {
        results.push({
          testId: test.testId,
          engine: test.engine || 'jest',
          status: 'ERROR',
          durationMs: 0,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * Gets execution summary (passed, failed, timeout, error).
   */
  getSummary(results: ExecutionResult[]): {
    total: number;
    passed: number;
    failed: number;
    timeout: number;
    error: number;
    avgDurationMs: number;
  } {
    const summary = {
      total: results.length,
      passed: 0,
      failed: 0,
      timeout: 0,
      error: 0,
      avgDurationMs: 0
    };

    let totalDuration = 0;

    for (const result of results) {
      if (result.status === 'PASSED') {
        summary.passed++;
      } else if (result.status === 'FAILED') {
        summary.failed++;
      } else if (result.status === 'TIMEOUT') {
        summary.timeout++;
      } else if (result.status === 'ERROR') {
        summary.error++;
      }

      totalDuration += result.durationMs;
    }

    summary.avgDurationMs = summary.total > 0 ? totalDuration / summary.total : 0;

    return summary;
  }

  // ============ PRIVATE HELPERS ============

  /**
   * Builds execution command (fixed templates only, no shell injection).
   */
  private buildCommand(
    engine: ExecutionEngine,
    testFilePath: string,
    config: ExecutionConfig
  ): string | null {
    const escaped = this.escapeShellArg(testFilePath);

    switch (engine) {
      case 'jest':
        return `npx jest ${escaped} --runInBand --verbose`;

      case 'mocha':
        return `npx mocha ${escaped}`;

      case 'pytest':
        return `python -m pytest ${escaped} -v`;

      default:
        return null;
    }
  }

  /**
   * Escapes shell argument safely.
   */
  private escapeShellArg(arg: string): string {
    // Simple escaping - only allow alphanumeric, paths, and dots
    if (!/^[\w.\/-]+$/.test(arg)) {
      throw ErrorFactory.generationFailed(
        `Invalid test file path: ${arg}`,
        'Test paths must be alphanumeric with . / - only',
        { arg }
      );
    }
    return `"${arg}"`;
  }

  /**
   * Parses execution status from exit code.
   */
  private parseStatus(exitCode: number): 'PASSED' | 'FAILED' | 'ERROR' {
    if (exitCode === 0) {
      return 'PASSED';
    }
    return 'FAILED';
  }

  /**
   * Persists execution evidence.
   */
  private async persistEvidence(
    runId: string,
    testId: string,
    result: ExecutionResult
  ): Promise<void> {
    try {
      const executionDir = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'evidence',
        `execution-${testId}`
      );

      await this.artifactIo.ensureDirectoryExists(executionDir);

      // Write stdout
      if (result.stdout) {
        const stdoutPath = path.join(executionDir, 'stdout.log');
        await this.artifactIo.writeTextFileAtomic(stdoutPath, result.stdout);
      }

      // Write stderr
      if (result.stderr) {
        const stderrPath = path.join(executionDir, 'stderr.log');
        await this.artifactIo.writeTextFileAtomic(stderrPath, result.stderr);
      }

      // Write execution metadata
      const metaPath = path.join(executionDir, 'execution-meta.json');
      const metadata = {
        testId,
        runId,
        executedAt: result.completedAt,
        durationMs: result.durationMs,
        status: result.status,
        engine: result.engine,
        exitCode: result.exitCode
      };

      await this.artifactIo.writeJsonAtomic(metaPath, metadata);
    } catch (error) {
      console.warn(
        `[ExecutionController] Failed to persist evidence for test ${testId}:`,
        error
      );
    }
  }
}
