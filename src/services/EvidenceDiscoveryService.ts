/**
 * EvidenceDiscoveryService.ts
 * 
 * Enables ChatBot and UI to find evidence for gaps and endpoints.
 * 
 * Answers questions like:
 * - "What evidence proves this gap was tested?"
 * - "Show me screenshots for endpoint GET /users"
 * - "Get the network trace for the failed test"
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  EvidenceIndex,
  EvidenceIndexEntry,
  EvidenceManifest,
} from '../models/StorageModels';

export class EvidenceDiscoveryService {
  constructor(private workspaceRoot: string) {}

  /**
   * Find evidence for a specific gap
   * 
   * Returns: Gap → Linked tests → Artifacts (screenshots, videos, logs)
   */
  async findEvidenceForGap(
    runId: string,
    gapId: string
  ): Promise<EvidenceIndexEntry | null> {
    const index = this.loadEvidenceIndex(runId);
    return index.entries.find((e) => e.gapId === gapId) || null;
  }

  /**
   * Find evidence for an endpoint
   * 
   * Returns: All gaps for endpoint, each with evidence
   */
  async findEvidenceForEndpoint(
    runId: string,
    method: string,
    path: string
  ): Promise<EvidenceIndexEntry[]> {
    const index = this.loadEvidenceIndex(runId);
    return index.entries.filter(
      (e) => e.endpoint.method === method && e.endpoint.path === path
    );
  }

  /**
   * Find evidence by artifact type
   * 
   * Get all screenshots, videos, etc. for a run
   */
  async findEvidenceByType(
    runId: string,
    type: 'SCREENSHOT' | 'VIDEO' | 'NETWORK_TRACE' | 'CONSOLE_LOG'
  ): Promise<EvidenceIndexEntry[]> {
    const index = this.loadEvidenceIndex(runId);
    return index.entries.filter((e) =>
      e.artifacts.some((a) => a.type === type)
    );
  }

  /**
   * Get full evidence for a gap (with artifact contents)
   * 
   * Used by: Evidence side panel
   */
  async getFullEvidenceForGap(
    runId: string,
    gapId: string
  ): Promise<{
    gap: EvidenceIndexEntry;
    artifacts: Array<{
      type: string;
      filename: string;
      path: string;
      size: number;
      content?: string; // For text artifacts (logs)
      url?: string; // For binary artifacts (screenshots)
    }>;
  } | null> {
    const gap = await this.findEvidenceForGap(runId, gapId);
    if (!gap) return null;

    const evidenceDir = this.getEvidenceDirectory(runId);
    const artifacts = [];

    for (const artifact of gap.artifacts) {
      const fullPath = path.join(evidenceDir, artifact.path);

      if (!fs.existsSync(fullPath)) {
        continue;
      }

      const artifact_info: any = {
        type: artifact.type,
        filename: artifact.filename,
        path: artifact.path,
        size: fs.statSync(fullPath).size,
      };

      // For text artifacts, load content
      if (
        artifact.type === 'CONSOLE_LOG' ||
        artifact.type === 'NETWORK_TRACE'
      ) {
        try {
          artifact_info.content = fs.readFileSync(fullPath, 'utf-8');
        } catch {
          // Binary or unreadable
        }
      }

      artifacts.push(artifact_info);
    }

    return { gap, artifacts };
  }

  /**
   * Get evidence statistics for a run
   */
  async getEvidenceStats(
    runId: string
  ): Promise<{
    totalEvidence: number;
    byType: Record<string, number>;
    totalSize: number;
  }> {
    const manifest = this.loadEvidenceManifest(runId);

    const byType: Record<string, number> = {};
    let totalSize = 0;

    for (const file of manifest.files) {
      byType[file.type] = (byType[file.type] || 0) + 1;
      totalSize += file.size;
    }

    return {
      totalEvidence: manifest.totalFiles,
      byType,
      totalSize: manifest.totalSize,
    };
  }

  /**
   * Search evidence by test name
   * 
   * Enables: "Find evidence for test 'should authenticate with token'"
   */
  async findEvidenceByTestName(
    runId: string,
    testName: string
  ): Promise<EvidenceIndexEntry[]> {
    const index = this.loadEvidenceIndex(runId);
    return index.entries.filter((e) =>
      e.linkedTests.some((t) => t.testName.includes(testName))
    );
  }

  /**
   * Get confidence score for gap evidence
   * 
   * Returns: 0-1 confidence that the gap is actually tested
   * Factors:
   * - Test passed (yes/no)
   * - Has screenshots/video (multiple artifacts)
   * - Recent execution
   */
  async getEvidenceConfidence(
    runId: string,
    gapId: string
  ): Promise<number | null> {
    const gap = await this.findEvidenceForGap(runId, gapId);
    if (!gap) return null;

    // Already computed in evidence index
    return gap.confidence;
  }

  /**
   * Find "proof" for a gap (curated evidence)
   * 
   * Returns best evidence to show in UI:
   * 1. Screenshot of successful test result
   * 2. Passing test case
   * 3. Network trace showing endpoint was called
   */
  async findProofForGap(
    runId: string,
    gapId: string
  ): Promise<{
    testCase: any;
    screenshot?: string; // path to image
    networkTrace?: string; // path to HAR
    passed: boolean;
  } | null> {
    const gap = await this.findEvidenceForGap(runId, gapId);
    if (!gap) return null;

    // Find passing test
    const passingTest = gap.linkedTests.find((t) => t.passed);
    if (!passingTest) return null;

    // Find screenshot for this test
    const screenshot = gap.artifacts.find(
      (a) => a.type === 'SCREENSHOT' && a.filename.includes(passingTest.testId)
    );

    // Find network trace
    const networkTrace = gap.artifacts.find((a) => a.type === 'NETWORK_TRACE');

    return {
      testCase: passingTest,
      screenshot: screenshot?.path,
      networkTrace: networkTrace?.path,
      passed: true,
    };
  }

  /**
   * Compare evidence between runs
   * 
   * Enables: "Did we collect better evidence for gap X in the new run?"
   */
  async compareEvidence(
    runId1: string,
    runId2: string,
    gapId: string
  ): Promise<{
    gapId: string;
    run1Evidence: EvidenceIndexEntry | null;
    run2Evidence: EvidenceIndexEntry | null;
    improvement: number; // -1 to 1 (worse to better)
  }> {
    const run1 = await this.findEvidenceForGap(runId1, gapId);
    const run2 = await this.findEvidenceForGap(runId2, gapId);

    let improvement = 0;

    if (run1 && run2) {
      const score1 = run1.confidence;
      const score2 = run2.confidence;
      improvement = score2 - score1; // -1 to 1
    }

    return {
      gapId,
      run1Evidence: run1,
      run2Evidence: run2,
      improvement,
    };
  }

  /**
   * Validate evidence integrity
   * 
   * Checks: All referenced artifacts exist and checksums match
   */
  async validateEvidence(runId: string): Promise<{
    valid: boolean;
    missing: string[];
    corrupted: string[];
  }> {
    const index = this.loadEvidenceIndex(runId);
    const manifest = this.loadEvidenceManifest(runId);
    const evidenceDir = this.getEvidenceDirectory(runId);

    const missing: string[] = [];
    const corrupted: string[] = [];

    for (const file of manifest.files) {
      const fullPath = path.join(evidenceDir, file.path);

      if (!fs.existsSync(fullPath)) {
        missing.push(file.path);
        continue;
      }

      // TODO: Validate checksum if SHA256 is provided
      // For now, just check existence
    }

    return {
      valid: missing.length === 0 && corrupted.length === 0,
      missing,
      corrupted,
    };
  }

  /**
   * Get evidence directory for run
   */
  private getEvidenceDirectory(runId: string): string {
    return path.join(
      this.workspaceRoot,
      '.reposense',
      'runs',
      runId,
      'evidence'
    );
  }

  /**
   * Load evidence index for run
   */
  private loadEvidenceIndex(runId: string): EvidenceIndex {
    const indexPath = path.join(
      this.getEvidenceDirectory(runId),
      'evidence-index.json'
    );

    if (!fs.existsSync(indexPath)) {
      return {
        version: '1.0',
        runId,
        timestamp: new Date().toISOString(),
        entries: [],
      };
    }

    const content = fs.readFileSync(indexPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Load evidence manifest for run
   */
  private loadEvidenceManifest(runId: string): EvidenceManifest {
    const manifestPath = path.join(
      this.getEvidenceDirectory(runId),
      'evidence-manifest.json'
    );

    if (!fs.existsSync(manifestPath)) {
      return {
        version: '1.0',
        runId,
        files: [],
        totalSize: 0,
        totalFiles: 0,
      };
    }

    const content = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Export evidence bundle for sharing
   * 
   * Creates a curated ZIP with:
   * - Key screenshots
   * - Summary of passing/failing tests
   * - Network traces
   * - Evidence index
   */
  async exportEvidenceBundle(runId: string, outputPath: string): Promise<void> {
    // TODO: Implement with archiver
    console.log(`Would export evidence for run ${runId} to ${outputPath}`);
  }
}

export default EvidenceDiscoveryService;
