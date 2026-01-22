import * as path from 'path';
import { SafeArtifactIO } from '../security/SafeArtifactIO';
import { ErrorFactory } from '../security/ErrorFactory';

/**
 * EvidenceIndexService maintains structural links between gaps and their previews/executions.
 * 
 * This service creates an audit trail:
 * Gap → Preview Test → (Future) Execution → (Future) Artifacts
 * 
 * CRITICAL: This is STRUCTURAL ONLY.
 * - No execution tracking in Sprint 13 (future enhancement)
 * - Only maintains references and relationships
 * - Stored in .reposense/runs/<runId>/evidence/evidence-index.json
 */

export type EvidenceType =
  | 'TEST_PREVIEW'
  | 'TEST_EXECUTION'
  | 'EXECUTION'
  | 'REMEDIATION_PREVIEW'
  | 'REMEDIATION_EXECUTION'
  | 'DIAGRAM_PREVIEW'
  | 'REPORT_GENERATED';

export interface EvidenceRecord {
  gapId: string;
  previewId?: string; // Link to preview artifact
  executionId?: string; // For future execution tracking
  type: EvidenceType;
  createdAt: string; // ISO-8601
  status: 'PREVIEW_ONLY' | 'PENDING_REVIEW' | 'APPROVED' | 'EXECUTED' | 'FAILED';
  metadata?: Record<string, any>;
}

export interface EvidenceIndex {
  runId: string;
  createdAt: string; // ISO-8601
  lastUpdated: string;
  records: EvidenceRecord[];
}

export class EvidenceIndexService {
  private artifactIo: SafeArtifactIO;
  private indexCache: Map<string, EvidenceIndex> = new Map();

  /**
   * Initializes EvidenceIndexService.
   */
  constructor(artifactIo: SafeArtifactIO) {
    this.artifactIo = artifactIo;
  }

  /**
   * Gets or creates an evidence index for a run.
   */
  async getOrCreateIndex(runId: string): Promise<EvidenceIndex> {
    // Check cache first
    if (this.indexCache.has(runId)) {
      return this.indexCache.get(runId)!;
    }

    try {
      const indexPath = this.getIndexPath(runId);
      const existing = await this.artifactIo.readJsonSafe<EvidenceIndex>(indexPath);

      if (existing) {
        this.indexCache.set(runId, existing);
        return existing;
      }
    } catch (error) {
      console.warn(`[EvidenceIndexService] Failed to read existing index for ${runId}:`, error);
    }

    // Create new index
    const newIndex: EvidenceIndex = {
      runId,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      records: []
    };

    this.indexCache.set(runId, newIndex);
    return newIndex;
  }

  /**
   * Adds or updates an evidence record for a gap.
   */
  async recordEvidence(
    runId: string,
    gapId: string,
    type: EvidenceType,
    previewId?: string,
    executionId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const index = await this.getOrCreateIndex(runId);

      // Find or create record
      let record = index.records.find(r => r.gapId === gapId && r.type === type);

      if (!record) {
        record = {
          gapId,
          type,
          createdAt: new Date().toISOString(),
          status: 'PREVIEW_ONLY'
        };
        index.records.push(record);
      }

      // Update record
      if (previewId) {
        record.previewId = previewId;
      }
      if (executionId) {
        record.executionId = executionId;
        record.status = 'EXECUTED';
      }
      if (metadata) {
        record.metadata = { ...record.metadata, ...metadata };
      }

      // Update index timestamp
      index.lastUpdated = new Date().toISOString();

      // Persist atomically
      await this.persistIndex(runId, index);
    } catch (error) {
      throw ErrorFactory.generationFailed(
        `Failed to record evidence for gap ${gapId}`,
        error instanceof Error ? error.message : String(error),
        { gapId, type }
      );
    }
  }

  /**
   * Gets all evidence records for a gap.
   */
  async getGapEvidence(runId: string, gapId: string): Promise<EvidenceRecord[]> {
    try {
      const index = await this.getOrCreateIndex(runId);
      return index.records.filter(r => r.gapId === gapId);
    } catch (error) {
      console.warn(
        `[EvidenceIndexService] Failed to get evidence for gap ${gapId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Gets all evidence records of a specific type.
   */
  async getEvidenceByType(runId: string, type: EvidenceType): Promise<EvidenceRecord[]> {
    try {
      const index = await this.getOrCreateIndex(runId);
      return index.records.filter(r => r.type === type);
    } catch (error) {
      console.warn(
        `[EvidenceIndexService] Failed to get evidence of type ${type}:`,
        error
      );
      return [];
    }
  }

  /**
   * Gets summary statistics for evidence.
   */
  async getEvidenceSummary(runId: string): Promise<{
    totalRecords: number;
    byType: Record<EvidenceType, number>;
    byStatus: Record<string, number>;
  }> {
    try {
      const index = await this.getOrCreateIndex(runId);

      const byType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};

      for (const record of index.records) {
        byType[record.type] = (byType[record.type] || 0) + 1;
        byStatus[record.status] = (byStatus[record.status] || 0) + 1;
      }

      return {
        totalRecords: index.records.length,
        byType: byType as Record<EvidenceType, number>,
        byStatus
      };
    } catch (error) {
      console.warn(
        `[EvidenceIndexService] Failed to get evidence summary for ${runId}:`,
        error
      );
      return {
        totalRecords: 0,
        byType: {} as Record<EvidenceType, number>,
        byStatus: {}
      };
    }
  }

  /**
   * Checks if a gap has a preview.
   */
  async hasPreview(runId: string, gapId: string): Promise<boolean> {
    try {
      const evidence = await this.getGapEvidence(runId, gapId);
      return evidence.some(
        e => e.type === 'TEST_PREVIEW' && e.previewId && e.status === 'PREVIEW_ONLY'
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Marks evidence as approved (before potential execution).
   */
  async approveEvidence(runId: string, gapId: string, type: EvidenceType): Promise<void> {
    try {
      const index = await this.getOrCreateIndex(runId);
      const record = index.records.find(r => r.gapId === gapId && r.type === type);

      if (record) {
        record.status = 'APPROVED';
        index.lastUpdated = new Date().toISOString();
        await this.persistIndex(runId, index);
      }
    } catch (error) {
      console.warn(
        `[EvidenceIndexService] Failed to approve evidence for gap ${gapId}:`,
        error
      );
    }
  }

  /**
   * Clears evidence for a gap (cleanup).
   */
  async clearGapEvidence(runId: string, gapId: string): Promise<void> {
    try {
      const index = await this.getOrCreateIndex(runId);
      index.records = index.records.filter(r => r.gapId !== gapId);
      index.lastUpdated = new Date().toISOString();
      await this.persistIndex(runId, index);
    } catch (error) {
      console.warn(
        `[EvidenceIndexService] Failed to clear evidence for gap ${gapId}:`,
        error
      );
    }
  }

  /**
   * Exports evidence index as JSON.
   */
  async exportEvidence(runId: string): Promise<string> {
    try {
      const index = await this.getOrCreateIndex(runId);
      return JSON.stringify(index, null, 2);
    } catch (error) {
      throw ErrorFactory.generationFailed(
        `Failed to export evidence for run ${runId}`,
        error instanceof Error ? error.message : String(error),
        { runId }
      );
    }
  }

  // ============ PRIVATE HELPERS ============

  /**
   * Gets the path to the evidence index file.
   */
  private getIndexPath(runId: string): string {
    return path.join(
      process.env.REPOSENSE_HOME || '.reposense',
      'runs',
      runId,
      'evidence',
      'evidence-index.json'
    );
  }

  /**
   * Persists evidence index atomically.
   */
  private async persistIndex(runId: string, index: EvidenceIndex): Promise<void> {
    const indexPath = this.getIndexPath(runId);

    // Ensure directory exists
    const dir = path.dirname(indexPath);
    await this.artifactIo.ensureDirectoryExists(dir);

    // Write atomically
    await this.artifactIo.writeJsonAtomic(indexPath, index);

    // Update cache
    this.indexCache.set(runId, index);
  }
}
