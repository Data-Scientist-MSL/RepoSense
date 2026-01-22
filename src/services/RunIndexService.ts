/**
 * RunIndexService.ts
 * 
 * Manages the global run index (.reposense/index.json) and provides
 * discovery methods for ChatBot, WebView, and CI/CD workflows.
 * 
 * Responsibilities:
 * - Initialize workspace structure
 * - Create and update run entries
 * - Query run history
 * - Calculate aggregate statistics
 * - Resolve latest run symlink
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  RepoSenseIndex,
  RunIndexEntry,
  RunMetadata,
  RepoSenseWorkspace,
} from '../models/StorageModels';

export class RunIndexService {
  constructor(private workspaceRoot: string) {}

  /**
   * Initialize .reposense/ workspace structure
   */
  async initializeWorkspace(): Promise<RepoSenseWorkspace> {
    const reposenseDir = path.join(this.workspaceRoot, '.reposense');
    const configDir = path.join(reposenseDir, 'config');
    const cacheDir = path.join(reposenseDir, 'cache');
    const runsDir = path.join(reposenseDir, 'runs');

    // Create directories
    for (const dir of [reposenseDir, configDir, cacheDir, runsDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Create index if doesn't exist
    const indexFile = path.join(reposenseDir, 'index.json');
    if (!fs.existsSync(indexFile)) {
      const blankIndex: RepoSenseIndex = {
        version: '1.0.0',
        workspace: {
          path: this.workspaceRoot,
          repositoryName: path.basename(this.workspaceRoot),
          createdAt: new Date().toISOString(),
        },
        runs: [],
        latestRunId: '',
        stats: {
          totalRuns: 0,
          successfulRuns: 0,
          failedRuns: 0,
          lastRunAt: '',
        },
      };
      fs.writeFileSync(indexFile, JSON.stringify(blankIndex, null, 2));
    }

    return {
      rootDir: this.workspaceRoot,
      reposenseDir,
      configFile: path.join(configDir, 'reposense.config.json'),
      cacheDir,
      runsDir,
      latestRunDir: path.join(reposenseDir, 'latest'),
      indexFile,
    };
  }

  /**
   * Create new run directory with timestamped ID
   * Format: run-2026-01-20T22-14-31Z
   */
  async createRun(metadata: RunMetadata): Promise<string> {
    const reposenseDir = path.join(this.workspaceRoot, '.reposense');
    const runsDir = path.join(reposenseDir, 'runs');
    const runDir = path.join(runsDir, metadata.runId);

    // Create run subdirectories
    const subdirs = [
      runDir,
      path.join(runDir, 'report'),
      path.join(runDir, 'diagrams'),
      path.join(runDir, 'diagrams', 'exports'),
      path.join(runDir, 'evidence'),
      path.join(runDir, 'evidence', 'screenshots'),
      path.join(runDir, 'evidence', 'videos'),
      path.join(runDir, 'evidence', 'network-traces'),
      path.join(runDir, 'evidence', 'console-logs'),
      path.join(runDir, 'tests'),
      path.join(runDir, 'tests', 'playwright'),
      path.join(runDir, 'tests', 'cypress'),
      path.join(runDir, 'tests', 'jest'),
      path.join(runDir, 'diffs'),
      path.join(runDir, 'execution'),
    ];

    for (const dir of subdirs) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save metadata
    fs.writeFileSync(
      path.join(runDir, 'run-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    return runDir;
  }

  /**
   * Register run in global index
   */
  async registerRun(entry: RunIndexEntry): Promise<void> {
    const indexPath = path.join(
      this.workspaceRoot,
      '.reposense',
      'index.json'
    );
    const index = this.loadIndex() as RepoSenseIndex;

    // Add or update entry
    const existing = index.runs.findIndex((r) => r.runId === entry.runId);
    if (existing >= 0) {
      index.runs[existing] = entry;
    } else {
      index.runs.push(entry);
    }

    // Update stats
    index.stats.totalRuns = index.runs.length;
    index.stats.successfulRuns = index.runs.filter(
      (r) => r.status === 'SUCCESS'
    ).length;
    index.stats.failedRuns = index.runs.filter(
      (r) => r.status === 'FAILED'
    ).length;
    index.stats.lastRunAt = entry.timestamp;
    index.latestRunId = entry.runId;

    // Sort by timestamp descending (newest first)
    index.runs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    // Update latest symlink
    await this.updateLatestSymlink(entry.runId);
  }

  /**
   * Update latest symlink to point to newest successful run
   */
  private async updateLatestSymlink(runId: string): Promise<void> {
    const reposenseDir = path.join(this.workspaceRoot, '.reposense');
    const symlinkPath = path.join(reposenseDir, 'latest');
    const targetPath = path.join(reposenseDir, 'runs', runId);

    // Remove old symlink if exists
    try {
      if (fs.existsSync(symlinkPath) || fs.lstatSync(symlinkPath)) {
        fs.unlinkSync(symlinkPath);
      }
    } catch {
      // Symlink doesn't exist, continue
    }

    // Create new symlink
    // On Windows, use directory junctions instead of symlinks
    try {
      fs.symlinkSync(
        targetPath,
        symlinkPath,
        process.platform === 'win32' ? 'junction' : 'dir'
      );
    } catch (err) {
      // If symlink creation fails, that's OK—latest will be found by date
      console.warn(`Failed to create latest symlink: ${err}`);
    }
  }

  /**
   * Get all runs, sorted by timestamp (newest first)
   */
  async listRuns(): Promise<RunIndexEntry[]> {
    const index = this.loadIndex() as RepoSenseIndex;
    return index.runs;
  }

  /**
   * Get latest run
   */
  async getLatestRun(): Promise<RunIndexEntry | null> {
    const runs = await this.listRuns();
    return runs.length > 0 ? runs[0] : null;
  }

  /**
   * Get run by ID
   */
  async getRun(runId: string): Promise<RunIndexEntry | null> {
    const index = this.loadIndex() as RepoSenseIndex;
    return index.runs.find((r) => r.runId === runId) || null;
  }

  /**
   * Get runs with specific status
   */
  async getRunsByStatus(
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL'
  ): Promise<RunIndexEntry[]> {
    const index = this.loadIndex() as RepoSenseIndex;
    return index.runs.filter((r) => r.status === status);
  }

  /**
   * Get last N runs
   */
  async getRecentRuns(count: number = 5): Promise<RunIndexEntry[]> {
    const runs = await this.listRuns();
    return runs.slice(0, count);
  }

  /**
   * Get run directory path
   */
  getRunDirectory(runId: string): string {
    return path.join(this.workspaceRoot, '.reposense', 'runs', runId);
  }

  /**
   * Get latest run directory
   */
  getLatestRunDirectory(): string | null {
    const reposenseDir = path.join(this.workspaceRoot, '.reposense');
    const symlinkPath = path.join(reposenseDir, 'latest');

    try {
      // Try to resolve symlink
      if (fs.existsSync(symlinkPath)) {
        return fs.realpathSync(symlinkPath);
      }
    } catch {
      // Symlink doesn't exist
    }

    // Fallback: find by latest timestamp
    const runs = (this.loadIndex() as RepoSenseIndex).runs;
    if (runs.length === 0) return null;

    const latest = runs[0];
    return this.getRunDirectory(latest.runId);
  }

  /**
   * Get artifact path for run
   * 
   * Usage:
   *   getArtifactPath(runId, 'report') → .reposense/runs/<runId>/report/
   *   getArtifactPath(runId, 'diagrams') → .reposense/runs/<runId>/diagrams/
   */
  getArtifactPath(
    runId: string,
    artifactType:
      | 'report'
      | 'diagrams'
      | 'evidence'
      | 'tests'
      | 'diffs'
      | 'execution'
  ): string {
    return path.join(
      this.getRunDirectory(runId),
      artifactType === 'diagrams' ? 'diagrams' : artifactType
    );
  }

  /**
   * Get specific file path within artifact
   * 
   * Usage:
   *   getFilePath(runId, 'report', 'report.json')
   *   getFilePath(runId, 'diagrams', 'system-context.mmd')
   */
  getFilePath(
    runId: string,
    artifactType: string,
    filename: string
  ): string {
    return path.join(this.getArtifactPath(runId, artifactType as any), filename);
  }

  /**
   * Check if artifact exists
   */
  hasArtifact(runId: string, artifactType: string, filename?: string): boolean {
    const filePath = filename
      ? this.getFilePath(runId, artifactType, filename)
      : this.getArtifactPath(runId, artifactType as any);

    return fs.existsSync(filePath);
  }

  /**
   * Load raw JSON from file
   */
  loadArtifactJson(runId: string, artifactType: string, filename: string): any {
    const filePath = this.getFilePath(runId, artifactType, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Artifact not found: ${artifactType}/${filename} in run ${runId}`
      );
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Get statistics across all runs
   */
  getStatistics(): {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    averageCoverage: number;
    totalEndpoints: number;
    totalGaps: number;
  } {
    const index = this.loadIndex() as RepoSenseIndex;
    const stats = index.stats;

    const avgCoverage =
      index.runs.length > 0
        ? index.runs.reduce((sum, r) => sum + r.summary.coverage, 0) /
          index.runs.length
        : 0;

    const totalEndpoints = index.runs.reduce(
      (sum, r) => sum + r.summary.totalEndpoints,
      0
    );
    const totalGaps = index.runs.reduce((sum, r) => sum + r.summary.gaps, 0);

    return {
      totalRuns: stats.totalRuns,
      successfulRuns: stats.successfulRuns,
      failedRuns: stats.failedRuns,
      averageCoverage: Math.round(avgCoverage * 100) / 100,
      totalEndpoints,
      totalGaps,
    };
  }

  /**
   * Generate run summary for ChatBot
   */
  async generateRunSummary(
    runId: string
  ): Promise<{
    runId: string;
    timestamp: string;
    status: string;
    coverage: number;
    gaps: number;
    endpointsAnalyzed: number;
    key: string; // For ChatBot display
  } | null> {
    const run = await this.getRun(runId);
    if (!run) return null;

    return {
      runId: run.runId,
      timestamp: run.timestamp,
      status: run.status,
      coverage: run.summary.coverage,
      gaps: run.summary.gaps,
      endpointsAnalyzed: run.summary.totalEndpoints,
      key: `${run.runId} (${Math.round(run.summary.coverage * 100)}% coverage, ${run.summary.gaps} gaps)`,
    };
  }

  /**
   * Internal: Load index.json from disk
   */
  private loadIndex(): any {
    const indexPath = path.join(
      this.workspaceRoot,
      '.reposense',
      'index.json'
    );

    if (!fs.existsSync(indexPath)) {
      throw new Error(`.reposense/index.json not found at ${indexPath}`);
    }

    const content = fs.readFileSync(indexPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Export run for CI/CD or archival
   * 
   * Creates a portable ZIP containing:
   * - report.json
   * - diagrams (Mermaid sources + SVG/PNG)
   * - evidence summary
   * - metadata
   */
  async exportRun(runId: string, outputPath: string): Promise<void> {
    // Note: Full implementation would use archiver or similar
    // Skeleton provided for integration
    const runDir = this.getRunDirectory(runId);

    if (!fs.existsSync(runDir)) {
      throw new Error(`Run directory not found: ${runDir}`);
    }

    // TODO: Implement zip creation
    console.log(`Would export run ${runId} to ${outputPath}`);
  }
}

export default RunIndexService;
