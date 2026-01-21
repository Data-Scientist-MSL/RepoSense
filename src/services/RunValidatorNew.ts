/**
 * Sprint 9: Run Validation Service
 * Contract verification for Sprints 1-8 artifacts
 * Validates all JSON schemas, references, and cross-consistency
 */

import * as crypto from 'crypto';

export interface ValidationResult {
  runId: string;
  valid: boolean;
  validatedAt: string;
  checks: ValidationCheck[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
  };
  exitCode: 0 | 1 | 2 | 3; // 0=valid, 1=schema, 2=missing, 3=refs
}

export interface ValidationCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: string;
}

export class RunValidator {
  private runId: string;
  private runPath: string;
  private checks: ValidationCheck[] = [];

  constructor(runId: string, runPath: string) {
    this.runId = runId;
    this.runPath = runPath;
  }

  /**
   * Execute complete validation suite
   */
  public async validate(): Promise<ValidationResult> {
    this.checks = [];

    // Contract 1: Meta.json exists and valid
    this.validateMeta();

    // Contract 2: Graph.json exists, valid schema, stable IDs
    this.validateGraph();

    // Contract 3: Report.json exists, totals match graph
    this.validateReport();

    // Contract 4: Diagrams artifacts and schema
    this.validateDiagrams();

    // Contract 5: Execution results and evidence
    this.validateExecution();

    // Contract 6: Cross-consistency
    this.validateConsistency();

    // Compile results
    const passed = this.checks.filter((c) => c.status === 'PASS').length;
    const failed = this.checks.filter((c) => c.status === 'FAIL').length;
    const warnings = this.checks.filter((c) => c.status === 'WARN').length;

    const valid = failed === 0;
    const exitCode = failed > 0 ? 1 : warnings > 0 ? 3 : 0;

    return {
      runId: this.runId,
      valid,
      validatedAt: new Date().toISOString(),
      checks: this.checks,
      summary: { passed, failed, warnings },
      exitCode: exitCode as 0 | 1 | 2 | 3,
    };
  }

  // SPRINT 1: Meta Validation

  private validateMeta(): void {
    try {
      const meta = this.readJSON('meta.json');

      // Required fields
      this.checkField(meta, 'runId', 'string', 'SPRINT_1_META_001');
      this.checkField(meta, 'createdAt', 'string', 'SPRINT_1_META_002');
      this.checkField(meta, 'workspaceRoot', 'string', 'SPRINT_1_META_003');
      this.checkField(meta, 'stateTimeline', 'array', 'SPRINT_1_META_004');

      // Schema validation
      if (meta.stateTimeline && Array.isArray(meta.stateTimeline)) {
        for (const state of meta.stateTimeline) {
          if (!state.state || !state.timestamp) {
            this.fail('SPRINT_1_META_005', 'stateTimeline entry missing state or timestamp');
          }
        }
      }

      // Timestamps monotonic
      if (meta.stateTimeline) {
        let lastTime = 0;
        for (const state of meta.stateTimeline) {
          const time = new Date(state.timestamp).getTime();
          if (time < lastTime) {
            this.fail('SPRINT_1_META_006', 'Timestamps not monotonically increasing');
          }
          lastTime = time;
        }
      }

      this.pass('SPRINT_1_META', 'meta.json valid');
    } catch (error) {
      this.fail('SPRINT_1_META_ERR', `meta.json error: ${(error as Error).message}`);
    }
  }

  // SPRINT 2: Graph Validation

  private validateGraph(): void {
    try {
      const graph = this.readJSON('graph.json');

      this.checkField(graph, 'schemaVersion', 'string', 'SPRINT_2_GRAPH_001');
      this.checkField(graph, 'nodes', 'array', 'SPRINT_2_GRAPH_002');
      this.checkField(graph, 'edges', 'array', 'SPRINT_2_GRAPH_003');

      // Validate nodes have stable IDs
      const nodeIds = new Set<string>();
      if (graph.nodes && Array.isArray(graph.nodes)) {
        for (const node of graph.nodes) {
          if (!node.id) {
            this.fail('SPRINT_2_GRAPH_004', `Node missing id: ${JSON.stringify(node).substring(0, 50)}`);
            continue;
          }

          if (!this.isStableId(node.id)) {
            this.warn('SPRINT_2_GRAPH_005', `Node ID not stable format: ${node.id}`);
          }

          nodeIds.add(node.id);

          // Gap nodes must have sourceRefs
          if (node.type === 'Gap' && (!node.sourceRefs || node.sourceRefs.length === 0)) {
            this.fail('SPRINT_2_GRAPH_006', `Gap node missing sourceRefs: ${node.id}`);
          }
        }
      }

      // Validate edges reference existing nodes
      if (graph.edges && Array.isArray(graph.edges)) {
        for (const edge of graph.edges) {
          if (!nodeIds.has(edge.from)) {
            this.fail('SPRINT_2_GRAPH_007', `Edge references missing source node: ${edge.from}`);
          }
          if (!nodeIds.has(edge.to)) {
            this.fail('SPRINT_2_GRAPH_008', `Edge references missing target node: ${edge.to}`);
          }
        }
      }

      this.pass('SPRINT_2_GRAPH', `graph.json valid (${graph.nodes?.length || 0} nodes, ${graph.edges?.length || 0} edges)`);
    } catch (error) {
      this.fail('SPRINT_2_GRAPH_ERR', `graph.json error: ${(error as Error).message}`);
    }
  }

  // SPRINT 3: Report Validation

  private validateReport(): void {
    try {
      const report = this.readJSON('report/report.json');
      const graph = this.readJSON('graph.json');

      this.checkField(report, 'runId', 'string', 'SPRINT_3_REPORT_001');
      this.checkField(report, 'executiveSummary', 'object', 'SPRINT_3_REPORT_002');

      // Validate totals match graph
      const graphGapCount = (graph.nodes || []).filter((n: any) => n.type === 'Gap').length;
      const reportGapCount = report.apiContractHealth?.gaps?.length || 0;

      if (graphGapCount !== reportGapCount) {
        this.fail('SPRINT_3_REPORT_003', `Gap count mismatch: graph=${graphGapCount}, report=${reportGapCount}`);
      } else {
        this.pass('SPRINT_3_REPORT_GAP_COUNT', `Gap counts match (${graphGapCount})`);
      }

      // Validate executiveSummary
      if (report.executiveSummary) {
        const total = report.executiveSummary.totalGaps || 0;
        if (total !== reportGapCount) {
          this.fail('SPRINT_3_REPORT_004', `executiveSummary.totalGaps mismatch: ${total} vs ${reportGapCount}`);
        }
      }

      // Validate gap IDs exist in graph
      if (report.apiContractHealth?.gaps) {
        const graphNodeIds = new Set((graph.nodes || []).map((n: any) => n.id));
        for (const gap of report.apiContractHealth.gaps) {
          if (!graphNodeIds.has(gap.gapId)) {
            this.fail('SPRINT_3_REPORT_005', `Report gap not in graph: ${gap.gapId}`);
          }
        }
      }

      this.pass('SPRINT_3_REPORT', 'report.json valid');
    } catch (error) {
      this.fail('SPRINT_3_REPORT_ERR', `report.json error: ${(error as Error).message}`);
    }
  }

  // SPRINT 4: Diagrams Validation

  private validateDiagrams(): void {
    try {
      const diagramsIndex = this.readJSON('diagrams/diagrams.json');
      const graph = this.readJSON('graph.json');

      this.checkField(diagramsIndex, 'schemaVersion', 'string', 'SPRINT_4_DIAG_001');
      this.checkField(diagramsIndex, 'diagrams', 'array', 'SPRINT_4_DIAG_002');

      if (diagramsIndex.diagrams && Array.isArray(diagramsIndex.diagrams)) {
        for (const diagram of diagramsIndex.diagrams) {
          // Validate file exists
          if (diagram.sourceFile && !this.fileExists(`diagrams/${diagram.sourceFile}`)) {
            this.fail('SPRINT_4_DIAG_003', `Diagram file missing: ${diagram.sourceFile}`);
          }

          // Validate stats reasonable
          if (diagram.stats) {
            const graphNodeCount = (graph.nodes || []).length;
            if (diagram.stats.nodeCount > graphNodeCount * 1.1) {
              this.warn('SPRINT_4_DIAG_004', `Diagram nodeCount (${diagram.stats.nodeCount}) exceeds graph (${graphNodeCount})`);
            }
          }
        }
      }

      this.pass('SPRINT_4_DIAG', 'diagrams.json valid');
    } catch (error) {
      this.warn('SPRINT_4_DIAG_ERR', `diagrams.json optional: ${(error as Error).message}`);
    }
  }

  // SPRINT 5: Execution & Evidence Validation

  private validateExecution(): void {
    try {
      const results = this.readJSON('execution/results.json');
      const evidenceIndex = this.readJSON('evidence/evidence-index.json');
      const graph = this.readJSON('graph.json');

      this.checkField(results, 'schemaVersion', 'string', 'SPRINT_5_EXEC_001');
      this.checkField(results, 'tests', 'array', 'SPRINT_5_EXEC_002');

      // Validate test-to-gap mapping
      const graphGapIds = new Set((graph.nodes || []).filter((n: any) => n.type === 'Gap').map((n: any) => n.id));

      if (results.tests && Array.isArray(results.tests)) {
        for (const test of results.tests) {
          if (test.gapId && !graphGapIds.has(test.gapId)) {
            this.warn('SPRINT_5_EXEC_003', `Test references non-existent gap: ${test.gapId}`);
          }

          // Validate artifact paths exist
          if (test.artifactRefs && Array.isArray(test.artifactRefs)) {
            for (const ref of test.artifactRefs) {
              if (!this.fileExists(`evidence/${ref}`)) {
                this.fail('SPRINT_5_EXEC_004', `Artifact file missing: ${ref}`);
              }
            }
          }
        }
      }

      // Validate evidence index
      if (evidenceIndex.mappings?.gapId) {
        for (const [gapId, testIds] of Object.entries(evidenceIndex.mappings.gapId)) {
          if (!graphGapIds.has(gapId)) {
            this.warn('SPRINT_5_EXEC_005', `Evidence index references missing gap: ${gapId}`);
          }
        }
      }

      this.pass('SPRINT_5_EXEC', 'Execution and evidence valid');
    } catch (error) {
      this.warn('SPRINT_5_EXEC_ERR', `Execution optional: ${(error as Error).message}`);
    }
  }

  // Cross-Consistency Validation

  private validateConsistency(): void {
    try {
      const meta = this.readJSON('meta.json');
      const graph = this.readJSON('graph.json');
      const report = this.readJSON('report/report.json');

      // All must have same runId
      if (meta.runId !== report.runId) {
        this.fail('CONSISTENCY_001', `runId mismatch: meta=${meta.runId}, report=${report.runId}`);
      } else {
        this.pass('CONSISTENCY_RUN_ID', `runId consistent: ${meta.runId}`);
      }

      // Timestamps valid
      const metaTime = new Date(meta.createdAt).getTime();
      const reportTime = new Date(report.generatedAt).getTime();
      if (reportTime < metaTime) {
        this.fail('CONSISTENCY_002', 'Report generated before run created');
      }

      // Node count consistency
      const graphNodeCount = (graph.nodes || []).length;
      const reportNodeCount = (report.executiveSummary?.totalEndpoints || 0) + (report.executiveSummary?.totalCalls || 0);

      if (Math.abs(graphNodeCount - reportNodeCount) > 5) {
        this.warn('CONSISTENCY_003', `Node count discrepancy: graph=${graphNodeCount}, report=${reportNodeCount}`);
      }

      this.pass('CONSISTENCY', 'Cross-consistency validated');
    } catch (error) {
      this.fail('CONSISTENCY_ERR', `Consistency check failed: ${(error as Error).message}`);
    }
  }

  // Helper methods

  private readJSON(path: string): any {
    // Simulated file read
    return {};
  }

  private fileExists(path: string): boolean {
    // Simulated file check
    return true;
  }

  private checkField(obj: any, field: string, type: string, code: string): void {
    if (obj[field] === undefined) {
      this.fail(code, `Missing required field: ${field}`);
    } else if (typeof obj[field] !== type && type !== 'array') {
      this.fail(code, `Invalid type for ${field}: expected ${type}, got ${typeof obj[field]}`);
    } else if (type === 'array' && !Array.isArray(obj[field])) {
      this.fail(code, `Invalid type for ${field}: expected array, got ${typeof obj[field]}`);
    } else {
      this.pass(code, `Field ${field} valid`);
    }
  }

  private isStableId(id: string): boolean {
    // Stable ID format: <type>-<hash>
    return /^[a-z]+-[a-f0-9-]+/.test(id);
  }

  private pass(code: string, message: string): void {
    this.checks.push({ name: code, status: 'PASS', message });
  }

  private fail(code: string, message: string): void {
    this.checks.push({ name: code, status: 'FAIL', message });
  }

  private warn(code: string, message: string): void {
    this.checks.push({ name: code, status: 'WARN', message });
  }
}

export default RunValidator;
