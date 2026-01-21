/**
 * Sprint 17 D2: Evidence Bundler
 * Packages immutable, timestamped evidence for audits
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface EvidenceArtifact {
  name: string;
  path: string;
  hash: string;
  size: number;
  timestamp: string;
}

export interface AuditBundle {
  bundleId: string;
  runId: string;
  generatedAt: string;
  bundleHash: string;
  artifacts: EvidenceArtifact[];
  manifest: {
    version: string;
    totalArtifacts: number;
    totalSize: number;
    integrityHash: string;
  };
}

export class EvidenceBundler {
  private bundlePath: string;

  constructor(bundlePath?: string) {
    this.bundlePath = bundlePath || path.join(process.cwd(), '.reposense', 'compliance', 'bundles');
    this.ensurePath();
  }

  private ensurePath(): void {
    if (!fs.existsSync(this.bundlePath)) {
      fs.mkdirSync(this.bundlePath, { recursive: true });
    }
  }

  /**
   * Create immutable evidence bundle
   */
  async createBundle(runId: string, artifacts: string[]): Promise<AuditBundle> {
    const bundleId = `bundle-${Date.now()}`;
    const generatedAt = new Date().toISOString();
    const evidenceArtifacts: EvidenceArtifact[] = [];
    let totalSize = 0;

    // Hash each artifact
    for (const artifactPath of artifacts) {
      if (fs.existsSync(artifactPath)) {
        const stat = fs.statSync(artifactPath);
        const hash = this.hashFile(artifactPath);

        evidenceArtifacts.push({
          name: path.basename(artifactPath),
          path: artifactPath,
          hash,
          size: stat.size,
          timestamp: new Date(stat.mtime).toISOString()
        });

        totalSize += stat.size;
      }
    }

    // Calculate bundle integrity hash
    const integrityContent = evidenceArtifacts.map(a => a.hash).join('|');
    const integrityHash = crypto.createHash('sha256').update(integrityContent).digest('hex');

    const bundle: AuditBundle = {
      bundleId,
      runId,
      generatedAt,
      bundleHash: integrityHash,
      artifacts: evidenceArtifacts,
      manifest: {
        version: '1.0.0',
        totalArtifacts: evidenceArtifacts.length,
        totalSize,
        integrityHash
      }
    };

    // Save bundle metadata
    const bundleMetadataPath = path.join(this.bundlePath, `${bundleId}-manifest.json`);
    fs.writeFileSync(bundleMetadataPath, JSON.stringify(bundle, null, 2));

    // Copy artifacts to immutable bundle directory
    const bundleDir = path.join(this.bundlePath, bundleId);
    if (!fs.existsSync(bundleDir)) {
      fs.mkdirSync(bundleDir, { recursive: true });
    }

    for (const artifact of evidenceArtifacts) {
      const dest = path.join(bundleDir, artifact.name);
      fs.copyFileSync(artifact.path, dest);

      // Make immutable (read-only)
      fs.chmodSync(dest, 0o444);
    }

    return bundle;
  }

  /**
   * Verify bundle integrity
   */
  verifyBundle(bundleId: string): boolean {
    const manifestPath = path.join(this.bundlePath, `${bundleId}-manifest.json`);

    if (!fs.existsSync(manifestPath)) {
      return false;
    }

    const bundle = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const bundleDir = path.join(this.bundlePath, bundleId);

    // Verify each artifact
    for (const artifact of bundle.artifacts) {
      const filePath = path.join(bundleDir, artifact.name);

      if (!fs.existsSync(filePath)) {
        return false;
      }

      const currentHash = this.hashFile(filePath);
      if (currentHash !== artifact.hash) {
        return false;
      }
    }

    return true;
  }

  /**
   * Export bundle as ZIP (for auditor)
   */
  async exportBundleAsZip(bundleId: string, outputPath: string): Promise<string> {
    const bundleDir = path.join(this.bundlePath, bundleId);
    const manifestPath = path.join(this.bundlePath, `${bundleId}-manifest.json`);

    if (!fs.existsSync(bundleDir) || !fs.existsSync(manifestPath)) {
      throw new Error(`Bundle ${bundleId} not found`);
    }

    // In production, use 'archiver' library
    // For now, create ZIP manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    const zipPath = path.join(outputPath, `${bundleId}.zip`);
    fs.writeFileSync(zipPath, JSON.stringify(manifest, null, 2));

    return zipPath;
  }

  /**
   * List all bundles
   */
  listBundles(): AuditBundle[] {
    const bundles: AuditBundle[] = [];

    if (!fs.existsSync(this.bundlePath)) {
      return bundles;
    }

    const files = fs.readdirSync(this.bundlePath);

    for (const file of files) {
      if (file.endsWith('-manifest.json')) {
        const content = fs.readFileSync(path.join(this.bundlePath, file), 'utf8');
        bundles.push(JSON.parse(content));
      }
    }

    return bundles.sort((a, b) =>
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }

  /**
   * Hash file with SHA256
   */
  private hashFile(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
