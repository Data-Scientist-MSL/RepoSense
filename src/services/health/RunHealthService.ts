/**
 * RunHealthService.ts (Sprint 12 - Health & Recovery)
 * 
 * Comprehensive health checks and integrity validation.
 * Detects corruption, permission issues, and lock reconciliation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SafeArtifactIO } from './SafeArtifactIO';
import { RepoSenseError, ErrorCodes } from './RepoSenseError';
import { ErrorFactory } from './ErrorFactory';

export interface HealthCheckResult {
  status: 'PASS' | 'WARN' | 'FAIL';
  timestamp: string;
  checks: HealthCheck[];
  summary: string;
  remediation: string[];
}

export interface HealthCheck {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
}

export class RunHealthService {
  private artifactRoot: string;

  constructor(workspaceRoot: string, artifactRoot: string = '.reposense') {
    this.artifactRoot = path.join(workspaceRoot, artifactRoot);
  }

  /**
   * Run comprehensive health check.
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheck[] = [];

    // Check 1: Folder exists and is writable
    checks.push(await this.checkFolderWritability());

    // Check 2: Locked runs (crash recovery)
    checks.push(await this.checkLockedRuns());

    // Check 3: Artifact integrity
    checks.push(await this.checkArtifactIntegrity());

    // Check 4: Latest pointer
    checks.push(await this.checkLatestPointer());

    // Check 5: JSON validity
    checks.push(await this.checkJsonValidity());

    // Determine overall status
    const hasFailures = checks.some((c) => c.status === 'FAIL');
    const hasWarnings = checks.some((c) => c.status === 'WARN');
    const status = hasFailures ? 'FAIL' : hasWarnings ? 'WARN' : 'PASS';

    // Collect remediation steps
    const remediation = checks
      .filter((c) => c.status !== 'PASS')
      .flatMap((c) => {
        if (c.message.includes('locked')) {
          return [
            'Run "RepoSense: Recover Locked Runs" to clean up crashed runs',
            'Or manually delete .reposense/runs/<runId>/run.lock files',
          ];
        }
        if (c.message.includes('permission')) {
          return [
            'Ensure .reposense folder has read/write permissions',
            'Check directory ownership and permissions with ls -la .reposense',
          ];
        }
        if (c.message.includes('corrupted')) {
          return [
            'Delete corrupted run: rm -rf .reposense/runs/<runId>',
            'Run analysis again to regenerate',
          ];
        }
        return [];
      });

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
      summary: this.summarizeHealth(checks),
      remediation: [...new Set(remediation)], // Remove duplicates
    };
  }

  private async checkFolderWritability(): Promise<HealthCheck> {
    try {
      if (!fs.existsSync(this.artifactRoot)) {
        fs.mkdirSync(this.artifactRoot, { recursive: true });
      }

      fs.accessSync(this.artifactRoot, fs.constants.W_OK);

      return {
        name: 'Folder Writability',
        status: 'PASS',
        message: '.reposense folder is writable',
        severity: 'INFO',
      };
    } catch (error) {
      return {
        name: 'Folder Writability',
        status: 'FAIL',
        message: `.reposense folder is not writable: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'CRITICAL',
      };
    }
  }

  private async checkLockedRuns(): Promise<HealthCheck> {
    try {
      const lockedRuns = SafeArtifactIO.getLockedRuns(this.artifactRoot);

      if (lockedRuns.length === 0) {
        return {
          name: 'Locked Runs',
          status: 'PASS',
          message: 'No crashed runs detected',
          severity: 'INFO',
        };
      }

      return {
        name: 'Locked Runs',
        status: 'WARN',
        message: `Found ${lockedRuns.length} locked run(s): ${lockedRuns.join(', ')}. These may be from crashed runs.`,
        severity: 'WARN',
      };
    } catch (error) {
      return {
        name: 'Locked Runs',
        status: 'FAIL',
        message: `Cannot check for locked runs: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'ERROR',
      };
    }
  }

  private async checkArtifactIntegrity(): Promise<HealthCheck> {
    try {
      const runsDir = path.join(this.artifactRoot, 'runs');

      if (!fs.existsSync(runsDir)) {
        return {
          name: 'Artifact Integrity',
          status: 'PASS',
          message: 'No artifacts yet',
          severity: 'INFO',
        };
      }

      const runs = fs.readdirSync(runsDir);
      let corruptedCount = 0;

      for (const runId of runs) {
        const requiredFiles = ['scan.json', 'graph.json', 'report.json'];
        for (const file of requiredFiles) {
          const filePath = path.join(runsDir, runId, file);
          if (!fs.existsSync(filePath)) {
            corruptedCount++;
          }
        }
      }

      if (corruptedCount === 0) {
        return {
          name: 'Artifact Integrity',
          status: 'PASS',
          message: `All ${runs.length} runs have required artifacts`,
          severity: 'INFO',
        };
      }

      return {
        name: 'Artifact Integrity',
        status: 'WARN',
        message: `${corruptedCount} missing artifacts detected. Some runs may be incomplete.`,
        severity: 'WARN',
      };
    } catch (error) {
      return {
        name: 'Artifact Integrity',
        status: 'FAIL',
        message: `Cannot check integrity: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'ERROR',
      };
    }
  }

  private async checkLatestPointer(): Promise<HealthCheck> {
    try {
      const latestPath = path.join(this.artifactRoot, 'latest.json');

      if (!fs.existsSync(latestPath)) {
        return {
          name: 'Latest Pointer',
          status: 'WARN',
          message: 'No latest.json pointer (no runs completed yet)',
          severity: 'WARN',
        };
      }

      const latest = SafeArtifactIO.readJsonSafe(latestPath) as { runId: string };
      const runDir = path.join(this.artifactRoot, 'runs', latest.runId);

      if (!fs.existsSync(runDir)) {
        return {
          name: 'Latest Pointer',
          status: 'FAIL',
          message: `Latest pointer references non-existent run: ${latest.runId}`,
          severity: 'CRITICAL',
        };
      }

      return {
        name: 'Latest Pointer',
        status: 'PASS',
        message: `Latest pointer is valid: ${latest.runId}`,
        severity: 'INFO',
      };
    } catch (error) {
      return {
        name: 'Latest Pointer',
        status: 'FAIL',
        message: `Cannot read latest.json: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'ERROR',
      };
    }
  }

  private async checkJsonValidity(): Promise<HealthCheck> {
    try {
      const runsDir = path.join(this.artifactRoot, 'runs');

      if (!fs.existsSync(runsDir)) {
        return {
          name: 'JSON Validity',
          status: 'PASS',
          message: 'No JSON files to validate',
          severity: 'INFO',
        };
      }

      let invalidCount = 0;
      const runs = fs.readdirSync(runsDir);

      for (const runId of runs) {
        const scanPath = path.join(runsDir, runId, 'scan.json');
        if (fs.existsSync(scanPath)) {
          try {
            SafeArtifactIO.readJsonSafe(scanPath);
          } catch {
            invalidCount++;
          }
        }
      }

      if (invalidCount === 0) {
        return {
          name: 'JSON Validity',
          status: 'PASS',
          message: 'All JSON files are valid',
          severity: 'INFO',
        };
      }

      return {
        name: 'JSON Validity',
        status: 'FAIL',
        message: `${invalidCount} JSON files are corrupted or invalid`,
        severity: 'CRITICAL',
      };
    } catch (error) {
      return {
        name: 'JSON Validity',
        status: 'FAIL',
        message: `Cannot validate JSON: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'ERROR',
      };
    }
  }

  private summarizeHealth(checks: HealthCheck[]): string {
    const failures = checks.filter((c) => c.status === 'FAIL');
    const warnings = checks.filter((c) => c.status === 'WARN');
    const passes = checks.filter((c) => c.status === 'PASS');

    return `${passes.length} checks passed, ${warnings.length} warnings, ${failures.length} failures`;
  }

  /**
   * Attempt to recover from locked runs.
   */
  async recoverLockedRuns(): Promise<{ recovered: number; failed: number }> {
    const lockedRuns = SafeArtifactIO.getLockedRuns(this.artifactRoot);
    let recovered = 0;
    let failed = 0;

    for (const run of lockedRuns) {
      try {
        SafeArtifactIO.removeLockFile(run.lockFile);
        recovered++;
      } catch {
        failed++;
      }
    }

    return { recovered, failed };
  }
}
