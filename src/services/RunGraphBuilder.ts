/**
 * RunGraphBuilder Service
 * =======================
 * 
 * Builds the canonical Run Graph from analysis results.
 * Single source of truth for reports, diagrams, and evidence tracing.
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  RunGraph,
  GraphNode,
  GraphEdge,
  GraphMetadata,
} from '../models/ReportAndDiagramModels';

/**
 * RunGraphBuilder
 * 
 * Takes analysis results and produces a normalized, queryable graph.json
 * TODO: Implement when AnalysisEngine types are finalized
 */
export class RunGraphBuilder {
  private runId: string;
  private timestamp: string;
  private repositoryRoot: string;
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private nodeCounter = 0;
  private edgeCounter = 0;

  constructor(
    runId: string,
    repositoryRoot: string,
    timestamp?: string
  ) {
    this.runId = runId;
    this.repositoryRoot = repositoryRoot;
    this.timestamp = timestamp || new Date().toISOString();
  }

  /**
   * Main entry point: build complete graph from analysis
   */
  async buildGraph(): Promise<RunGraph> {
    // TODO: Implement graph building from analysis results
    const metadata = this.buildMetadata();

    const graph: RunGraph = {
      runId: this.runId,
      timestamp: this.timestamp,
      repositoryRoot: this.repositoryRoot,
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      metadata,
    };

    return graph;
  }

  /**
   * Build metadata
   */
  private buildMetadata(): GraphMetadata {
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      statistics: {
        totalEndpoints: 0,
        usedEndpoints: 0,
        unusedEndpoints: 0,
        untestedEndpoints: 0,
        totalTests: 0,
        totalGaps: 0,
        endpointCoveragePercent: 0,
        linesOfCodeAnalyzed: 0,
      },
      sourceAnalysis: {
        analysisEngine: 'BackendAnalyzer + FrontendAnalyzer',
        timestamp: this.timestamp,
        durationMs: 0,
      },
      quality: {
        astCoveragePercent: 0,
        normalizationConfidence: 0.87,
        notes: [],
      },
    };
  }

  /**
   * Save graph to file
   */
  async saveGraph(graph: RunGraph, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
  }

  /**
   * Helper: normalize ID
   */
  private normalizeId(id: string): string {
    return id.toLowerCase().replace(/[^a-z0-9\-]/g, '-');
  }

  /**
   * Helper: generate unique node ID
   */
  private generateNodeId(prefix: string): string {
    return `${prefix}-${this.runId}-${++this.nodeCounter}`;
  }

  /**
   * Helper: generate unique edge ID
   */
  private generateEdgeId(): string {
    return `edge-${this.runId}-${++this.edgeCounter}`;
  }
}
