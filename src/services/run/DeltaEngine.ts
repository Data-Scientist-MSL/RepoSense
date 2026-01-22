/**
 * DeltaEngine.ts (Sprint 11 - Day 1)
 * 
 * Compares two consecutive runs and computes trend (IMPROVING/DEGRADING/STABLE).
 * Persists delta.json in the latest run artifact directory.
 */

import * as crypto from 'crypto';

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: 'endpoint' | 'gap';
  data: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
}

export interface Report {
  statistics: {
    coverageRatio: number;
  };
}

export interface Delta {
  runIdFrom: string;
  runIdTo: string;
  timestamp: string;
  trend: 'IMPROVING' | 'DEGRADING' | 'STABLE';
  statistics: {
    newEndpoints: number;
    removedEndpoints: number;
    newGaps: number;
    resolvedGaps: number;
    coverageChange: number;
  };
}

export class DeltaEngine {
  /**
   * Compute delta between two runs.
   */
  computeDelta(graphFrom: Graph, reportFrom: Report, graphTo: Graph, reportTo: Report): Delta {
    const timestamp = new Date().toISOString();

    // Extract node IDs
    const endpointsFrom = new Set(
      graphFrom.nodes.filter(n => n.type === 'endpoint').map(n => n.id)
    );
    const endpointsTo = new Set(graphTo.nodes.filter(n => n.type === 'endpoint').map(n => n.id));

    const gapsFrom = new Set(graphFrom.nodes.filter(n => n.type === 'gap').map(n => n.id));
    const gapsTo = new Set(graphTo.nodes.filter(n => n.type === 'gap').map(n => n.id));

    // Compute changes
    const newEndpoints = [...endpointsTo].filter(id => !endpointsFrom.has(id)).length;
    const removedEndpoints = [...endpointsFrom].filter(id => !endpointsTo.has(id)).length;
    const newGaps = [...gapsTo].filter(id => !gapsFrom.has(id)).length;
    const resolvedGaps = [...gapsFrom].filter(id => !gapsTo.has(id)).length;

    const coverageFrom = reportFrom.statistics.coverageRatio;
    const coverageTo = reportTo.statistics.coverageRatio;
    const coverageChange = Math.round((coverageTo - coverageFrom) * 100) / 100;

    // Determine trend
    let trend: 'IMPROVING' | 'DEGRADING' | 'STABLE';
    if (coverageChange > 0.01) {
      trend = 'IMPROVING';
    } else if (coverageChange < -0.01) {
      trend = 'DEGRADING';
    } else {
      trend = 'STABLE';
    }

    return {
      runIdFrom: '',
      runIdTo: '',
      timestamp,
      trend,
      statistics: {
        newEndpoints,
        removedEndpoints,
        newGaps,
        resolvedGaps,
        coverageChange,
      },
    };
  }

  /**
   * Validate delta: ensure it makes logical sense.
   */
  validateDelta(delta: Delta): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!delta.runIdFrom || !delta.runIdTo) {
      errors.push('runIdFrom and runIdTo are required');
    }

    if (!['IMPROVING', 'DEGRADING', 'STABLE'].includes(delta.trend)) {
      errors.push(`Invalid trend: ${delta.trend}`);
    }

    if (delta.statistics.newEndpoints < 0 || delta.statistics.removedEndpoints < 0) {
      errors.push('Endpoint counts cannot be negative');
    }

    if (delta.statistics.newGaps < 0 || delta.statistics.resolvedGaps < 0) {
      errors.push('Gap counts cannot be negative');
    }

    // Consistency check: trend should match coverage change
    const coverageChange = delta.statistics.coverageChange;
    if (
      (delta.trend === 'IMPROVING' && coverageChange <= 0.01) ||
      (delta.trend === 'DEGRADING' && coverageChange >= -0.01)
    ) {
      errors.push(
        `Trend (${delta.trend}) does not match coverage change (${coverageChange})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
