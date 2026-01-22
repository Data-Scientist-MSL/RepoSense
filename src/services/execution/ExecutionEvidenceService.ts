import * as path from 'path';
import { SafeArtifactIO } from '../security/SafeArtifactIO';
import { EvidenceIndexService } from '../evidence/EvidenceIndexService';

/**
 * ExecutionEvidenceService.ts (Sprint 14 - Evidence Capture)
 *
 * Captures and manages execution evidence:
 * - Logs (stdout + stderr)
 * - Coverage reports
 * - Execution metadata
 * - Evidence indexing
 *
 * CRITICAL: Evidence is complete, auditable, and traceable.
 */

export interface ExecutionEvidence {
  testId: string;
  runId: string;
  executedAt: string;
  durationMs: number;
  status: 'PASSED' | 'FAILED' | 'TIMEOUT' | 'ERROR';
  engine: string;
  exitCode?: number;
  artifacts: {
    stdout?: { path: string; size: number };
    stderr?: { path: string; size: number };
    coverage?: { path: string; size: number };
    metadata: { path: string; size: number };
  };
}

export class ExecutionEvidenceService {
  private artifactIo: SafeArtifactIO;
  private evidenceIndex: EvidenceIndexService;

  /**
   * Initializes ExecutionEvidenceService.
   */
  constructor(
    artifactIo: SafeArtifactIO,
    evidenceIndex: EvidenceIndexService
  ) {
    this.artifactIo = artifactIo;
    this.evidenceIndex = evidenceIndex;
  }

  /**
   * Registers execution evidence.
   */
  async registerExecution(
    runId: string,
    testId: string,
    executedAt: string,
    durationMs: number,
    status: string,
    engine: string,
    exitCode?: number
  ): Promise<ExecutionEvidence> {
    try {
      const executionDir = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'evidence',
        `execution-${testId}`
      );

      // Collect artifact paths
      const artifacts: ExecutionEvidence['artifacts'] = {
        metadata: { path: path.join(executionDir, 'execution-meta.json'), size: 0 }
      };

      // Check for optional artifacts
      const stdoutPath = path.join(executionDir, 'stdout.log');
      if (this.fileExists(stdoutPath)) {
        artifacts.stdout = {
          path: stdoutPath,
          size: this.getFileSize(stdoutPath)
        };
      }

      const stderrPath = path.join(executionDir, 'stderr.log');
      if (this.fileExists(stderrPath)) {
        artifacts.stderr = {
          path: stderrPath,
          size: this.getFileSize(stderrPath)
        };
      }

      const coveragePath = path.join(executionDir, 'coverage.json');
      if (this.fileExists(coveragePath)) {
        artifacts.coverage = {
          path: coveragePath,
          size: this.getFileSize(coveragePath)
        };
      }

      const evidence: ExecutionEvidence = {
        testId,
        runId,
        executedAt,
        durationMs,
        status: status as any,
        engine,
        exitCode,
        artifacts
      };

      // Register in evidence index
      await this.evidenceIndex.recordEvidence(
        runId,
        testId,
        'EXECUTION',
        undefined,
        undefined,
        {
          executedAt,
          durationMs,
          status,
          engine,
          exitCode,
          artifacts: Object.keys(artifacts)
        }
      );

      return evidence;
    } catch (error) {
      console.warn(
        `[ExecutionEvidenceService] Failed to register execution for test ${testId}:`,
        error
      );

      return {
        testId,
        runId,
        executedAt,
        durationMs,
        status: 'ERROR',
        engine,
        exitCode,
        artifacts: {
          metadata: { path: '', size: 0 }
        }
      };
    }
  }

  /**
   * Retrieves execution evidence.
   */
  async getExecution(
    runId: string,
    testId: string
  ): Promise<ExecutionEvidence | null> {
    try {
      const executionDir = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'evidence',
        `execution-${testId}`
      );

      const metaPath = path.join(executionDir, 'execution-meta.json');
      const metadata = await this.artifactIo.readJsonSafe<any>(metaPath);

      if (!metadata) {
        return null;
      }

      const artifacts: ExecutionEvidence['artifacts'] = {
        metadata: { path: metaPath, size: this.getFileSize(metaPath) }
      };

      // Check for optional artifacts
      const stdoutPath = path.join(executionDir, 'stdout.log');
      if (this.fileExists(stdoutPath)) {
        artifacts.stdout = {
          path: stdoutPath,
          size: this.getFileSize(stdoutPath)
        };
      }

      const stderrPath = path.join(executionDir, 'stderr.log');
      if (this.fileExists(stderrPath)) {
        artifacts.stderr = {
          path: stderrPath,
          size: this.getFileSize(stderrPath)
        };
      }

      const coveragePath = path.join(executionDir, 'coverage.json');
      if (this.fileExists(coveragePath)) {
        artifacts.coverage = {
          path: coveragePath,
          size: this.getFileSize(coveragePath)
        };
      }

      return {
        testId: metadata.testId,
        runId: metadata.runId,
        executedAt: metadata.executedAt,
        durationMs: metadata.durationMs,
        status: metadata.status,
        engine: metadata.engine,
        exitCode: metadata.exitCode,
        artifacts
      };
    } catch (error) {
      console.warn(
        `[ExecutionEvidenceService] Failed to retrieve execution for test ${testId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Retrieves execution logs.
   */
  async getExecutionLogs(
    runId: string,
    testId: string
  ): Promise<{ stdout?: string; stderr?: string }> {
    try {
      const executionDir = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'evidence',
        `execution-${testId}`
      );

      const logs: { stdout?: string; stderr?: string } = {};

      const stdoutPath = path.join(executionDir, 'stdout.log');
      if (this.fileExists(stdoutPath)) {
        logs.stdout = await this.artifactIo.readTextFileSafe(stdoutPath) || undefined;
      }

      const stderrPath = path.join(executionDir, 'stderr.log');
      if (this.fileExists(stderrPath)) {
        logs.stderr = await this.artifactIo.readTextFileSafe(stderrPath) || undefined;
      }

      return logs;
    } catch (error) {
      console.warn(
        `[ExecutionEvidenceService] Failed to retrieve logs for test ${testId}:`,
        error
      );
      return {};
    }
  }

  /**
   * Retrieves execution coverage.
   */
  async getExecutionCoverage(
    runId: string,
    testId: string
  ): Promise<Record<string, any> | null> {
    try {
      const executionDir = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'evidence',
        `execution-${testId}`
      );

      const coveragePath = path.join(executionDir, 'coverage.json');
      return await this.artifactIo.readJsonSafe<Record<string, any>>(coveragePath);
    } catch (error) {
      console.warn(
        `[ExecutionEvidenceService] Failed to retrieve coverage for test ${testId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Lists all executions for a run.
   */
  async listExecutions(runId: string): Promise<ExecutionEvidence[]> {
    try {
      const evidenceDir = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'evidence'
      );

      const executionDirs = await this.artifactIo.listDirectorySafe(evidenceDir);
      const executions: ExecutionEvidence[] = [];

      for (const dir of executionDirs) {
        if (dir.startsWith('execution-')) {
          const testId = dir.replace('execution-', '');
          const execution = await this.getExecution(runId, testId);

          if (execution) {
            executions.push(execution);
          }
        }
      }

      return executions.sort((a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
      );
    } catch (error) {
      console.warn(
        `[ExecutionEvidenceService] Failed to list executions for run ${runId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Gets summary statistics for executions.
   */
  async getExecutionSummary(
    runId: string
  ): Promise<{
    totalExecutions: number;
    passed: number;
    failed: number;
    timeout: number;
    error: number;
    totalDurationMs: number;
  }> {
    try {
      const executions = await this.listExecutions(runId);

      const summary = {
        totalExecutions: executions.length,
        passed: 0,
        failed: 0,
        timeout: 0,
        error: 0,
        totalDurationMs: 0
      };

      for (const execution of executions) {
        if (execution.status === 'PASSED') {
          summary.passed++;
        } else if (execution.status === 'FAILED') {
          summary.failed++;
        } else if (execution.status === 'TIMEOUT') {
          summary.timeout++;
        } else if (execution.status === 'ERROR') {
          summary.error++;
        }

        summary.totalDurationMs += execution.durationMs;
      }

      return summary;
    } catch (error) {
      console.warn(
        `[ExecutionEvidenceService] Failed to get execution summary for run ${runId}:`,
        error
      );

      return {
        totalExecutions: 0,
        passed: 0,
        failed: 0,
        timeout: 0,
        error: 0,
        totalDurationMs: 0
      };
    }
  }

  // ============ PRIVATE HELPERS ============

  /**
   * Checks if file exists.
   */
  private fileExists(filePath: string): boolean {
    try {
      const fs = require('fs');
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Gets file size in bytes.
   */
  private getFileSize(filePath: string): number {
    try {
      const fs = require('fs');
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }
}
