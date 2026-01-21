/**
 * DiagramGenerator Service (Sprint 4)
 * Generates deterministic architecture diagrams from graph data
 * Three types: System Context, API Flow, Coverage Map
 */

import * as crypto from 'crypto';

export enum DiagramType {
  SYSTEM_CONTEXT = 'system-context',
  API_FLOW = 'api-flow',
  COVERAGE_MAP = 'coverage-map',
}

export interface DiagramNode {
  id: string;
  label: string;
  type: string;
  metadata?: Record<string, any>;
}

export interface DiagramExport {
  type: DiagramType;
  mermaid: string;
  svg?: string;
  png?: string;
  mtime: number;
  checksum: string;
}

export interface DiagramRegistry {
  diagrams: Record<DiagramType, {
    file: string;
    mtime: number;
    checksum: string;
    nodes: DiagramNode[];
    clickable: boolean;
  }>;
  exports: Record<DiagramType, {
    svg?: string;
    png?: string;
    mtime: number;
  }>;
  metadata: {
    generatedAt: string;
    version: string;
    graphChecksum: string;
  };
}

/**
 * Generates deterministic architecture diagrams from graph
 */
export class DiagramGenerator {
  private runId: string;
  private graphData: any;
  private nodes: Map<string, DiagramNode> = new Map();

  constructor(runId: string, graphData: any) {
    this.runId = runId;
    this.graphData = graphData;
    this.indexGraphNodes();
  }

  /**
   * Index graph nodes for quick lookup
   */
  private indexGraphNodes(): void {
    if (!this.graphData.nodes) return;

    for (const node of this.graphData.nodes) {
      this.nodes.set(node.id, node);
    }
  }

  /**
   * Calculate deterministic checksum for Mermaid content
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 12);
  }

  /**
   * Generate System Context diagram (modules + interactions)
   */
  generateSystemContext(): DiagramExport {
    const endpoints = this.graphData.nodes?.filter((n: any) => n.type === 'BACKEND_ENDPOINT') || [];
    const modules = new Set<string>();

    // Collect modules
    for (const endpoint of endpoints) {
      const moduleName = this.extractModule(endpoint.metadata?.file || '');
      if (moduleName) modules.add(moduleName);
    }

    // Build Mermaid
    let mermaid = 'graph TB\n';
    mermaid += '  subgraph Frontend["Frontend Layer"]\n';
    mermaid += '    FE["Frontend Components"]\n';
    mermaid += '  end\n';
    mermaid += '  subgraph Backend["Backend Services"]\n';

    let callCount = 0;
    for (const module of Array.from(modules)) {
      const safeModule = module.replace(/[^a-z0-9]/gi, '_');
      mermaid += `    ${safeModule}["${module}"]\n`;
      callCount++;
    }

    mermaid += '  end\n';
    mermaid += '  FE -->|API Calls| Backend\n';
    mermaid += `  %% Contains ${endpoints.length} endpoints\n`;

    const checksum = this.calculateChecksum(mermaid);

    return {
      type: DiagramType.SYSTEM_CONTEXT,
      mermaid,
      mtime: Date.now(),
      checksum,
    };
  }

  /**
   * Generate API Flow diagram (sequence: frontend → backend → test)
   */
  generateAPIFlow(): DiagramExport {
    const topEndpoint = this.graphData.nodes
      ?.filter((n: any) => n.type === 'BACKEND_ENDPOINT')
      ?.[0];

    let mermaid = 'sequenceDiagram\n';
    mermaid += '  participant Frontend\n';
    mermaid += '  participant Backend\n';
    mermaid += '  participant Database\n';
    mermaid += '  participant Test\n\n';

    if (topEndpoint) {
      const method = topEndpoint.metadata?.method || 'GET';
      const path = topEndpoint.metadata?.path || '/api';
      const auth = topEndpoint.metadata?.auth ? 'with auth' : 'no auth';

      mermaid += `  Frontend->>Backend: ${method} ${path}\n`;
      mermaid += `  Note over Backend: ${auth}\n`;
      mermaid += '  Backend->>Database: Query\n';
      mermaid += '  Database->>Backend: Result\n';
      mermaid += '  Backend->>Frontend: Response\n';
      mermaid += '  Test->>Backend: Verify Response\n';
    }

    const checksum = this.calculateChecksum(mermaid);

    return {
      type: DiagramType.API_FLOW,
      mermaid,
      mtime: Date.now(),
      checksum,
    };
  }

  /**
   * Generate Coverage Map diagram (modules colored by test coverage)
   */
  generateCoverageMap(): DiagramExport {
    const endpoints = this.graphData.nodes?.filter((n: any) => n.type === 'BACKEND_ENDPOINT') || [];
    const gaps = this.graphData.nodes?.filter((n: any) => n.type === 'GAP') || [];

    // Calculate coverage per module
    const coverageByModule = new Map<string, { total: number; untested: number }>();

    for (const endpoint of endpoints) {
      const module = this.extractModule(endpoint.metadata?.file || '');
      if (!module) continue;

      if (!coverageByModule.has(module)) {
        coverageByModule.set(module, { total: 0, untested: 0 });
      }

      const stats = coverageByModule.get(module)!;
      stats.total++;

      // Check if this endpoint has gaps
      const hasGap = gaps.some((g: any) => g.metadata?.endpoint === endpoint.metadata?.path);
      if (hasGap) stats.untested++;
    }

    // Build Mermaid
    let mermaid = 'graph TB\n';
    mermaid += '  classDef green fill:#10b981,stroke:#059669,color:#fff\n';
    mermaid += '  classDef orange fill:#f59e0b,stroke:#d97706,color:#fff\n';
    mermaid += '  classDef red fill:#ef4444,stroke:#dc2626,color:#fff\n\n';

    let moduleIndex = 0;
    for (const [module, stats] of coverageByModule.entries()) {
      const safeName = module.replace(/[^a-z0-9]/gi, '_');
      const coverage = stats.total > 0 ? (stats.total - stats.untested) / stats.total : 0;

      let cssClass = 'green';
      if (coverage < 0.3) cssClass = 'red';
      else if (coverage < 0.7) cssClass = 'orange';

      mermaid += `  M${moduleIndex}["${module}<br/>${Math.round(coverage * 100)}%"]::${cssClass}\n`;
      moduleIndex++;
    }

    const checksum = this.calculateChecksum(mermaid);

    return {
      type: DiagramType.COVERAGE_MAP,
      mermaid,
      mtime: Date.now(),
      checksum,
    };
  }

  /**
   * Generate all diagrams and registry
   */
  generateAll(): DiagramRegistry {
    const systemContext = this.generateSystemContext();
    const apiFlow = this.generateAPIFlow();
    const coverageMap = this.generateCoverageMap();

    return {
      diagrams: {
        [DiagramType.SYSTEM_CONTEXT]: {
          file: 'diagrams/system-context.mmd',
          mtime: systemContext.mtime,
          checksum: systemContext.checksum,
          nodes: Array.from(this.nodes.values()),
          clickable: true,
        },
        [DiagramType.API_FLOW]: {
          file: 'diagrams/api-flow.mmd',
          mtime: apiFlow.mtime,
          checksum: apiFlow.checksum,
          nodes: Array.from(this.nodes.values()),
          clickable: true,
        },
        [DiagramType.COVERAGE_MAP]: {
          file: 'diagrams/coverage-map.mmd',
          mtime: coverageMap.mtime,
          checksum: coverageMap.checksum,
          nodes: Array.from(this.nodes.values()),
          clickable: false,
        },
      },
      exports: {
        [DiagramType.SYSTEM_CONTEXT]: { mtime: Date.now() },
        [DiagramType.API_FLOW]: { mtime: Date.now() },
        [DiagramType.COVERAGE_MAP]: { mtime: Date.now() },
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        graphChecksum: this.calculateChecksum(JSON.stringify(this.graphData)),
      },
    };
  }

  /**
   * Extract module name from file path
   */
  private extractModule(filePath: string): string {
    const parts = filePath.split('/');
    if (parts.length > 1) {
      return parts[1]; // src/routes/users.ts → routes
    }
    return parts[0].replace('.ts', '');
  }

  /**
   * Get clickable nodes from diagram
   */
  getClickableNodes(diagramType: DiagramType): DiagramNode[] {
    if (diagramType === DiagramType.COVERAGE_MAP) {
      return [];
    }

    return Array.from(this.nodes.values()).filter(
      (n) => n.type === 'BACKEND_ENDPOINT' || n.type === 'FRONTEND_CALL'
    );
  }

  /**
   * Resolve click target to file location
   */
  resolveClickTarget(nodeId: string): { file: string; line: number } | null {
    const node = this.nodes.get(nodeId);
    if (!node || !node.metadata) return null;

    return {
      file: node.metadata.file || '',
      line: node.metadata.line || 0,
    };
  }
}

export default DiagramGenerator;
