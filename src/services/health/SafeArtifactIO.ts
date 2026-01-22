/**
 * SafeArtifactIO.ts
 * 
 * Safe file I/O operations for artifacts with error handling and recovery
 */

import * as fs from 'fs';
import * as path from 'path';

export interface WriteOptions {
  atomic?: boolean;
  backup?: boolean;
  encoding?: BufferEncoding;
}

export interface LockedRun {
  runId: string;
  timestamp: string;
  lockFile: string;
}

export class SafeArtifactIO {
  /**
   * Safely read artifact from disk
   */
  public static readArtifact(filePath: string, encoding: BufferEncoding = 'utf-8'): string {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      return fs.readFileSync(filePath, encoding);
    } catch (error) {
      throw new Error(`Failed to read artifact: ${error}`);
    }
  }

  /**
   * Safely read JSON artifact
   */
  public static readJsonSafe(filePath: string): any {
    try {
      const content = this.readArtifact(filePath);
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read JSON artifact: ${error}`);
    }
  }

  /**
   * Safely write artifact to disk
   */
  public static writeArtifact(
    filePath: string,
    content: string,
    options: WriteOptions = {}
  ): void {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (options.backup && fs.existsSync(filePath)) {
        const backupPath = `${filePath}.backup`;
        fs.copyFileSync(filePath, backupPath);
      }

      if (options.atomic) {
        const tempPath = `${filePath}.tmp`;
        fs.writeFileSync(tempPath, content, options.encoding || 'utf-8');
        fs.renameSync(tempPath, filePath);
      } else {
        fs.writeFileSync(filePath, content, options.encoding || 'utf-8');
      }
    } catch (error) {
      throw new Error(`Failed to write artifact: ${error}`);
    }
  }

  /**
   * Check if artifact is accessible
   */
  public static isAccessible(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete artifact safely
   */
  public static deleteArtifact(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      throw new Error(`Failed to delete artifact: ${error}`);
    }
  }

  /**
   * Get all locked runs
   */
  public static getLockedRuns(lockDir: string): LockedRun[] {
    try {
      if (!fs.existsSync(lockDir)) {
        return [];
      }

      const lockFiles = fs.readdirSync(lockDir).filter(f => f.endsWith('.lock'));
      return lockFiles.map(f => ({
        runId: f.replace('.lock', ''),
        timestamp: new Date(fs.statSync(path.join(lockDir, f)).mtime).toISOString(),
        lockFile: path.join(lockDir, f),
      }));
    } catch (error) {
      throw new Error(`Failed to get locked runs: ${error}`);
    }
  }

  /**
   * Remove lock file
   */
  public static removeLockFile(lockFilePath: string): void {
    try {
      if (fs.existsSync(lockFilePath)) {
        fs.unlinkSync(lockFilePath);
      }
    } catch (error) {
      throw new Error(`Failed to remove lock file: ${error}`);
    }
  }
}
