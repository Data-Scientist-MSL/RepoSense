import * as path from 'path';
import { SafeArtifactIO } from '../security/SafeArtifactIO';
import { ErrorFactory } from '../security/ErrorFactory';

/**
 * DeltaVisualizationService reads delta data and formats for UI display.
 * 
 * CRITICAL: This service is READ-ONLY.
 * - Reads delta.json from artifact store
 * - Formats trend indicators for UI
 * - No recalculation at render time
 */

export interface GapDelta {
  gapId: string;
  status: 'added' | 'removed' | 'unchanged';
  type: string;
  endpoint?: string;
  method?: string;
  severity?: string;
  changeReason?: string;
}

export interface DeltaSummary {
  runId: string;
  previousRunId?: string;
  generatedAt: string; // ISO-8601
  totalGaps: number;
  previousGaps?: number;
  newGaps: number;
  resolvedGaps: number;
  unchangedGaps: number;
  trend: 'improving' | 'stable' | 'degrading';
  trendPercentage: number; // -100 to +100
  gapsByType: Record<string, { added: number; removed: number; total: number }>;
  gaps: GapDelta[];
}

export interface DeltaVisualization {
  summary: DeltaSummary;
  trendIndicator: string; // e.g., "↑ +3 new gaps", "↓ -1 resolved", "→ No change"
  newGapsPanel: GapDelta[];
  resolvedGapsPanel: GapDelta[];
  trendBadge: {
    label: string;
    color: 'green' | 'yellow' | 'red';
    icon: string; // ↑ ↓ →
  };
}

export class DeltaVisualizationService {
  private artifactIo: SafeArtifactIO;

  /**
   * Initializes DeltaVisualizationService.
   */
  constructor(artifactIo: SafeArtifactIO) {
    this.artifactIo = artifactIo;
  }

  /**
   * Reads delta data and formats for visualization.
   * 
   * Reads from: .reposense/runs/<runId>/delta/delta.json
   */
  async getVisualization(runId: string): Promise<DeltaVisualization | null> {
    try {
      const deltaPath = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'delta',
        'delta.json'
      );

      const summary = await this.artifactIo.readJsonSafe<DeltaSummary>(deltaPath);

      if (!summary) {
        console.warn(`[DeltaVisualizationService] No delta data found for run ${runId}`);
        return null;
      }

      // Build visualization
      const newGaps = summary.gaps.filter(g => g.status === 'added');
      const resolvedGaps = summary.gaps.filter(g => g.status === 'removed');
      const trendIndicator = this.buildTrendIndicator(
        summary.newGaps,
        summary.resolvedGaps
      );
      const trendBadge = this.buildTrendBadge(summary.trend, summary.trendPercentage);

      return {
        summary,
        trendIndicator,
        newGapsPanel: newGaps,
        resolvedGapsPanel: resolvedGaps,
        trendBadge
      };
    } catch (error) {
      console.warn(
        `[DeltaVisualizationService] Failed to get visualization for run ${runId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Gets delta summary only (lightweight).
   */
  async getDeltaSummary(runId: string): Promise<DeltaSummary | null> {
    try {
      const deltaPath = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'delta',
        'delta.json'
      );

      return await this.artifactIo.readJsonSafe<DeltaSummary>(deltaPath);
    } catch (error) {
      console.warn(
        `[DeltaVisualizationService] Failed to get summary for run ${runId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Gets new gaps only (added in this run vs previous).
   */
  async getNewGaps(runId: string): Promise<GapDelta[]> {
    const viz = await this.getVisualization(runId);
    return viz?.newGapsPanel || [];
  }

  /**
   * Gets resolved gaps (removed in this run vs previous).
   */
  async getResolvedGaps(runId: string): Promise<GapDelta[]> {
    const viz = await this.getVisualization(runId);
    return viz?.resolvedGapsPanel || [];
  }

  /**
   * Gets trend indicator string (for UI display).
   */
  async getTrendIndicator(runId: string): Promise<string | null> {
    const viz = await this.getVisualization(runId);
    return viz?.trendIndicator || null;
  }

  /**
   * Gets trend badge (icon, color, label).
   */
  async getTrendBadge(runId: string): Promise<{
    label: string;
    color: 'green' | 'yellow' | 'red';
    icon: string;
  } | null> {
    const viz = await this.getVisualization(runId);
    return viz?.trendBadge || null;
  }

  /**
   * Compares two runs and returns visualization.
   */
  async compareRuns(
    currentRunId: string,
    previousRunId: string
  ): Promise<DeltaVisualization | null> {
    try {
      const currentViz = await this.getVisualization(currentRunId);

      if (!currentViz) {
        return null;
      }

      // Delta is already computed in current run data
      // Just return it (no need to recalculate)
      return currentViz;
    } catch (error) {
      throw ErrorFactory.generationFailed(
        `Failed to compare runs ${currentRunId} vs ${previousRunId}`,
        error instanceof Error ? error.message : String(error),
        { currentRunId, previousRunId }
      );
    }
  }

  /**
   * Gets formatted delta statistics for chat response.
   */
  async getDeltaStatistics(runId: string): Promise<string> {
    try {
      const viz = await this.getVisualization(runId);

      if (!viz) {
        return 'No delta data available.';
      }

      const summary = viz.summary;
      const lines: string[] = [
        `**Delta Report for Run ${runId}**`,
        '',
        `Total Gaps: ${summary.totalGaps}`,
        `${viz.trendIndicator}`,
        '',
        `**Breakdown:**`,
        `- New Gaps: ${summary.newGaps}`,
        `- Resolved Gaps: ${summary.resolvedGaps}`,
        `- Unchanged Gaps: ${summary.unchangedGaps}`,
        '',
        `**Trend:** ${summary.trend.toUpperCase()} (${summary.trendPercentage > 0 ? '+' : ''}${summary.trendPercentage}%)`,
        ''
      ];

      // Add by-type breakdown if available
      if (Object.keys(summary.gapsByType).length > 0) {
        lines.push('**By Gap Type:**');
        for (const [type, counts] of Object.entries(summary.gapsByType)) {
          lines.push(`- ${type}: ${counts.total} total (${counts.added} new, ${counts.removed} resolved)`);
        }
      }

      return lines.join('\n');
    } catch (error) {
      console.warn(
        `[DeltaVisualizationService] Failed to get statistics for run ${runId}:`,
        error
      );
      return 'Failed to generate delta statistics.';
    }
  }

  // ============ PRIVATE HELPERS ============

  /**
   * Builds trend indicator string.
   * Examples: "↑ +3 new gaps", "↓ -1 resolved", "→ No change"
   */
  private buildTrendIndicator(newGaps: number, resolvedGaps: number): string {
    const net = newGaps - resolvedGaps;

    if (net > 0) {
      return `↑ +${net} new gap${net !== 1 ? 's' : ''}`;
    } else if (net < 0) {
      return `↓ ${net} resolved gap${Math.abs(net) !== 1 ? 's' : ''}`;
    } else {
      return '→ No change';
    }
  }

  /**
   * Builds trend badge with color and icon.
   */
  private buildTrendBadge(
    trend: 'improving' | 'stable' | 'degrading',
    trendPercentage: number
  ): { label: string; color: 'green' | 'yellow' | 'red'; icon: string } {
    const badges = {
      improving: {
        label: `Improving (${trendPercentage}%)`,
        color: 'green' as const,
        icon: '↓'
      },
      stable: {
        label: 'Stable (0%)',
        color: 'yellow' as const,
        icon: '→'
      },
      degrading: {
        label: `Degrading (+${trendPercentage}%)`,
        color: 'red' as const,
        icon: '↑'
      }
    };

    return badges[trend];
  }
}
