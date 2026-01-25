/**
 * SafeArtifactIO.ts (Sprint 12 - Security)
 * 
 * Atomic, secure artifact I/O with read validation and path containment.
 * All writes are tmp→rename. All reads are validated before parsing.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { RepoSenseError } from './RepoSenseError';
import { ErrorFactory } from './ErrorFactory';

export class SafeArtifactIO {
  private runRoot: string;
  private artifactRoot: string;

  constructor(workspaceRoot: string, artifactRoot: string = '.reposense') {
    this.artifactRoot = path.join(workspaceRoot, artifactRoot);
    this.runRoot = path.join(this.artifactRoot, 'runs');
  }

  /**
   * Write JSON atomically using temp→rename pattern.
   * Ensures no partial/corrupted writes.
   */
  async writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
    // Enforce path containment
    this.ensureContainedPath(this.artifactRoot, filePath);

    try {
      // Serialize to JSON
      const jsonContent = JSON.stringify(data, null, 2);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write to temp file with random suffix
      const tmpPath = `${filePath}.tmp-${crypto.randomBytes(8).toString('hex')}`;

      try {
        fs.writeFileSync(tmpPath, jsonContent, 'utf-8');

        // Atomic rename (fails if destination exists on some systems)
        // So we use backup strategy: rename old to .bak, then move tmp to real
        if (fs.existsSync(filePath)) {
          const bakPath = `${filePath}.bak`;
          try {
            fs.renameSync(filePath, bakPath);
          } catch {
            // Backup failed, but continue (important to get new file in place)
          }
        }

        fs.renameSync(tmpPath, filePath);
      } catch (error) {
        // Clean up temp file if rename failed
        try {
          if (fs.existsSync(tmpPath)) {
            fs.unlinkSync(tmpPath);
          }
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    } catch (error) {
      throw ErrorFactory.ioWriteFailed(
        filePath,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Read JSON file safely with validation.
   */
  async readJsonSafe<T>(filePath: string): Promise<T> {
    // Enforce path containment
    this.ensureContainedPath(this.artifactRoot, filePath);

    try {
      // Check file exists
      if (!fs.existsSync(filePath)) {
        throw ErrorFactory.ioReadFailed(filePath, 'File does not exist');
      }

      // Check file size (prevent gigantic files)
      const stats = fs.statSync(filePath);
      if (stats.size > 100 * 1024 * 1024) {
        throw ErrorFactory.ioReadFailed(filePath, 'File is too large (>100MB)');
      }

      // Read file
      const content = fs.readFileSync(filePath, 'utf-8');

      // Validate as JSON
      let data: unknown;
      try {
        data = JSON.parse(content);
      } catch (parseError) {
        const details =
          parseError instanceof SyntaxError ? parseError.message : 'Invalid JSON';
        throw ErrorFactory.invalidJson(filePath, details);
      }

      return data as T;
    } catch (error) {
      if (error instanceof RepoSenseError) {
        throw error;
      }
      throw ErrorFactory.ioReadFailed(
        filePath,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Enforce path containment: target must be within root.
   * Prevents directory traversal attacks (../../../etc/passwd).
   */
  ensureContainedPath(root: string, target: string): void {
    // Normalize paths
    const normalizedRoot = path.resolve(root);
    const normalizedTarget = path.resolve(target);

    // Check containment
    if (!normalizedTarget.startsWith(normalizedRoot)) {
      throw ErrorFactory.pathTraversal(target, root);
    }
  }

  /**
   * Create a lockfile for crash recovery.
   * Presence indicates run is in progress or crashed.
   */
  async createLockFile(runId: string): Promise<string> {
    const lockPath = path.join(this.runRoot, runId, 'run.lock');

    try {
      const lockContent = JSON.stringify(
        {
          runId,
          lockedAt: new Date().toISOString(),
          pid: process.pid,
        },
        null,
        2
      );

      await this.writeJsonAtomic(lockPath, JSON.parse(lockContent));
      return lockPath;
    } catch (error) {
      throw ErrorFactory.ioWriteFailed(lockPath, 'Cannot create lock file');
    }
  }

  /**
   * Remove lockfile when run completes successfully.
   */
  async removeLockFile(runId: string): Promise<void> {
    const lockPath = path.join(this.runRoot, runId, 'run.lock');

    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch (error) {
      throw ErrorFactory.ioWriteFailed(lockPath, 'Cannot remove lock file');
    }
  }

  /**
   * Check if a run is locked (crashed or in progress).
   */
  isRunLocked(runId: string): boolean {
    const lockPath = path.join(this.runRoot, runId, 'run.lock');
    return fs.existsSync(lockPath);
  }

  /**
   * Get list of locked runs (potential crash recovery candidates).
   */
  getLockedRuns(): string[] {
    try {
      if (!fs.existsSync(this.runRoot)) {
        return [];
      }

      return fs
        .readdirSync(this.runRoot)
        .filter((runId) => {
          const lockPath = path.join(this.runRoot, runId, 'run.lock');
          return fs.existsSync(lockPath);
        });
    } catch {
      return [];
    }
  }

  /**
   * Ensure run directory exists and is writable.
   */
  async ensureRunDirectory(runId: string): Promise<string> {
    const runDir = path.join(this.runRoot, runId);

    try {
      if (!fs.existsSync(runDir)) {
        fs.mkdirSync(runDir, { recursive: true });
      }

      // Check writability
      fs.accessSync(runDir, fs.constants.W_OK);
      return runDir;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
        throw ErrorFactory.permissionDenied(runDir, 'write');
      }
      throw error;
    }
  }

  /**
   * Write text file atomically using temp→rename pattern.
   */
  async writeTextFileAtomic(filePath: string, content: string): Promise<void> {
    this.ensureContainedPath(this.artifactRoot, filePath);

    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const tmpPath = `${filePath}.tmp-${crypto.randomBytes(8).toString('hex')}`;

      try {
        fs.writeFileSync(tmpPath, content, 'utf-8');

        if (fs.existsSync(filePath)) {
          const bakPath = `${filePath}.bak`;
          try {
            fs.renameSync(filePath, bakPath);
          } catch {
            // Continue
          }
        }

        fs.renameSync(tmpPath, filePath);
      } catch (error) {
        try {
          if (fs.existsSync(tmpPath)) {
            fs.unlinkSync(tmpPath);
          }
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    } catch (error) {
      throw ErrorFactory.ioWriteFailed(
        filePath,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Read text file safely.
   */
  async readTextFileSafe(filePath: string): Promise<string | null> {
    this.ensureContainedPath(this.artifactRoot, filePath);

    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const stats = fs.statSync(filePath);
      if (stats.size > 100 * 1024 * 1024) {
        throw ErrorFactory.ioReadFailed(filePath, 'File is too large (>100MB)');
      }

      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      if (error instanceof RepoSenseError) {
        throw error;
      }
      console.warn(`[SafeArtifactIO] Failed to read text file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * List directory contents.
   */
  async listDirectorySafe(dirPath: string): Promise<string[]> {
    this.ensureContainedPath(this.artifactRoot, dirPath);

    try {
      if (!fs.existsSync(dirPath)) {
        return [];
      }

      return fs.readdirSync(dirPath);
    } catch (error) {
      console.warn(`[SafeArtifactIO] Failed to list directory ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * Delete a file safely.
   */
  async deleteFileSafe(filePath: string): Promise<void> {
    this.ensureContainedPath(this.artifactRoot, filePath);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`[SafeArtifactIO] Failed to delete file ${filePath}:`, error);
    }
  }

  /**
   * Delete a directory safely (recursive).
   */
  async deleteDirectorySafe(dirPath: string): Promise<void> {
    this.ensureContainedPath(this.artifactRoot, dirPath);

    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`[SafeArtifactIO] Failed to delete directory ${dirPath}:`, error);
    }
  }

  /**
   * Ensure directory exists.
   */
  async ensureDirectoryExists(dirPath: string): Promise<void> {
    this.ensureContainedPath(this.artifactRoot, dirPath);

    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      throw ErrorFactory.generationFailed(
        `Failed to create directory ${dirPath}`,
        error instanceof Error ? error.message : String(error),
        { dirPath }
      );
    }
  }
}
