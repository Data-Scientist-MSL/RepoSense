/**
 * RunStorage.ts (Sprint 10 - Day 1)
 * 
 * Filesystem I/O layer for .reposense/runs/ with atomic writes
 * Windows-compatible (no symlinks, path.join, temp->rename pattern)
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const rename = promisify(fs.rename);

export interface RunMetadata {
  runId: string;
  status: 'RUNNING' | 'COMPLETE' | 'FAILED';
  startTime: string;
  endTime?: string;
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

export class RunStorage {
  private reposenseRoot: string;
  private runsDir: string;

  constructor(workspaceFolder: string) {
    this.reposenseRoot = path.join(workspaceFolder, '.reposense');
    this.runsDir = path.join(this.reposenseRoot, 'runs');
  }

  /**
   * Ensure .reposense/runs/ directory structure exists.
   */
  async ensureDirectories(): Promise<void> {
    try {
      if (!fs.existsSync(this.reposenseRoot)) {
        fs.mkdirSync(this.reposenseRoot, { recursive: true });
      }
      if (!fs.existsSync(this.runsDir)) {
        fs.mkdirSync(this.runsDir, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to create directories: ${error}`);
    }
  }

  /**
   * Create a new run folder: .reposense/runs/<runId>/
   */
  async createRunFolder(runId: string): Promise<string> {
    await this.ensureDirectories();
    const runPath = path.join(this.runsDir, runId);

    try {
      if (!fs.existsSync(runPath)) {
        fs.mkdirSync(runPath, { recursive: true });
      }
      // Create subdirectories for artifact organization
      fs.mkdirSync(path.join(runPath, 'report'), { recursive: true });
      fs.mkdirSync(path.join(runPath, 'diagrams'), { recursive: true });
      fs.mkdirSync(path.join(runPath, 'delta'), { recursive: true });
      fs.mkdirSync(path.join(runPath, 'evidence'), { recursive: true });
      return runPath;
    } catch (error) {
      throw new Error(`Failed to create run folder ${runId}: ${error}`);
    }
  }

  /**
   * Write JSON file with atomic write pattern (temp -> rename).
   * Windows-safe: uses temp file + rename for atomicity.
   */
  async writeJson(fileName: string, data: any, runId: string): Promise<void> {
    const runPath = path.join(this.runsDir, runId);
    const filePath = path.join(runPath, fileName);
    const tempPath = `${filePath}.tmp`;

    try {
      const jsonContent = JSON.stringify(data, null, 2);

      // Write to temp file
      fs.writeFileSync(tempPath, jsonContent, 'utf-8');

      // Delete existing file if present
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Atomic rename (works on Windows)
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if rename failed
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (e) {
          // Ignore cleanup error
        }
      }
      throw new Error(`Failed to write ${fileName} for run ${runId}: ${error}`);
    }
  }

  /**
   * Read JSON file from run.
   */
  async readJson<T>(fileName: string, runId: string): Promise<T> {
    const filePath = path.join(this.runsDir, runId, fileName);

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read ${fileName} for run ${runId}: ${error}`);
    }
  }

  /**
   * Update latest.json pointer to active run (Windows-safe, no symlinks).
   */
  async updateLatestPointer(runId: string): Promise<void> {
    const latestPath = path.join(this.reposenseRoot, 'latest.json');
    const latestData = {
      runId,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.writeJson('../latest.json', latestData, '.');
    } catch (error) {
      // Fallback: write directly
      const tempPath = `${latestPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(latestData, null, 2), 'utf-8');
      if (fs.existsSync(latestPath)) {
        fs.unlinkSync(latestPath);
      }
      fs.renameSync(tempPath, latestPath);
    }
  }

  /**
   * List all runs in .reposense/runs/
   */
  async listAllRuns(): Promise<string[]> {
    await this.ensureDirectories();

    try {
      const entries = fs.readdirSync(this.runsDir);
      return entries.filter(entry => {
        const fullPath = path.join(this.runsDir, entry);
        return fs.statSync(fullPath).isDirectory();
      });
    } catch (error) {
      throw new Error(`Failed to list runs: ${error}`);
    }
  }

  /**
   * Get path to a specific run.
   */
  getRunPath(runId: string): string {
    return path.join(this.runsDir, runId);
  }

  /**
   * Delete a run (cleanup).
   */
  async deleteRun(runId: string): Promise<void> {
    const runPath = path.join(this.runsDir, runId);

    try {
      if (fs.existsSync(runPath)) {
        fs.rmSync(runPath, { recursive: true, force: true });
      }
    } catch (error) {
      throw new Error(`Failed to delete run ${runId}: ${error}`);
    }
  }

  /**
   * Get the latest successful run ID from latest.json
   */
  async getLatestRunId(): Promise<string | null> {
    const latestPath = path.join(this.reposenseRoot, 'latest.json');

    try {
      if (fs.existsSync(latestPath)) {
        const content = fs.readFileSync(latestPath, 'utf-8');
        const latest = JSON.parse(content);
        return latest.runId || null;
      }
    } catch (error) {
      // Return null if latest.json doesn't exist or is invalid
      return null;
    }

    return null;
  }
}
