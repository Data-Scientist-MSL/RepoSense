/**
 * DiagramBuilder.ts (Sprint 10 - Day 5)
 * 
 * Transforms graph.json into Mermaid diagram files (.mmd).
 * Generates: api-overview.mmd, call-flow.mmd, orphan-analysis.mmd
 */

import { Graph } from './GraphBuilder';

export interface DiagramsIndex {
  generatedAt: string;
  diagrams: Array<{
    name: string;
    file: string;
    title: string;
    description: string;
  }>;
}

export class DiagramBuilder {
  /**
   * Build diagrams from graph.
   */
  buildDiagrams(graph: Graph): { diagrams: DiagramsIndex; files: Map<string, string> } {
    const files = new Map<string, string>();

    // Generate each diagram
    const apiOverview = this.generateAPIOverview(graph);
    files.set('api-overview.mmd', apiOverview);

    const callFlow = this.generateCallFlow(graph);
    files.set('call-flow.mmd', callFlow);

    const orphanAnalysis = this.generateOrphanAnalysis(graph);
    files.set('orphan-analysis.mmd', orphanAnalysis);

    // Create index
    const index: DiagramsIndex = {
      generatedAt: new Date().toISOString(),
      diagrams: [
        {
          name: 'api-overview',
          file: 'api-overview.mmd',
          title: 'API Overview',
          description: 'Graph of all endpoints and calls with coverage',
        },
        {
          name: 'call-flow',
          file: 'call-flow.mmd',
          title: 'Call Flow',
          description: 'Sequence of API calls in the application',
        },
        {
          name: 'orphan-analysis',
          file: 'orphan-analysis.mmd',
          title: 'Orphan Analysis',
          description: 'Unused endpoints and unmatched calls',
        },
      ],
    };

    return { diagrams: index, files };
  }

  /**
   * Generate API overview diagram (graph structure).
   */
  private generateAPIOverview(graph: Graph): string {
    let mermaid = 'graph LR\n';

    // Add endpoint nodes
    const endpoints = graph.nodes.filter(n => n.type === 'endpoint');
    for (const ep of endpoints.slice(0, 10)) {
      // Limit to first 10 for readability
      const label = `${ep.method} ${ep.path}`;
      const color = ep.isOrphan ? 'fill:#ff6b6b' : 'fill:#51cf66';
      mermaid += `  ${ep.id.replace('-', '_')}["${label}"]:::ep\n`;
    }

    // Add call nodes
    const calls = graph.nodes.filter(n => n.type === 'call');
    for (const call of calls.slice(0, 10)) {
      const label = `${call.method} ${call.path}`;
      const color = call.isOrphan ? 'fill:#ffd43b' : 'fill:#94d82d';
      mermaid += `  ${call.id.replace('-', '_')}["${label}"]:::call\n`;
    }

    // Add edges
    for (const edge of graph.edges.slice(0, 10)) {
      const fromId = edge.from.replace('-', '_');
      const toId = edge.to.replace('-', '_');
      mermaid += `  ${fromId} -->|matched| ${toId}\n`;
    }

    // Styling
    mermaid += '\n';
    mermaid += '  classDef ep fill:#51cf66,color:#000\n';
    mermaid += '  classDef epOrphan fill:#ff6b6b,color:#fff\n';
    mermaid += '  classDef call fill:#94d82d,color:#000\n';
    mermaid += '  classDef callOrphan fill:#ffd43b,color:#000\n';

    return mermaid;
  }

  /**
   * Generate call flow diagram (sequence-like).
   */
  private generateCallFlow(graph: Graph): string {
    let mermaid = 'graph TD\n';

    const callNodes = graph.nodes.filter(n => n.type === 'call');
    const endpointNodes = graph.nodes.filter(n => n.type === 'endpoint');

    // Show first few calls and their targets
    for (const call of callNodes.slice(0, 5)) {
      const callLabel = `Call: ${call.method} ${call.path}`;
      mermaid += `  ${call.id.replace('-', '_')}["${callLabel}"]\n`;

      // Find matching edges
      for (const edge of graph.edges.filter(e => e.from === call.id).slice(0, 2)) {
        const targetNode = endpointNodes.find(n => n.id === edge.to);
        if (targetNode) {
          const epLabel = `${targetNode.method} ${targetNode.path}`;
          mermaid += `  ${edge.to.replace('-', '_')}["${epLabel}"]\n`;
          mermaid += `  ${call.id.replace('-', '_')} -->|calls| ${edge.to.replace('-', '_')}\n`;
        }
      }
    }

    return mermaid;
  }

  /**
   * Generate orphan analysis diagram (gaps visualization).
   */
  private generateOrphanAnalysis(graph: Graph): string {
    let mermaid = 'graph LR\n';

    mermaid += '  subgraph orphan_endpoints ["Orphaned Endpoints"]\n';
    const orphanEps = graph.nodes.filter(n => n.type === 'endpoint' && n.isOrphan).slice(0, 5);
    for (const ep of orphanEps) {
      mermaid += `    ${ep.id.replace('-', '_')}["${ep.method} ${ep.path}"]\n`;
    }
    mermaid += '  end\n\n';

    mermaid += '  subgraph orphan_calls ["Unmatched Calls"]\n';
    const orphanCalls = graph.nodes.filter(n => n.type === 'call' && n.isOrphan).slice(0, 5);
    for (const call of orphanCalls) {
      mermaid += `    ${call.id.replace('-', '_')}["${call.method} ${call.path}"]\n`;
    }
    mermaid += '  end\n\n';

    mermaid += `  info["Coverage: ${(graph.statistics.connectedEdges / Math.max(graph.statistics.totalCallSites, 1) * 100).toFixed(1)}%"]\n`;

    return mermaid;
  }
}
