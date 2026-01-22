/**
 * ArtifactReader.ts (Sprint 11 - Day 1)
 * 
 * Typed accessors for all artifacts in .reposense/runs/<runId>/
 * Used by UI providers to eliminate recompute and data duplication.
 */

import * as path from 'path';
import * as fs from 'fs';

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
    totalEndpoints: number;
    coveredEndpoints: number;
    orphanEndpoints: number;
    totalGaps: number;
    criticalGaps: number;
    coverageRatio: number;
  };
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendations: {
    priority: number;
    category: string;
    description: string;
  }[];
}

export interface DiagramsIndex {
  generated: string;
  diagrams: {
    name: string;
    file: string;
    description: string;
  }[];
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

export class ArtifactReader {
  private runsDir: string;

  constructor(workspaceRoot: string) {
    this.runsDir = path.join(workspaceRoot, '.reposense', 'runs');
  }

  /**
   * Read scan.json for a run.
   * This is the raw AnalysisResult output from AnalysisEngine.
   */
  async readScan(runId: string): Promise<Record<string, unknown>> {
    const scanPath = path.join(this.runsDir, runId, 'scan.json');
    return this.readJsonFile(scanPath);
  }

  /**
   * Read graph.json for a run.
   * Contains normalized endpoints with stable IDs and all discovered gaps.
   */
  async readGraph(runId: string): Promise<Graph> {
    const graphPath = path.join(this.runsDir, runId, 'graph.json');
    return this.readJsonFile(graphPath) as Promise<Graph>;
  }

  /**
   * Read report.json for a run.
   * Contains statistics, severity, and recommendations.
   */
  async readReport(runId: string): Promise<Report> {
    const reportPath = path.join(this.runsDir, runId, 'report.json');
    return this.readJsonFile(reportPath) as Promise<Report>;
  }

  /**
   * Read diagrams index for a run.
   */
  async readDiagramsIndex(runId: string): Promise<DiagramsIndex> {
    const indexPath = path.join(this.runsDir, runId, 'diagrams', 'index.json');
    return this.readJsonFile(indexPath) as Promise<DiagramsIndex>;
  }

  /**
   * Read a specific .mmd diagram file.
   */
  async readDiagram(runId: string, diagramFile: string): Promise<string> {
    const diagramPath = path.join(this.runsDir, runId, 'diagrams', diagramFile);

    if (!fs.existsSync(diagramPath)) {
      throw new Error(`Diagram not found: ${diagramFile}`);
    }

    return fs.readFileSync(diagramPath, 'utf-8');
  }

  /**
   * Read delta.json if it exists for a run.
   * Delta contains comparison with previous run and trend analysis.
   */
  async readDelta(runId: string): Promise<Delta | null> {
    const deltaPath = path.join(this.runsDir, runId, 'delta.json');

    if (!fs.existsSync(deltaPath)) {
      return null;
    }

    try {
      return this.readJsonFile(deltaPath) as Promise<Delta>;
    } catch {
      return null;
    }
  }

  /**
   * Check if a run has all required artifacts.
   */
  async isRunComplete(runId: string): Promise<boolean> {
    try {
      const runDir = path.join(this.runsDir, runId);

      if (!fs.existsSync(runDir)) {
        return false;
      }

      const required = ['scan.json', 'graph.json', 'report.json', 'diagrams/index.json'];

      for (const file of required) {
        if (!fs.existsSync(path.join(runDir, file))) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get artifact directory for a run (for file-based operations).
   */
  getRunArtifactDir(runId: string): string {
    return path.join(this.runsDir, runId);
  }

  /**
   * Private helper: read and parse JSON file.
   */
  private readJsonFile(filePath: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        reject(new Error(`File not found: ${filePath}`));
        return;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        resolve(data as Record<string, unknown>);
      } catch (error) {
        reject(new Error(`Failed to read JSON file ${filePath}: ${error}`));
      }
    });
  }
}
