/**
 * GraphBuilder.ts (Sprint 10 - Days 2-3)
 * 
 * Transforms analyzer output (scan.json) into canonical graph.json with stable IDs.
 * CRITICAL: Stable IDs must be deterministic (same across 5 consecutive scans).
 * 
 * Stable ID algorithm: SHA256(type|method|normalized_path|line)
 * - No timestamps, no file order, no randomness
 * - Windows path normalization: backslash -> forward slash, lowercase
 */

import * as crypto from 'crypto';
import { AnalysisResult, APICall, Endpoint } from '../../models/types';

export interface GraphNode {
  id: string;
  type: 'endpoint' | 'call';
  method?: string;
  path: string;
  file: string;
  line: number;
  isOrphan: boolean;
  normalized_path: string;
}

export interface GraphEdge {
  id: string;
  from: string; // nodeId of call
  to: string; // nodeId of endpoint
  type: 'api_call';
  confidence: number; // 0-1, how confident is the match
}

export interface Graph {
  version: string;
  generatedAt: string;
  nodeCount: number;
  edgeCount: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics: {
    totalEndpoints: number;
    totalCallSites: number;
    orphanCount: number;
    connectedEdges: number;
  };
}

export class GraphBuilder {
  /**
   * Main entry point: transform analyzer result into canonical graph.
   */
  buildGraph(analysisResult: AnalysisResult): Graph {
    // Extract endpoints
    const endpointNodes = analysisResult.endpoints.map(ep =>
      this.createEndpointNode(ep)
    );

    // Extract calls
    const callNodes = analysisResult.apiCalls.map(call =>
      this.createCallNode(call)
    );

    // Build endpoint ID map for quick lookup
    const endpointMap = new Map(endpointNodes.map(n => [n.id, n]));
    const callMap = new Map(callNodes.map(n => [n.id, n]));

    // Match calls to endpoints
    const edges: GraphEdge[] = [];
    for (const callNode of callNodes) {
      const matchedEndpoints = this.findMatchingEndpoints(callNode, endpointNodes);

      if (matchedEndpoints.length > 0) {
        // Create edges to matched endpoints
        for (const endpoint of matchedEndpoints) {
          edges.push({
            id: this.generateEdgeId(callNode.id, endpoint.id),
            from: callNode.id,
            to: endpoint.id,
            type: 'api_call',
            confidence: 0.95, // High confidence for matched pairs
          });

          // Mark both as not orphan
          callNode.isOrphan = false;
          endpoint.isOrphan = false;
        }
      }
    }

    // All remaining nodes with isOrphan=true are unmatched

    const allNodes = [...endpointNodes, ...callNodes];
    const orphanCount = allNodes.filter(n => n.isOrphan).length;

    return {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      nodeCount: allNodes.length,
      edgeCount: edges.length,
      nodes: allNodes,
      edges,
      statistics: {
        totalEndpoints: endpointNodes.length,
        totalCallSites: callNodes.length,
        orphanCount,
        connectedEdges: edges.length,
      },
    };
  }

  /**
   * Create endpoint node with stable ID.
   */
  private createEndpointNode(endpoint: Endpoint): GraphNode {
    const normalized = this.normalizePath(endpoint.path);
    const id = this.generateStableId('endpoint', endpoint.method, normalized, endpoint.line);

    return {
      id,
      type: 'endpoint',
      method: endpoint.method,
      path: endpoint.path,
      file: endpoint.file,
      line: endpoint.line,
      isOrphan: true, // Start as orphan; set to false if matched
      normalized_path: normalized,
    };
  }

  /**
   * Create call node with stable ID.
   */
  private createCallNode(call: APICall): GraphNode {
    const normalized = this.normalizePath(call.endpoint);
    const id = this.generateStableId('call', call.method, normalized, call.line);

    return {
      id,
      type: 'call',
      method: call.method,
      path: call.endpoint,
      file: call.file,
      line: call.line,
      isOrphan: true, // Start as orphan; set to false if matched
      normalized_path: normalized,
    };
  }

  /**
   * Generate stable ID: SHA256(type|method|normalized_path|line).
   * CRITICAL: Must be deterministic across runs.
   */
  private generateStableId(
    type: string,
    method: string,
    normalizedPath: string,
    line: number
  ): string {
    const input = `${type}|${method}|${normalizedPath}|${line}`;
    const hash = crypto
      .createHash('sha256')
      .update(input)
      .digest('hex');

    // Format: node-<12-char-prefix>
    return `node-${hash.substring(0, 12)}`;
  }

  /**
   * Generate edge ID from call and endpoint node IDs.
   */
  private generateEdgeId(callId: string, endpointId: string): string {
    const input = `${callId}|${endpointId}`;
    const hash = crypto
      .createHash('sha256')
      .update(input)
      .digest('hex');

    return `edge-${hash.substring(0, 12)}`;
  }

  /**
   * Normalize path: Windows-safe (backslash -> forward slash, lowercase, no drive letters).
   */
  private normalizePath(originalPath: string): string {
    // Remove drive letters (C:/, D:/, etc.)
    let normalized = originalPath.replace(/^[a-zA-Z]:/, '');

    // Convert backslashes to forward slashes
    normalized = normalized.replace(/\\/g, '/');

    // Lowercase for case-insensitive matching
    normalized = normalized.toLowerCase();

    // Remove leading/trailing slashes
    normalized = normalized.replace(/^\/+/, '').replace(/\/+$/, '');

    return normalized;
  }

  /**
   * Find endpoints matching a given call.
   * Matches on: path and method.
   */
  private findMatchingEndpoints(callNode: GraphNode, endpoints: GraphNode[]): GraphNode[] {
    return endpoints.filter(ep => {
      // Method must match exactly
      if (ep.method?.toUpperCase() !== callNode.method?.toUpperCase()) {
        return false;
      }

      // Normalize both paths and compare
      const callPath = this.normalizePath(callNode.path);
      const epPath = this.normalizePath(ep.path);

      // Exact match
      if (callPath === epPath) {
        return true;
      }

      // Path parameter matching: /users/:id vs /users/{id}
      if (this.pathsMatch(callPath, epPath)) {
        return true;
      }

      return false;
    });
  }

  /**
   * Check if two paths match, accounting for parameter syntax variations.
   * Examples:
   * - /users/:id === /users/{id}
   * - /users/{id} === /users/{id:\d+}
   * - /search?q=foo === /search (query strings ignored)
   */
  private pathsMatch(path1: string, path2: string): boolean {
    // Remove query strings
    path1 = path1.split('?')[0];
    path2 = path2.split('?')[0];

    // Extract path segments
    const seg1 = path1.split('/').filter(s => s);
    const seg2 = path2.split('/').filter(s => s);

    // Must have same number of segments
    if (seg1.length !== seg2.length) {
      return false;
    }

    // Check each segment
    for (let i = 0; i < seg1.length; i++) {
      const s1 = seg1[i];
      const s2 = seg2[i];

      // Both are parameter placeholders
      if (this.isParameter(s1) && this.isParameter(s2)) {
        continue;
      }

      // Exact match
      if (s1 === s2) {
        continue;
      }

      // No match
      return false;
    }

    return true;
  }

  /**
   * Check if a segment is a path parameter.
   * Examples: :id, {id}, {id:\d+}
   */
  private isParameter(segment: string): boolean {
    return segment.startsWith(':') || segment.startsWith('{');
  }
}
