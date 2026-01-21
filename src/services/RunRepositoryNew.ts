/**
 * RunRepository Service (Sprint 1)
 * Handles persistence of run metadata, scan results, and graph artifacts
 * to .reposense/runs/<runId>/ directory structure
 */

import * as fs from 'fs';
import * as path from 'path';
import { promises as fsAsync } from 'fs';
import { homedir } from 'os';

export enum RunState {
  CREATED = 'CREATED',
  SCANNING = 'SCANNING',
  ANALYZED = 'ANALYZED',
  GRAPH_BUILT = 'GRAPH_BUILT',
  REPORTS_GENERATED = 'REPORTS_GENERATED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface RunMeta {
  runId: string;
  state: RunState;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  version: string;
}

export interface ScanResult {
  endpoints: Array<{
    method: string;
    path: string;
    file: string;
    line: number;
    auth?: boolean;
  }>;
  calls: Array<{
    from: string;
    to: string;
    file: string;
    line: number;
  }>;
  gaps: Array<{
    endpoint: string;
    type: string;
    severity: string;
    reason: string;
  }>;
}

/**
 * Persistence layer for runs
 */
export class RunRepository {
  private baseDir: string;
  private reposenseDir: string;

  constructor(workspaceRoot?: string) {
    this.baseDir = workspaceRoot || process.cwd();
    this.reposenseDir = path.join(this.baseDir, '.reposense');
  }

  /**
   * Initialize repository structure
   */
  async initialize(): Promise<void> {
    await fsAsync.mkdir(this.reposenseDir, { recursive: true });
    await fsAsync.mkdir(path.join(this.reposenseDir, 'runs'), { recursive: true });
  }

  /**
   * Create a new run directory
   */
  async createRun(runId: string): Promise<string> {
    const runDir = path.join(this.reposenseDir, 'runs', runId);
    await fsAsync.mkdir(runDir, { recursive: true });
    return runDir;
  }

  /**
   * Save run metadata
   */
  async saveMeta(runId: string, meta: RunMeta): Promise<void> {
    const filePath = path.join(this.reposenseDir, 'runs', runId, 'run-metadata.json');
    await fsAsync.writeFile(filePath, JSON.stringify(meta, null, 2), 'utf-8');
  }

  /**
   * Load run metadata
   */
  async loadMeta(runId: string): Promise<RunMeta> {
    const filePath = path.join(this.reposenseDir, 'runs', runId, 'run-metadata.json');
    const content = await fsAsync.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Update run state in metadata
   */
  async updateMetaState(runId: string, newState: RunState): Promise<void> {
    const meta = await this.loadMeta(runId);
    meta.state = newState;

    if (newState === RunState.SCANNING && !meta.startedAt) {
      meta.startedAt = new Date().toISOString();
    }

    if ([RunState.COMPLETED, RunState.FAILED].includes(newState) && !meta.completedAt) {
      meta.completedAt = new Date().toISOString();
      if (meta.startedAt) {
        const start = new Date(meta.startedAt).getTime();
        const end = new Date(meta.completedAt).getTime();
        meta.duration = end - start;
      }
    }

    await this.saveMeta(runId, meta);
  }

  /**
   * Save scan results
   */
  async saveScan(runId: string, scanResult: ScanResult): Promise<void> {
    const filePath = path.join(this.reposenseDir, 'runs', runId, 'scan.json');
    await fsAsync.writeFile(filePath, JSON.stringify(scanResult, null, 2), 'utf-8');
  }

  /**
   * Load scan results
   */
  async loadScan(runId: string): Promise<ScanResult> {
    const filePath = path.join(this.reposenseDir, 'runs', runId, 'scan.json');
    const content = await fsAsync.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Save graph data
   */
  async saveGraph(runId: string, graphData: any): Promise<void> {
    const filePath = path.join(this.reposenseDir, 'runs', runId, 'graph.json');
    await fsAsync.writeFile(filePath, JSON.stringify(graphData, null, 2), 'utf-8');
  }

  /**
   * Load graph data
   */
  async loadGraph(runId: string): Promise<any> {
    const filePath = path.join(this.reposenseDir, 'runs', runId, 'graph.json');
    const content = await fsAsync.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Save report data
   */
  async saveReport(runId: string, reportData: any, format: string = 'json'): Promise<void> {
    const filePath = path.join(
      this.reposenseDir,
      'runs',
      runId,
      `report.${format}`,
    );
    if (format === 'json') {
      await fsAsync.writeFile(filePath, JSON.stringify(reportData, null, 2), 'utf-8');
    } else if (format === 'html') {
      await fsAsync.writeFile(filePath, reportData, 'utf-8');
    }
  }

  /**
   * Update latest run pointer
   */
  async updateLatestPointer(runId: string): Promise<void> {
    const latestFile = path.join(this.reposenseDir, 'latest.json');
    const latestData = {
      runId,
      path: path.join('runs', runId),
      timestamp: new Date().toISOString(),
    };
    await fsAsync.writeFile(latestFile, JSON.stringify(latestData, null, 2), 'utf-8');
  }

  /**
   * Get latest run ID
   */
  async getLatestRunId(): Promise<string | null> {
    try {
      const latestFile = path.join(this.reposenseDir, 'latest.json');
      const content = await fsAsync.readFile(latestFile, 'utf-8');
      const data = JSON.parse(content);
      return data.runId;
    } catch {
      return null;
    }
  }

  /**
   * List all runs
   */
  async listRuns(): Promise<string[]> {
    try {
      const runsDir = path.join(this.reposenseDir, 'runs');
      const entries = await fsAsync.readdir(runsDir);
      return entries.filter((e) => !e.startsWith('.'));
    } catch {
      return [];
    }
  }

  /**
   * Delete a run
   */
  async deleteRun(runId: string): Promise<void> {
    const runDir = path.join(this.reposenseDir, 'runs', runId);
    await fsAsync.rm(runDir, { recursive: true, force: true });
  }

  /**
   * Get run directory
   */
  getRunDirectory(runId: string): string {
    return path.join(this.reposenseDir, 'runs', runId);
  }

  /**
   * Check if run exists
   */
  async runExists(runId: string): Promise<boolean> {
    const runDir = this.getRunDirectory(runId);
    try {
      await fsAsync.access(runDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate deterministic run ID based on timestamp
   */
  generateRunId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    return `run-${year}${month}${day}T${hours}${minutes}${seconds}${ms}Z`;
  }
}

export default RunRepository;
