import * as path from 'path';
import * as fs from 'fs';
import { SafeArtifactIO } from '../security/SafeArtifactIO';
import { ErrorFactory } from '../security/ErrorFactory';

/**
 * RollbackService.ts (Sprint 14 - Safe Rollback)
 *
 * Restores workspace to pre-apply state with:
 * - Exact state restoration
 * - Idempotent rollback
 * - Verification + audit trail
 *
 * CRITICAL GUARANTEE: Rollback restores exact pre-apply state.
 */

export interface RollbackResult {
  success: boolean;
  rolledBackAt: string;
  filesRestored: number;
  snapshotId: string;
  errors?: string[];
}

export interface ApplySnapshot {
  snapshotId: string;
  runId: string;
  previewId: string;
  createdAt: string;
  files: Array<{
    filePath: string;
    originalContent: string;
    hash: string;
  }>;
}

export class RollbackService {
  private artifactIo: SafeArtifactIO;
  private snapshotsDir: string;

  /**
   * Initializes RollbackService.
   */
  constructor(artifactIo: SafeArtifactIO) {
    this.artifactIo = artifactIo;
    this.snapshotsDir = path.join(
      process.env.REPOSENSE_HOME || '.reposense',
      'snapshots'
    );
  }

  /**
   * Rolls back a snapshot (restores exact pre-apply state).
   *
   * Flow:
   * 1. Read snapshot
   * 2. Validate snapshot integrity
   * 3. Restore each file
   * 4. Post-restore validation
   * 5. Update evidence index
   */
  async rollback(snapshotId: string, runId: string): Promise<RollbackResult> {
    try {
      // Step 1: Read snapshot
      const snapshot = await this.readSnapshot(snapshotId);

      if (!snapshot) {
        throw ErrorFactory.generationFailed(
          `Snapshot not found: ${snapshotId}`,
          'Snapshot may have been deleted or corrupted',
          { snapshotId }
        );
      }

      // Step 2: Validate snapshot integrity
      const integrityValid = await this.validateSnapshotIntegrity(snapshot);

      if (!integrityValid) {
        throw ErrorFactory.generationFailed(
          `Snapshot integrity check failed: ${snapshotId}`,
          'Snapshot may be corrupted. Manual intervention may be needed.',
          { snapshotId }
        );
      }

      // Step 3: Restore each file
      const errors: string[] = [];
      let filesRestored = 0;

      for (const file of snapshot.files) {
        try {
          await this.restoreFile(file.filePath, file.originalContent);
          filesRestored++;
        } catch (error) {
          errors.push(
            `Failed to restore ${file.filePath}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Step 4: Post-restore validation
      const validationResult = await this.validateRestore(snapshot, filesRestored);

      if (!validationResult) {
        throw ErrorFactory.generationFailed(
          `Post-restore validation failed`,
          'Workspace may be in inconsistent state. Review manually.',
          { snapshotId, filesRestored }
        );
      }

      // Step 5: Update evidence index
      await this.registerRollback(runId, snapshotId, filesRestored);

      return {
        success: true,
        rolledBackAt: new Date().toISOString(),
        filesRestored,
        snapshotId,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      throw ErrorFactory.generationFailed(
        `Failed to rollback snapshot ${snapshotId}`,
        error instanceof Error ? error.message : String(error),
        { snapshotId }
      );
    }
  }

  /**
   * Rolls back to the most recent snapshot for a run.
   */
  async rollbackLatest(runId: string): Promise<RollbackResult | null> {
    try {
      const latestSnapshot = await this.findLatestSnapshot(runId);

      if (!latestSnapshot) {
        return null;
      }

      return await this.rollback(latestSnapshot.snapshotId, runId);
    } catch (error) {
      console.warn(`[RollbackService] Failed to rollback latest for run ${runId}:`, error);
      return null;
    }
  }

  /**
   * Lists available snapshots for a run.
   */
  async listSnapshots(runId: string): Promise<ApplySnapshot[]> {
    try {
      const snapshotDirs = await this.artifactIo.listDirectorySafe(this.snapshotsDir);
      const snapshots: ApplySnapshot[] = [];

      for (const dir of snapshotDirs) {
        const snapshotPath = path.join(this.snapshotsDir, dir, 'snapshot.json');
        const snapshot = await this.artifactIo.readJsonSafe<ApplySnapshot>(snapshotPath);

        if (snapshot && snapshot.runId === runId) {
          snapshots.push(snapshot);
        }
      }

      return snapshots.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.warn(`[RollbackService] Failed to list snapshots for run ${runId}:`, error);
      return [];
    }
  }

  /**
   * Checks if a rollback is available for a snapshot.
   */
  async isRollbackAvailable(snapshotId: string): Promise<boolean> {
    try {
      const snapshot = await this.readSnapshot(snapshotId);
      return snapshot !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Deletes a snapshot (cleanup).
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    try {
      const snapshotDir = path.join(this.snapshotsDir, snapshotId);
      await this.artifactIo.deleteDirectorySafe(snapshotDir);
    } catch (error) {
      console.warn(`[RollbackService] Failed to delete snapshot ${snapshotId}:`, error);
    }
  }

  // ============ PRIVATE HELPERS ============

  /**
   * Reads a snapshot from disk.
   */
  private async readSnapshot(snapshotId: string): Promise<ApplySnapshot | null> {
    try {
      const snapshotPath = path.join(this.snapshotsDir, snapshotId, 'snapshot.json');
      return await this.artifactIo.readJsonSafe<ApplySnapshot>(snapshotPath);
    } catch (error) {
      console.warn(`[RollbackService] Failed to read snapshot ${snapshotId}:`, error);
      return null;
    }
  }

  /**
   * Validates snapshot integrity (metadata checks).
   */
  private async validateSnapshotIntegrity(snapshot: ApplySnapshot): Promise<boolean> {
    // Check: Snapshot has required fields
    if (
      !snapshot.snapshotId ||
      !snapshot.runId ||
      !snapshot.previewId ||
      !snapshot.createdAt ||
      !Array.isArray(snapshot.files)
    ) {
      console.warn('[RollbackService] Snapshot missing required fields');
      return false;
    }

    // Check: Snapshot is not too old (>30 days)
    const ageMs = Date.now() - new Date(snapshot.createdAt).getTime();
    const maxAgeMs = 30 * 24 * 60 * 60 * 1000; // 30 days

    if (ageMs > maxAgeMs) {
      console.warn('[RollbackService] Snapshot is too old (>30 days)');
      return false;
    }

    return true;
  }

  /**
   * Restores a single file to its original state.
   */
  private async restoreFile(
    filePath: string,
    originalContent: string
  ): Promise<void> {
    try {
      if (originalContent === '') {
        // Original file did not exist - delete it
        if (fs.existsSync(filePath)) {
          await this.artifactIo.deleteFileSafe(filePath);
        }
      } else {
        // Original file existed - restore content
        await this.artifactIo.writeTextFileAtomic(filePath, originalContent);
      }
    } catch (error) {
      throw ErrorFactory.ioWriteFailed(
        filePath,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Validates post-restore state.
   */
  private async validateRestore(
    snapshot: ApplySnapshot,
    filesRestored: number
  ): Promise<boolean> {
    // Check: All files were restored
    if (filesRestored !== snapshot.files.length) {
      console.warn(
        `[RollbackService] Restore validation failed: ${filesRestored}/${snapshot.files.length} files restored`
      );
      return false;
    }

    // Check: Restored files match original content (hash verification)
    for (const file of snapshot.files) {
      if (file.originalContent === '') {
        // File should not exist
        if (fs.existsSync(file.filePath)) {
          console.warn(
            `[RollbackService] Restore validation failed: ${file.filePath} still exists`
          );
          return false;
        }
      } else {
        // File should exist and match hash
        if (!fs.existsSync(file.filePath)) {
          console.warn(
            `[RollbackService] Restore validation failed: ${file.filePath} does not exist`
          );
          return false;
        }

        const restoredContent = fs.readFileSync(file.filePath, 'utf-8');
        const restoredHash = require('crypto')
          .createHash('sha256')
          .update(restoredContent)
          .digest('hex');

        if (restoredHash !== file.hash) {
          console.warn(
            `[RollbackService] Restore validation failed: ${file.filePath} hash mismatch`
          );
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Registers rollback in run artifacts.
   */
  private async registerRollback(
    runId: string,
    snapshotId: string,
    filesRestored: number
  ): Promise<void> {
    try {
      const metaPath = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'meta.json'
      );

      const meta = await this.artifactIo.readJsonSafe<Record<string, any>>(metaPath);

      if (meta) {
        if (!meta.rollbacks) {
          meta.rollbacks = [];
        }

        meta.rollbacks.push({
          rollbackId: `rb-${snapshotId}`,
          snapshotId,
          rolledBackAt: new Date().toISOString(),
          filesRestored
        });

        await this.artifactIo.writeJsonAtomic(metaPath, meta);
      }
    } catch (error) {
      console.warn(
        `[RollbackService] Failed to register rollback for snapshot ${snapshotId}:`,
        error
      );
    }
  }

  /**
   * Finds the most recent snapshot for a run.
   */
  private async findLatestSnapshot(runId: string): Promise<ApplySnapshot | null> {
    const snapshots = await this.listSnapshots(runId);
    return snapshots.length > 0 ? snapshots[0] : null;
  }
}
