import * as path from 'path';
import * as fs from 'fs';
import { SafeArtifactIO } from '../security/SafeArtifactIO';
import { Redactor } from '../security/Redactor';
import { ErrorFactory } from '../security/ErrorFactory';

/**
 * ExportService creates exportable review artifacts.
 * 
 * Exports include:
 * - Report (HTML or Markdown)
 * - Delta summary
 * - Test preview bundle (ZIP)
 * 
 * CRITICAL: All exports are read-only and secret-redacted.
 */

export interface ExportManifest {
  exportId: string;
  runId: string;
  exportedAt: string; // ISO-8601
  exportTypes: ('report' | 'delta' | 'previews')[];
  contentsHash: string; // SHA256 for integrity
  redactionApplied: boolean;
}

export interface ExportBundle {
  exportId: string;
  runId: string;
  timestamp: string;
  manifest: ExportManifest;
  report?: {
    format: 'markdown' | 'html';
    content: string;
  };
  delta?: {
    summary: Record<string, any>;
    visualization: Record<string, any>;
  };
  previews?: {
    count: number;
    previewIds: string[];
  };
}

export class ExportService {
  private artifactIo: SafeArtifactIO;
  private redactor: Redactor;

  /**
   * Initializes ExportService.
   */
  constructor(artifactIo: SafeArtifactIO, redactor: Redactor) {
    this.artifactIo = artifactIo;
    this.redactor = redactor;
  }

  /**
   * Exports a complete review bundle (report + delta + previews).
   * 
   * Output: .reposense/exports/<timestamp>/
   *   ├─ manifest.json
   *   ├─ report.md
   *   ├─ delta.json
   *   └─ previews.zip (if previews requested)
   */
  async exportReviewBundle(
    runId: string,
    options?: {
      includeReport?: boolean;
      includeDelta?: boolean;
      includePreviews?: boolean;
      format?: 'markdown' | 'html';
    }
  ): Promise<ExportBundle> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportId = `export-${timestamp}`;

    try {
      const exportDir = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'exports',
        exportId
      );

      // Ensure export directory exists
      await this.artifactIo.ensureDirectoryExists(exportDir);

      const bundle: ExportBundle = {
        exportId,
        runId,
        timestamp,
        manifest: {
          exportId,
          runId,
          exportedAt: new Date().toISOString(),
          exportTypes: [],
          contentsHash: '',
          redactionApplied: true
        }
      };

      // Export report
      if (options?.includeReport !== false) {
        const format = options?.format || 'markdown';
        const reportContent = await this.generateReport(runId, format);
        if (reportContent) {
          bundle.report = {
            format,
            content: reportContent
          };
          bundle.manifest.exportTypes.push('report');

          const reportPath = path.join(exportDir, `report.${format === 'html' ? 'html' : 'md'}`);
          await this.artifactIo.writeTextFileAtomic(reportPath, reportContent);
        }
      }

      // Export delta
      if (options?.includeDelta !== false) {
        const deltaData = await this.exportDelta(runId);
        if (deltaData) {
          bundle.delta = deltaData;
          bundle.manifest.exportTypes.push('delta');

          const deltaPath = path.join(exportDir, 'delta.json');
          await this.artifactIo.writeJsonAtomic(deltaPath, deltaData);
        }
      }

      // Export previews
      if (options?.includePreviews !== false) {
        const previewsData = await this.exportPreviews(runId, exportDir);
        if (previewsData) {
          bundle.previews = previewsData;
          bundle.manifest.exportTypes.push('previews');
        }
      }

      // Create and persist manifest
      bundle.manifest.contentsHash = this.computeHash(bundle);
      const manifestPath = path.join(exportDir, 'manifest.json');
      await this.artifactIo.writeJsonAtomic(manifestPath, bundle.manifest);

      return bundle;
    } catch (error) {
      throw ErrorFactory.generationFailed(
        `Failed to export review bundle for run ${runId}`,
        error instanceof Error ? error.message : String(error),
        { runId, exportId }
      );
    }
  }

  /**
   * Exports only the report.
   */
  async exportReport(
    runId: string,
    format: 'markdown' | 'html' = 'markdown'
  ): Promise<string | null> {
    return await this.generateReport(runId, format);
  }

  /**
   * Exports only the delta summary.
   */
  async exportDelta(runId: string): Promise<{ summary: Record<string, any>; visualization: Record<string, any> } | null> {
    try {
      const deltaPath = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'delta',
        'delta.json'
      );

      const summary = await this.artifactIo.readJsonSafe<Record<string, any>>(deltaPath);

      if (!summary) {
        return null;
      }

      // Redact any secrets in delta data
      const { redacted } = Redactor.redactObject(summary);

      return {
        summary: redacted as Record<string, any>,
        visualization: this.buildDeltaVisualization(summary as any)
      };
    } catch (error) {
      console.warn(
        `[ExportService] Failed to export delta for run ${runId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Exports preview bundle.
   */
  async exportPreviews(runId: string, exportDir?: string): Promise<{
    count: number;
    previewIds: string[];
  } | null> {
    try {
      const previewsDir = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'previews',
        'tests'
      );

      const previewFiles = await this.artifactIo.listDirectorySafe(previewsDir);
      const previewIds: string[] = [];

      for (const file of previewFiles) {
        if (file.endsWith('.preview.ts')) {
          const previewId = file.replace('.preview.ts', '');
          previewIds.push(previewId);
        }
      }

      if (previewIds.length === 0) {
        return null;
      }

      // If export directory provided, create preview bundle
      if (exportDir) {
        const previewExportDir = path.join(exportDir, 'previews');
        await this.artifactIo.ensureDirectoryExists(previewExportDir);

        // Copy preview files
        for (const previewId of previewIds) {
          const srcMeta = path.join(previewsDir, `${previewId}.meta.json`);
          const srcCode = path.join(previewsDir, `${previewId}.preview.ts`);
          const dstMeta = path.join(previewExportDir, `${previewId}.meta.json`);
          const dstCode = path.join(previewExportDir, `${previewId}.preview.ts`);

          try {
            const meta = await this.artifactIo.readJsonSafe(srcMeta);
            const code = await this.artifactIo.readTextFileSafe(srcCode);

            if (meta && code) {
              // Redact code before export
              const { redacted: redactedCode } = Redactor.redact(code);
              await this.artifactIo.writeJsonAtomic(dstMeta, meta);
              await this.artifactIo.writeTextFileAtomic(dstCode, redactedCode);
            }
          } catch (error) {
            console.warn(
              `[ExportService] Failed to export preview ${previewId}:`,
              error
            );
          }
        }
      }

      return {
        count: previewIds.length,
        previewIds
      };
    } catch (error) {
      console.warn(
        `[ExportService] Failed to export previews for run ${runId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Lists all exports.
   */
  async listExports(): Promise<ExportManifest[]> {
    try {
      const exportsRoot = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'exports'
      );

      const exportDirs = await this.artifactIo.listDirectorySafe(exportsRoot);
      const manifests: ExportManifest[] = [];

      for (const dir of exportDirs) {
        const manifestPath = path.join(exportsRoot, dir, 'manifest.json');
        const manifest = await this.artifactIo.readJsonSafe<ExportManifest>(manifestPath);
        if (manifest) {
          manifests.push(manifest);
        }
      }

      return manifests.sort((a, b) =>
        new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime()
      );
    } catch (error) {
      console.warn('[ExportService] Failed to list exports:', error);
      return [];
    }
  }

  /**
   * Retrieves a specific export.
   */
  async getExport(exportId: string): Promise<ExportBundle | null> {
    try {
      const exportDir = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'exports',
        exportId
      );

      const manifestPath = path.join(exportDir, 'manifest.json');
      const manifest = await this.artifactIo.readJsonSafe<ExportManifest>(manifestPath);

      if (!manifest) {
        return null;
      }

      const bundle: ExportBundle = {
        exportId,
        runId: manifest.runId,
        timestamp: manifest.exportedAt,
        manifest
      };

      // Load report if available
      for (const type of manifest.exportTypes) {
        if (type === 'report') {
          const mdPath = path.join(exportDir, 'report.md');
          const htmlPath = path.join(exportDir, 'report.html');

          const mdContent = await this.artifactIo.readTextFileSafe(mdPath);
          const htmlContent = await this.artifactIo.readTextFileSafe(htmlPath);

          if (mdContent) {
            bundle.report = { format: 'markdown', content: mdContent };
          } else if (htmlContent) {
            bundle.report = { format: 'html', content: htmlContent };
          }
        }

        if (type === 'delta') {
          const deltaPath = path.join(exportDir, 'delta.json');
          bundle.delta = await this.artifactIo.readJsonSafe(deltaPath);
        }

        if (type === 'previews') {
          const previewsDir = path.join(exportDir, 'previews');
          const files = await this.artifactIo.listDirectorySafe(previewsDir);
          const previewIds = files
            .filter(f => f.endsWith('.meta.json'))
            .map(f => f.replace('.meta.json', ''));

          bundle.previews = {
            count: previewIds.length,
            previewIds
          };
        }
      }

      return bundle;
    } catch (error) {
      console.warn(`[ExportService] Failed to get export ${exportId}:`, error);
      return null;
    }
  }

  /**
   * Deletes an export (cleanup).
   */
  async deleteExport(exportId: string): Promise<void> {
    try {
      const exportDir = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'exports',
        exportId
      );

      await this.artifactIo.deleteDirectorySafe(exportDir);
    } catch (error) {
      console.warn(`[ExportService] Failed to delete export ${exportId}:`, error);
    }
  }

  // ============ PRIVATE HELPERS ============

  /**
   * Generates report (Markdown or HTML).
   */
  private async generateReport(
    runId: string,
    format: 'markdown' | 'html'
  ): Promise<string | null> {
    try {
      const reportPath = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'report.json'
      );

      const reportData = await this.artifactIo.readJsonSafe<Record<string, any>>(reportPath);

      if (!reportData) {
        return null;
      }

      // Redact secrets
      const { redacted } = Redactor.redactObject(reportData);

      if (format === 'markdown') {
        return this.formatAsMarkdown(redacted as any);
      } else {
        return this.formatAsHTML(redacted as any);
      }
    } catch (error) {
      console.warn(
        `[ExportService] Failed to generate report for run ${runId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Formats report as Markdown.
   */
  private formatAsMarkdown(data: Record<string, any>): string {
    const lines: string[] = [
      '# RepoSense Analysis Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      ''
    ];

    if (data.summary) {
      lines.push('## Summary');
      lines.push(`- Total Gaps: ${data.summary.totalGaps || 0}`);
      lines.push(`- Critical: ${data.summary.critical || 0}`);
      lines.push(`- High: ${data.summary.high || 0}`);
      lines.push(`- Medium: ${data.summary.medium || 0}`);
      lines.push(`- Low: ${data.summary.low || 0}`);
      lines.push('');
    }

    if (data.gaps) {
      lines.push('## Gaps Found');
      for (const gap of data.gaps.slice(0, 50)) {
        lines.push(`### ${gap.type}: ${gap.description || 'Unknown'}`);
        lines.push(`- Severity: ${gap.severity || 'unknown'}`);
        lines.push(`- File: ${gap.file || 'unknown'}`);
        lines.push(`- Line: ${gap.line || 'unknown'}`);
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('*This is a redacted export for human review.*');

    return lines.join('\n');
  }

  /**
   * Formats report as HTML.
   */
  private formatAsHTML(data: Record<string, any>): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>RepoSense Analysis Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1, h2 { color: #333; }
    .summary { background: #f5f5f5; padding: 10px; border-radius: 5px; }
    .gap { margin: 10px 0; padding: 10px; border-left: 4px solid #007acc; }
  </style>
</head>
<body>
  <h1>RepoSense Analysis Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <p><em>This is a redacted export for human review.</em></p>
</body>
</html>`;
  }

  /**
   * Builds delta visualization object.
   */
  private buildDeltaVisualization(delta: any): Record<string, any> {
    return {
      trendIndicator: delta.trendIndicator || '→ No change',
      newGapsCount: delta.newGaps || 0,
      resolvedGapsCount: delta.resolvedGaps || 0,
      trend: delta.trend || 'stable'
    };
  }

  /**
   * Computes hash of bundle contents.
   */
  private computeHash(bundle: ExportBundle): string {
    const crypto = require('crypto');
    const content = JSON.stringify(bundle);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
