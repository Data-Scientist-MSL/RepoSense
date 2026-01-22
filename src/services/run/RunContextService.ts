/**
 * RunContextService.ts (Sprint 11 - Day 1)
 * 
 * Single source of truth for "which run are we looking at?"
 * Tracks active run from workspace state, falls back to latest successful run.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface RunContext {
  activeRunId: string | null;
  latestSuccessfulRunId: string | null;
  workspaceFolder: string;
}

export interface RunMetadata {
  runId: string;
  startTime: string;
  endTime?: string;
  status: 'RUNNING' | 'COMPLETE' | 'FAILED';
  error?: {
    message: string;
    stack: string;
  };
  artifacts: {
    scan: string;
    graph: string;
    report: string;
    diagrams: string;
  };
}

export class RunContextService {
  private context: vscode.ExtensionContext;
  private workspace: vscode.WorkspaceFolder;
  private runMetadata: Map<string, RunMetadata> = new Map();
  private onActiveRunChangedEmitter = new vscode.EventEmitter<{ runId: string }>();

  onActiveRunChanged = this.onActiveRunChangedEmitter.event;

  constructor(context: vscode.ExtensionContext, workspace: vscode.WorkspaceFolder) {
    this.context = context;
    this.workspace = workspace;
  }

  /**
   * Get the currently active run ID.
   * Priority: explicit selection > latest successful run > null
   */
  async getActiveRunId(): Promise<string | null> {
    // Check workspace state for explicit selection
    const stored = this.context.workspaceState.get<string>('activeRunId');
    if (stored) {
      return stored;
    }

    // Fall back to latest successful run
    return await this.getLatestSuccessfulRunId();
  }

  /**
   * Set the active run ID.
   * Triggers refresh of all artifacts.
   */
  async setActiveRunId(runId: string): Promise<void> {
    await this.context.workspaceState.update('activeRunId', runId);

    // Fire event: active run changed
    this.onActiveRunChangedEmitter.fire({ runId });
  }

  /**
   * Find the most recent run with status=COMPLETE.
   */
  async getLatestSuccessfulRunId(): Promise<string | null> {
    const runsDir = path.join(this.workspace.uri.fsPath, '.reposense', 'runs');

    if (!fs.existsSync(runsDir)) {
      return null;
    }

    try {
      const runs = fs
        .readdirSync(runsDir)
        .filter(f => fs.statSync(path.join(runsDir, f)).isDirectory())
        .map(runId => ({ runId, time: this.parseRunTime(runId) }))
        .sort((a, b) => (b.time?.getTime() ?? 0) - (a.time?.getTime() ?? 0));

      for (const { runId } of runs) {
        try {
          const meta = await this.loadMeta(runId);
          if (meta.status === 'COMPLETE') {
            return runId;
          }
        } catch {
          // Skip invalid runs
        }
      }
    } catch (error) {
      console.error(`Error finding latest successful run: ${error}`);
    }

    return null;
  }

  /**
   * Load meta.json for a run.
   * Caches result for performance.
   */
  async loadMeta(runId: string): Promise<RunMetadata> {
    if (this.runMetadata.has(runId)) {
      return this.runMetadata.get(runId)!;
    }

    const metaPath = path.join(
      this.workspace.uri.fsPath,
      '.reposense',
      'runs',
      runId,
      'meta.json'
    );

    if (!fs.existsSync(metaPath)) {
      throw new Error(`meta.json not found for run ${runId}`);
    }

    try {
      const content = fs.readFileSync(metaPath, 'utf-8');
      const meta: RunMetadata = JSON.parse(content);

      this.runMetadata.set(runId, meta);
      return meta;
    } catch (error) {
      throw new Error(`Failed to load metadata for run ${runId}: ${error}`);
    }
  }

  /**
   * Get context for current active run.
   */
  async getCurrentContext(): Promise<RunContext> {
    return {
      activeRunId: await this.getActiveRunId(),
      latestSuccessfulRunId: await this.getLatestSuccessfulRunId(),
      workspaceFolder: this.workspace.uri.fsPath,
    };
  }

  /**
   * Clear all metadata cache (for testing or refresh).
   */
  clearCache(): void {
    this.runMetadata.clear();
  }

  /**
   * List all runs.
   */
  async listAllRuns(): Promise<string[]> {
    const runsDir = path.join(this.workspace.uri.fsPath, '.reposense', 'runs');

    if (!fs.existsSync(runsDir)) {
      return [];
    }

    try {
      return fs
        .readdirSync(runsDir)
        .filter(f => fs.statSync(path.join(runsDir, f)).isDirectory())
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  private parseRunTime(runId: string): Date | null {
    // Parse runId format: "run-20260121-153022" or similar
    const match = runId.match(/run-(\d{8})-(\d{6})/);
    if (!match) return null;

    const [, dateStr, timeStr] = match;
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6));
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(timeStr.substring(0, 2));
    const min = parseInt(timeStr.substring(2, 4));
    const sec = parseInt(timeStr.substring(4, 6));

    return new Date(year, month - 1, day, hour, min, sec);
  }

  dispose(): void {
    this.onActiveRunChangedEmitter.dispose();
  }
}
