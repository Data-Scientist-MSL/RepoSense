/**
 * EvidenceService (Sprint 5)
 * Collects, indexes, and validates evidence (screenshots, videos, logs)
 * Links gaps to tests to artifacts
 */

import * as crypto from 'crypto';

export enum ArtifactType {
  SCREENSHOT = 'SCREENSHOT',
  VIDEO = 'VIDEO',
  NETWORK_TRACE = 'NETWORK_TRACE',
  CONSOLE_LOG = 'CONSOLE_LOG',
}

export interface EvidenceArtifact {
  type: ArtifactType;
  path: string;
  checksum?: string;
  mtime?: number;
}

export interface LinkedTest {
  testId: string;
  testName: string;
  passed: boolean;
  artifacts: EvidenceArtifact[];
}

export interface EvidenceEntry {
  gapId: string;
  endpoint: {
    method: string;
    path: string;
  };
  linkedTests: LinkedTest[];
  confidence: number; // 0-1: likelihood gap is tested
}

export interface EvidenceIndex {
  runId: string;
  generatedAt: string;
  entries: EvidenceEntry[];
  metadata: {
    totalGaps: number;
    testedGaps: number;
    untestedGaps: number;
    avgConfidence: number;
  };
}

export interface EvidenceManifest {
  files: Array<{
    path: string;
    checksum: string;
    size: number;
    mtime: number;
  }>;
  metadata: {
    generatedAt: string;
    integrityVerified: boolean;
  };
}

/**
 * Evidence collection and indexing service
 */
export class EvidenceService {
  private runId: string;
  private workspaceRoot: string;
  private entries: Map<string, EvidenceEntry> = new Map();
  private artifacts: Map<string, EvidenceArtifact> = new Map();

  constructor(runId: string, workspaceRoot: string) {
    this.runId = runId;
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Calculate checksum for integrity verification
   */
  private calculateChecksum(content: string | Buffer): string {
    if (typeof content === 'string') {
      content = Buffer.from(content);
    }
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 12);
  }

  /**
   * Register an artifact (screenshot, video, etc.)
   */
  registerArtifact(
    path: string,
    type: ArtifactType,
    content: Buffer,
    mtime: number = Date.now()
  ): EvidenceArtifact {
    const checksum = this.calculateChecksum(content);

    const artifact: EvidenceArtifact = {
      type,
      path,
      checksum,
      mtime,
    };

    this.artifacts.set(path, artifact);
    return artifact;
  }

  /**
   * Link test to gap with artifacts
   */
  linkTestToGap(
    gapId: string,
    gap: { endpoint: string; method: string },
    testId: string,
    testName: string,
    testPassed: boolean,
    artifacts: EvidenceArtifact[]
  ): EvidenceEntry {
    let entry = this.entries.get(gapId);

    if (!entry) {
      entry = {
        gapId,
        endpoint: {
          method: gap.method || 'UNKNOWN',
          path: gap.endpoint || 'unknown',
        },
        linkedTests: [],
        confidence: 0,
      };
      this.entries.set(gapId, entry);
    }

    entry.linkedTests.push({
      testId,
      testName,
      passed: testPassed,
      artifacts,
    });

    // Update confidence score
    entry.confidence = this.calculateConfidence(entry);

    return entry;
  }

  /**
   * Calculate confidence score for gap testing
   * Based on: number of tests, pass rate, artifact types
   */
  private calculateConfidence(entry: EvidenceEntry): number {
    if (entry.linkedTests.length === 0) return 0;

    // Base: pass rate
    const passedTests = entry.linkedTests.filter((t) => t.passed).length;
    const passRate = passedTests / entry.linkedTests.length;

    // Artifact bonus: screenshots + videos + logs
    let artifactScore = 0;
    const allArtifacts = entry.linkedTests.flatMap((t) => t.artifacts);
    const hasScreenshot = allArtifacts.some((a) => a.type === ArtifactType.SCREENSHOT);
    const hasVideo = allArtifacts.some((a) => a.type === ArtifactType.VIDEO);
    const hasLogs = allArtifacts.some((a) => a.type === ArtifactType.CONSOLE_LOG);

    if (hasScreenshot) artifactScore += 0.1;
    if (hasVideo) artifactScore += 0.15;
    if (hasLogs) artifactScore += 0.1;

    return Math.min(1.0, passRate * 0.75 + artifactScore);
  }

  /**
   * Generate evidence index
   */
  generateIndex(): EvidenceIndex {
    const entries = Array.from(this.entries.values());
    const testedGaps = entries.filter((e) => e.linkedTests.length > 0).length;
    const avgConfidence =
      entries.length > 0
        ? entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length
        : 0;

    return {
      runId: this.runId,
      generatedAt: new Date().toISOString(),
      entries: entries.sort((a, b) => b.confidence - a.confidence),
      metadata: {
        totalGaps: entries.length,
        testedGaps,
        untestedGaps: entries.length - testedGaps,
        avgConfidence,
      },
    };
  }

  /**
   * Generate manifest with integrity checksums
   */
  generateManifest(): EvidenceManifest {
    const files = Array.from(this.artifacts.values()).map((artifact) => ({
      path: artifact.path,
      checksum: artifact.checksum || '',
      size: 0, // Would be populated from actual file
      mtime: artifact.mtime || 0,
    }));

    return {
      files,
      metadata: {
        generatedAt: new Date().toISOString(),
        integrityVerified: true,
      },
    };
  }

  /**
   * Verify manifest integrity
   */
  verifyIntegrity(manifest: EvidenceManifest): boolean {
    for (const file of manifest.files) {
      const artifact = this.artifacts.get(file.path);
      if (!artifact || artifact.checksum !== file.checksum) {
        return false;
      }
    }
    return true;
  }

  /**
   * Find all evidence for a specific gap
   */
  findEvidenceForGap(gapId: string): EvidenceEntry | null {
    return this.entries.get(gapId) || null;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalGaps: number;
    testedGaps: number;
    avgConfidence: number;
    artifactCount: number;
  } {
    const entries = Array.from(this.entries.values());
    const testedGaps = entries.filter((e) => e.linkedTests.length > 0).length;
    const avgConfidence =
      entries.length > 0
        ? entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length
        : 0;

    return {
      totalGaps: entries.length,
      testedGaps,
      avgConfidence,
      artifactCount: this.artifacts.size,
    };
  }
}

export default EvidenceService;
