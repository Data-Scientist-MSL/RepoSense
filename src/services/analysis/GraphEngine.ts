/**
 * Sprint 1: Knowledge Graph Engine
 * 
 * Transforms file-level analysis into repository-level understanding.
 * Builds a dependency graph to identify critical components and impact zones.
 */

import * as fs from 'fs';
import * as path from 'path';
import { GapItem, Endpoint, APICall } from '../../models/types';

export enum NodeType {
    FILE = 'file',
    FUNCTION = 'function',
    CLASS = 'class',
    ENDPOINT = 'endpoint',
    COMPONENT = 'component'
}

export interface GraphNode {
    id: string;
    type: NodeType;
    name: string;
    filePath: string;
    metadata: {
        lineCount?: number;
        complexity?: number;
        lastModified?: number;
    };
    criticalityScore: number;  // 0-100, computed via PageRank
}

export interface GraphEdge {
    from: string;  // node id
    to: string;    // node id
    type: 'imports' | 'calls' | 'extends' | 'references';
    weight: number;  // 1-10, based on frequency/importance
}

export interface DependencyGraph {
    nodes: Map<string, GraphNode>;
    edges: GraphEdge[];
    metadata: {
        totalNodes: number;
        totalEdges: number;
        maxDepth: number;
        generatedAt: number;
    };
}

export class GraphEngine {
    private graph: DependencyGraph;

    constructor() {
        this.graph = {
            nodes: new Map(),
            edges: [],
            metadata: {
                totalNodes: 0,
                totalEdges: 0,
                maxDepth: 0,
                generatedAt: Date.now()
            }
        };
    }

    /**
     * Build dependency graph from analysis results
     */
    public buildGraph(
        gaps: GapItem[],
        endpoints: Endpoint[],
        apiCalls: APICall[]
    ): DependencyGraph {
        console.log('GraphEngine: Building dependency graph...');

        // Phase 1: Create nodes from endpoints
        for (const endpoint of endpoints) {
            this.addNode({
                id: `endpoint:${endpoint.path}:${endpoint.method}`,
                type: NodeType.ENDPOINT,
                name: `${endpoint.method} ${endpoint.path}`,
                filePath: endpoint.file,
                metadata: {
                    lineCount: 1
                },
                criticalityScore: 0
            });
        }

        // Phase 2: Create nodes from API calls
        for (const call of apiCalls) {
            const callId = `call:${call.file}:${call.line}`;
            this.addNode({
                id: callId,
                type: NodeType.COMPONENT,
                name: `${call.method} ${call.endpoint}`,
                filePath: call.file,
                metadata: {
                    lineCount: 1
                },
                criticalityScore: 0
            });

            // Create edge: component -> endpoint
            const endpointId = `endpoint:${call.endpoint}:${call.method}`;
            if (this.graph.nodes.has(endpointId)) {
                this.addEdge({
                    from: callId,
                    to: endpointId,
                    type: 'calls',
                    weight: 5
                });
            }
        }

        // Phase 3: Compute criticality scores (simplified PageRank)
        this.computeCriticalityScores();

        // Update metadata
        this.graph.metadata.totalNodes = this.graph.nodes.size;
        this.graph.metadata.totalEdges = this.graph.edges.length;
        this.graph.metadata.generatedAt = Date.now();

        console.log(`GraphEngine: Built graph with ${this.graph.nodes.size} nodes, ${this.graph.edges.length} edges`);
        return this.graph;
    }

    /**
     * Add node to graph
     */
    private addNode(node: GraphNode): void {
        if (!this.graph.nodes.has(node.id)) {
            this.graph.nodes.set(node.id, node);
        }
    }

    /**
     * Add edge to graph
     */
    private addEdge(edge: GraphEdge): void {
        this.graph.edges.push(edge);
    }

    /**
     * Compute criticality scores using simplified PageRank
     */
    private computeCriticalityScores(): void {
        const dampingFactor = 0.85;
        const iterations = 10;
        const nodeCount = this.graph.nodes.size;

        if (nodeCount === 0) return;

        // Initialize all scores to 1/N
        const scores = new Map<string, number>();
        for (const [id] of this.graph.nodes) {
            scores.set(id, 1.0 / nodeCount);
        }

        // Build adjacency list (incoming edges)
        const incomingEdges = new Map<string, string[]>();
        for (const edge of this.graph.edges) {
            if (!incomingEdges.has(edge.to)) {
                incomingEdges.set(edge.to, []);
            }
            incomingEdges.get(edge.to)!.push(edge.from);
        }

        // Iterate PageRank
        for (let i = 0; i < iterations; i++) {
            const newScores = new Map<string, number>();

            for (const [nodeId] of this.graph.nodes) {
                let score = (1 - dampingFactor) / nodeCount;

                const incoming = incomingEdges.get(nodeId) || [];
                for (const sourceId of incoming) {
                    const sourceScore = scores.get(sourceId) || 0;
                    const outgoingCount = this.graph.edges.filter(e => e.from === sourceId).length;
                    if (outgoingCount > 0) {
                        score += dampingFactor * (sourceScore / outgoingCount);
                    }
                }

                newScores.set(nodeId, score);
            }

            scores.clear();
            for (const [id, score] of newScores) {
                scores.set(id, score);
            }
        }

        // Normalize scores to 0-100 and update nodes
        const maxScore = Math.max(...Array.from(scores.values()));
        for (const [nodeId, score] of scores) {
            const node = this.graph.nodes.get(nodeId);
            if (node) {
                node.criticalityScore = maxScore > 0 ? (score / maxScore) * 100 : 0;
            }
        }
    }

    /**
     * Get most critical nodes
     */
    public getCriticalNodes(limit: number = 10): GraphNode[] {
        return Array.from(this.graph.nodes.values())
            .sort((a, b) => b.criticalityScore - a.criticalityScore)
            .slice(0, limit);
    }

    /**
     * Find impact zone for a given node
     */
    public getImpactZone(nodeId: string): GraphNode[] {
        const impacted = new Set<string>();
        const queue = [nodeId];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (impacted.has(current)) continue;
            impacted.add(current);

            // Find all nodes that depend on current
            const dependents = this.graph.edges
                .filter(e => e.from === current)
                .map(e => e.to);

            queue.push(...dependents);
        }

        return Array.from(impacted)
            .map(id => this.graph.nodes.get(id))
            .filter((node): node is GraphNode => node !== undefined);
    }

    /**
     * Export graph as JSON
     */
    public exportGraph(): string {
        return JSON.stringify({
            nodes: Array.from(this.graph.nodes.values()),
            edges: this.graph.edges,
            metadata: this.graph.metadata
        }, null, 2);
    }

    /**
     * Get current graph
     */
    public getGraph(): DependencyGraph {
        return this.graph;
    }
}
