/**
 * ReportBuilder.ts (Sprint 10 - Day 4)
 * 
 * Transforms graph.json into human-readable report.json with statistics.
 */

import { Graph } from './GraphBuilder';

export interface ReportStatistics {
  totalEndpoints: number;
  totalCallSites: number;
  totalEdges: number;
  orphanEndpoints: number;
  orphanCalls: number;
  coverageRatio: number; // 0-1: (matched endpoints) / (total endpoints)
  matchedEndpoints: number;
}

export interface GapAnalysis {
  orphanEndpoints: Array<{
    id: string;
    method: string;
    path: string;
    file: string;
    line: number;
    reason: 'no_incoming_calls';
  }>;
  orphanCalls: Array<{
    id: string;
    method: string;
    endpoint: string;
    file: string;
    line: number;
    reason: 'endpoint_not_found' | 'endpoint_not_implemented';
  }>;
  unreachableAreas: Array<{
    file: string;
    startLine: number;
    endLine: number;
    reason: 'unreachable_code';
  }>;
}

export interface Report {
  version: string;
  generatedAt: string;
  statistics: ReportStatistics;
  gapAnalysis: GapAnalysis;
  recommendations: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export class ReportBuilder {
  /**
   * Build report from graph.
   */
  buildReport(graph: Graph): Report {
    const statistics = this.computeStatistics(graph);
    const gapAnalysis = this.analyzeGaps(graph);
    const recommendations = this.generateRecommendations(graph, gapAnalysis);
    const severity = this.determineSeverity(statistics);

    return {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      statistics,
      gapAnalysis,
      recommendations,
      severity,
    };
  }

  /**
   * Compute statistics from graph.
   */
  private computeStatistics(graph: Graph): ReportStatistics {
    const endpointNodes = graph.nodes.filter(n => n.type === 'endpoint');
    const callNodes = graph.nodes.filter(n => n.type === 'call');

    const orphanEndpoints = endpointNodes.filter(n => n.isOrphan).length;
    const orphanCalls = callNodes.filter(n => n.isOrphan).length;
    const matchedEndpoints = endpointNodes.length - orphanEndpoints;
    const coverageRatio = endpointNodes.length > 0 ? matchedEndpoints / endpointNodes.length : 0;

    return {
      totalEndpoints: endpointNodes.length,
      totalCallSites: callNodes.length,
      totalEdges: graph.edgeCount,
      orphanEndpoints,
      orphanCalls,
      coverageRatio,
      matchedEndpoints,
    };
  }

  /**
   * Analyze gaps (orphaned endpoints and calls).
   */
  private analyzeGaps(graph: Graph): GapAnalysis {
    const orphanEndpoints = graph.nodes
      .filter(n => n.type === 'endpoint' && n.isOrphan)
      .map(n => ({
        id: n.id,
        method: n.method || 'UNKNOWN',
        path: n.path,
        file: n.file,
        line: n.line,
        reason: 'no_incoming_calls' as const,
      }));

    const orphanCalls = graph.nodes
      .filter(n => n.type === 'call' && n.isOrphan)
      .map(n => ({
        id: n.id,
        method: n.method || 'UNKNOWN',
        endpoint: n.path,
        file: n.file,
        line: n.line,
        reason: 'endpoint_not_found' as const,
      }));

    return {
      orphanEndpoints,
      orphanCalls,
      unreachableAreas: [], // TODO: Implement in Sprint 12
    };
  }

  /**
   * Generate recommendations based on gaps.
   */
  private generateRecommendations(graph: Graph, gapAnalysis: GapAnalysis): string[] {
    const recommendations: string[] = [];

    if (gapAnalysis.orphanEndpoints.length > 0) {
      recommendations.push(
        `Remove or test ${gapAnalysis.orphanEndpoints.length} unused endpoints to improve code coverage.`
      );
    }

    if (gapAnalysis.orphanCalls.length > 0) {
      recommendations.push(
        `Implement or remove ${gapAnalysis.orphanCalls.length} API calls with missing endpoints.`
      );
    }

    const coverage = graph.statistics ? (
      (graph.statistics.connectedEdges / Math.max(graph.statistics.totalCallSites, 1)) * 100
    ) : 0;

    if (coverage < 50) {
      recommendations.push('Less than 50% API coverage. Prioritize implementing missing endpoints.');
    } else if (coverage < 80) {
      recommendations.push('Aim for >80% API coverage by implementing missing endpoints or removing unused calls.');
    }

    return recommendations;
  }

  /**
   * Determine overall severity.
   */
  private determineSeverity(stats: ReportStatistics): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (stats.orphanEndpoints > stats.totalEndpoints * 0.5) {
      return 'CRITICAL';
    }
    if (stats.orphanCalls > stats.totalCallSites * 0.5) {
      return 'CRITICAL';
    }
    if (stats.coverageRatio < 0.5) {
      return 'HIGH';
    }
    if (stats.coverageRatio < 0.8) {
      return 'MEDIUM';
    }
    return 'LOW';
  }
}
