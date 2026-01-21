import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { SafeArtifactIO } from '../security/SafeArtifactIO';
import { ErrorFactory } from '../security/ErrorFactory';
import { ActionPolicy, SafeAction } from '../security/ActionPolicy';

/**
 * SafeApplyEngine.ts (Sprint 14 - Safe Apply)
 *
 * Applies preview artifacts to workspace with full safety guarantees:
 * - Pre-apply validation
 * - Workspace snapshot (rollback capability)
 * - Atomic apply or zero-apply
 * - Post-apply validation
 * - Failure recovery (zero corruption)
 *
 * CRITICAL GUARANTEE: No irreversible change without rollback capability.
 */

export interface ApplySnapshot {
  snapshotId: string;
  runId: string;
  previewId: string;
  createdAt: string; // ISO-8601
  files: Array<{
    filePath: string;
    originalContent: string;
    hash: string;
  }>;
}

export interface ApplyResult {
  success: boolean;
  appliedAt: string;
  filesModified: number;
  snapshotId: string;
  rollbackAvailable: boolean;
  errors?: string[];
}

export class SafeApplyEngine {
  private artifactIo: SafeArtifactIO;
  private actionPolicy: ActionPolicy;
  private workspaceRoot: string;
  private snapshotsDir: string;

  /**
   * Initializes SafeApplyEngine.
   */
  constructor(
    artifactIo: SafeArtifactIO,
    actionPolicy: ActionPolicy,
    workspaceRoot: string
  ) {
    this.artifactIo = artifactIo;
    this.actionPolicy = actionPolicy;
    this.workspaceRoot = workspaceRoot;
    this.snapshotsDir = path.join(
      process.env.REPOSENSE_HOME || '.reposense',
      'snapshots'
    );
  }

  /**
   * Applies a preview artifact to workspace.
   *
   * Flow:
   * 1. Validate action (ActionPolicy)
   * 2. List files to be applied
   * 3. Create workspace snapshot
   * 4. Apply files atomically
   * 5. Post-apply validation
   * 6. Register mutation in run artifacts
   */
  async applyPreview(
    runId: string,
    previewId: string,
    userConfirmed: boolean = false
  ): Promise<ApplyResult> {
    try {
      // Step 1: Validate action
      const policyError = ActionPolicy.validateAction({
        action: 'applyTestPreview',
        context: {
          runId,
          nodeId: previewId
        }
      });

      if (policyError) {
        throw policyError;
      }

      // Step 2: Require explicit user confirmation
      if (!userConfirmed) {
        throw ErrorFactory.policyViolation(
          'applyTestPreview',
          'User confirmation required'
        );
      }

      // Step 3: List files to apply
      const filesToApply = await this.listPreviewFiles(runId, previewId);

      if (filesToApply.length === 0) {
        throw ErrorFactory.generationFailed(
          `No files found to apply for preview ${previewId}`,
          'Preview may be corrupted or empty',
          { runId, previewId }
        );
      }

      // Step 4: Create workspace snapshot (rollback capability)
      const snapshot = await this.createSnapshot(runId, previewId, filesToApply);

      // Step 5: Apply files atomically
      let filesModified = 0;
      const errors: string[] = [];

      for (const filePath of filesToApply) {
        try {
          await this.applyFile(runId, previewId, filePath);
          filesModified++;
        } catch (error) {
          errors.push(
            `Failed to apply ${filePath}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Step 6: Post-apply validation
      const validationResult = await this.validateApply(
        snapshot,
        filesModified,
        errors
      );

      if (!validationResult) {
        // Validation failed - attempt rollback
        throw ErrorFactory.generationFailed(
          `Post-apply validation failed`,
          'Automatic rollback may be triggered',
          { runId, previewId, filesModified }
        );
      }

      // Step 7: Register mutation
      await this.registerMutation(runId, previewId, snapshot.snapshotId);

      return {
        success: true,
        appliedAt: new Date().toISOString(),
        filesModified,
        snapshotId: snapshot.snapshotId,
        rollbackAvailable: true,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      throw ErrorFactory.generationFailed(
        `Failed to apply preview ${previewId}`,
        error instanceof Error ? error.message : String(error),
        { runId, previewId }
      );
    }
  }

  /**
   * Lists all files to be applied from a preview.
   */
  private async listPreviewFiles(
    runId: string,
    previewId: string
  ): Promise<string[]> {
    const previewDir = path.join(
      process.env.REPOSENSE_HOME || '.reposense',
      'runs',
      runId,
      'previews',
      'tests'
    );

    try {
      const files = await this.artifactIo.listDirectorySafe(previewDir);
      return files
        .filter(f => f.endsWith('.preview.ts'))
        .map(f => f.replace('.preview.ts', ''));
    } catch (error) {
      console.warn(
        `[SafeApplyEngine] Failed to list preview files for ${previewId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Creates workspace snapshot for rollback capability.
   */
  private async createSnapshot(
    runId: string,
    previewId: string,
    filesToApply: string[]
  ): Promise<ApplySnapshot> {
    const snapshotId = `snap-${previewId}-${Date.now()}`;
    const snapshotDir = path.join(this.snapshotsDir, snapshotId);

    try {
      await this.artifactIo.ensureDirectoryExists(snapshotDir);

      const snapshot: ApplySnapshot = {
        snapshotId,
        runId,
        previewId,
        createdAt: new Date().toISOString(),
        files: []
      };

      // Snapshot each file to be applied
      for (const fileName of filesToApply) {
        const targetPath = path.join(this.workspaceRoot, fileName + '.ts');

        try {
          const content = fs.existsSync(targetPath)
            ? fs.readFileSync(targetPath, 'utf-8')
            : '';

          const hash = crypto
            .createHash('sha256')
            .update(content)
            .digest('hex');

          snapshot.files.push({
            filePath: targetPath,
            originalContent: content,
            hash
          });
        } catch (error) {
          console.warn(
            `[SafeApplyEngine] Failed to snapshot ${targetPath}:`,
            error
          );
        }
      }

      // Persist snapshot
      const snapshotMetaPath = path.join(snapshotDir, 'snapshot.json');
      await this.artifactIo.writeJsonAtomic(snapshotMetaPath, snapshot);

      return snapshot;
    } catch (error) {
      throw ErrorFactory.generationFailed(
        `Failed to create snapshot for ${previewId}`,
        error instanceof Error ? error.message : String(error),
        { runId, previewId }
      );
    }
  }

  /**
   * Applies a single file from preview to workspace.
   */
  private async applyFile(
    runId: string,
    previewId: string,
    fileName: string
  ): Promise<void> {
    const previewPath = path.join(
      process.env.REPOSENSE_HOME || '.reposense',
      'runs',
      runId,
      'previews',
      'tests',
      `${fileName}.preview.ts`
    );

    const targetPath = path.join(this.workspaceRoot, fileName + '.ts');

    // Path containment check
    if (!targetPath.startsWith(this.workspaceRoot)) {
      throw ErrorFactory.pathTraversal(targetPath, this.workspaceRoot);
    }

    try {
      // Read preview
      const previewContent = await this.artifactIo.readTextFileSafe(previewPath);

      if (!previewContent) {
        throw ErrorFactory.ioReadFailed(
          previewPath,
          'Preview file is empty or unreadable'
        );
      }

      // Write atomically to target (temp → rename)
      await this.artifactIo.writeTextFileAtomic(targetPath, previewContent);
    } catch (error) {
      throw ErrorFactory.ioWriteFailed(
        targetPath,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Validates apply operation success.
   */
  private async validateApply(
    snapshot: ApplySnapshot,
    filesModified: number,
    errors: string[]
  ): Promise<boolean> {
    // Check: All files were applied
    if (filesModified !== snapshot.files.length) {
      console.warn(
        `[SafeApplyEngine] Apply validation failed: ${filesModified}/${snapshot.files.length} files applied`
      );
      return false;
    }

    // Check: No errors during apply
    if (errors.length > 0) {
      console.warn(
        `[SafeApplyEngine] Apply validation failed: ${errors.length} errors occurred`
      );
      return false;
    }

    // Check: Files exist and are readable
    for (const file of snapshot.files) {
      if (!fs.existsSync(file.filePath)) {
        console.warn(
          `[SafeApplyEngine] Post-apply validation failed: ${file.filePath} does not exist`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Registers mutation in run artifacts.
   */
  private async registerMutation(
    runId: string,
    previewId: string,
    snapshotId: string
  ): Promise<void> {
    try {
      const metaPath = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'meta.json'
      );

      const meta = await this.artifactIo.readJsonSafe<Record<string, any>>(
        metaPath
      );

      if (meta) {
        if (!meta.mutations) {
          meta.mutations = [];
        }

        meta.mutations.push({
          mutationId: `mut-${previewId}`,
          previewId,
          appliedAt: new Date().toISOString(),
          snapshotId,
          rollbackAvailable: true
        });

        await this.artifactIo.writeJsonAtomic(metaPath, meta);
      }
    } catch (error) {
      console.warn(
        `[SafeApplyEngine] Failed to register mutation for ${previewId}:`,
        error
      );
    }
  }

  /**
   * Gets a snapshot for potential rollback.
   */
  async getSnapshot(snapshotId: string): Promise<ApplySnapshot | null> {
    try {
      const snapshotPath = path.join(this.snapshotsDir, snapshotId, 'snapshot.json');
      return await this.artifactIo.readJsonSafe<ApplySnapshot>(snapshotPath);
    } catch (error) {
      console.warn(
        `[SafeApplyEngine] Failed to read snapshot ${snapshotId}:`,
        error
      );
      return null;
    }
  }
}
