/**
 * Sprint 1-3 Integration Tests
 * Comprehensive test suite for Run Orchestrator, Graph Building, and Report Generation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as path from 'path';
import { promises as fsAsync } from 'fs';
import { RunRepository, RunState, ScanResult } from '../services/RunRepository';
import { RunGraphBuilder, GraphNodeType } from '../services/RunGraphBuilder';
import { ReportGenerator, ReportFormat } from '../services/ReportGenerator';

describe('Sprint 1-3: Sprints 1-3 Integration Tests', () => {
  let repository: RunRepository;
  let tempDir: string;
  const runId = 'test-run-2026-01-21T14-30-00Z';

  beforeEach(async () => {
    tempDir = path.join(__dirname, '../../.test-workspace');
    await fsAsync.mkdir(tempDir, { recursive: true });
    repository = new RunRepository(tempDir);
    await repository.initialize();
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fsAsync.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Sprint 1: Run Orchestrator Backbone', () => {
    it('should create a new run with valid structure', async () => {
      const runDir = await repository.createRun(runId);
      expect(runDir).toContain(runId);

      const exists = await repository.runExists(runId);
      expect(exists).toBe(true);
    });

    it('should save and load run metadata', async () => {
      await repository.createRun(runId);

      const meta = {
        runId,
        state: RunState.CREATED,
        createdAt: new Date().toISOString(),
        version: '1.0.0',
      };

      await repository.saveMeta(runId, meta);
      const loaded = await repository.loadMeta(runId);

      expect(loaded.runId).toBe(runId);
      expect(loaded.state).toBe(RunState.CREATED);
      expect(loaded.version).toBe('1.0.0');
    });

    it('should transition run states correctly', async () => {
      await repository.createRun(runId);

      const initialMeta = {
        runId,
        state: RunState.CREATED,
        createdAt: new Date().toISOString(),
        version: '1.0.0',
      };
      await repository.saveMeta(runId, initialMeta);

      // Transition to SCANNING
      await repository.updateMetaState(runId, RunState.SCANNING);
      let meta = await repository.loadMeta(runId);
      expect(meta.state).toBe(RunState.SCANNING);
      expect(meta.startedAt).toBeDefined();

      // Transition to ANALYZED
      await repository.updateMetaState(runId, RunState.ANALYZED);
      meta = await repository.loadMeta(runId);
      expect(meta.state).toBe(RunState.ANALYZED);

      // Transition to COMPLETED
      await repository.updateMetaState(runId, RunState.COMPLETED);
      meta = await repository.loadMeta(runId);
      expect(meta.state).toBe(RunState.COMPLETED);
      expect(meta.completedAt).toBeDefined();
      expect(meta.duration).toBeGreaterThan(0);
    });

    it('should save and load scan results', async () => {
      await repository.createRun(runId);

      const scanResult: ScanResult = {
        endpoints: [
          {
            method: 'GET',
            path: '/users',
            file: 'src/routes/users.ts',
            line: 12,
            auth: true,
          },
          {
            method: 'POST',
            path: '/users',
            file: 'src/routes/users.ts',
            line: 45,
            auth: true,
          },
        ],
        calls: [
          {
            from: 'src/pages/Users.tsx',
            to: '/users',
            file: 'src/pages/Users.tsx',
            line: 50,
          },
        ],
        gaps: [
          {
            endpoint: '/users',
            type: 'MISSING_LOGGING',
            severity: 'MEDIUM',
            reason: 'No request/response logging configured',
          },
        ],
      };

      await repository.saveScan(runId, scanResult);
      const loaded = await repository.loadScan(runId);

      expect(loaded.endpoints).toHaveLength(2);
      expect(loaded.calls).toHaveLength(1);
      expect(loaded.gaps).toHaveLength(1);
      expect(loaded.endpoints[0].method).toBe('GET');
    });

    it('should update latest run pointer', async () => {
      await repository.createRun(runId);
      await repository.updateLatestPointer(runId);

      const latestId = await repository.getLatestRunId();
      expect(latestId).toBe(runId);
    });

    it('should list all runs', async () => {
      const run1 = 'test-run-001';
      const run2 = 'test-run-002';

      await repository.createRun(run1);
      await repository.createRun(run2);

      const runs = await repository.listRuns();
      expect(runs).toContain(run1);
      expect(runs).toContain(run2);
      expect(runs.length).toBeGreaterThanOrEqual(2);
    });

    it('should generate deterministic run IDs', async () => {
      const id1 = repository.generateRunId();
      const id2 = repository.generateRunId();

      // IDs should be different (time-based)
      expect(id1).not.toBe(id2);

      // Should follow format pattern
      expect(id1).toMatch(/^run-\d{8}T\d{6}\d{3}Z$/);
      expect(id2).toMatch(/^run-\d{8}T\d{6}\d{3}Z$/);
    });
  });

  describe('Sprint 2: Graph Model & Gap Normalization', () => {
    let scanResult: ScanResult;

    beforeEach(() => {
      scanResult = {
        endpoints: [
          {
            method: 'GET',
            path: '/users',
            file: 'src/routes/users.ts',
            line: 12,
            auth: true,
          },
          {
            method: 'GET',
            path: '/users/:id',
            file: 'src/routes/users.ts',
            line: 25,
            auth: false,
          },
        ],
        calls: [
          {
            from: 'src/pages/Users.tsx',
            to: '/users',
            file: 'src/pages/Users.tsx',
            line: 50,
          },
        ],
        gaps: [
          {
            endpoint: '/users/:id',
            type: 'MISSING_AUTH',
            severity: 'CRITICAL',
            reason: 'Endpoint lacks authentication guard',
          },
          {
            endpoint: '/users/:id',
            type: 'MISSING_VALIDATION',
            severity: 'HIGH',
            reason: 'Input validation missing',
          },
        ],
      };
    });

    it('should build graph from scan results', async () => {
      const builder = new RunGraphBuilder(runId);
      const graph = builder.buildFromScanResults(scanResult);

      expect(graph.runId).toBe(runId);
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
    });

    it('should create endpoint nodes', async () => {
      const builder = new RunGraphBuilder(runId);
      const graph = builder.buildFromScanResults(scanResult);

      const endpointNodes = graph.nodes.filter((n) => n.type === GraphNodeType.BACKEND_ENDPOINT);
      expect(endpointNodes.length).toBe(2);

      expect(endpointNodes.some((n) => n.metadata.path === '/users')).toBe(true);
      expect(endpointNodes.some((n) => n.metadata.path === '/users/:id')).toBe(true);
    });

    it('should create gap nodes with deterministic IDs', async () => {
      const builder = new RunGraphBuilder(runId);
      const graph1 = builder.buildFromScanResults(scanResult);

      const builder2 = new RunGraphBuilder(runId);
      const graph2 = builder2.buildFromScanResults(scanResult);

      const gapNodes1 = graph1.nodes.filter((n) => n.type === GraphNodeType.GAP);
      const gapNodes2 = graph2.nodes.filter((n) => n.type === GraphNodeType.GAP);

      expect(gapNodes1.length).toBe(gapNodes2.length);

      // Gap IDs should be identical across runs (deterministic)
      const ids1 = gapNodes1.map((n) => n.id).sort();
      const ids2 = gapNodes2.map((n) => n.id).sort();

      ids1.forEach((id, index) => {
        expect(id).toBe(ids2[index]);
      });
    });

    it('should create CALLS edges', async () => {
      const builder = new RunGraphBuilder(runId);
      const graph = builder.buildFromScanResults(scanResult);

      const callEdges = graph.edges.filter((e) => e.type === 'CALLS');
      expect(callEdges.length).toBeGreaterThan(0);
    });

    it('should calculate metadata correctly', async () => {
      const builder = new RunGraphBuilder(runId);
      const graph = builder.buildFromScanResults(scanResult);

      expect(graph.metadata.totalEndpoints).toBe(2);
      expect(graph.metadata.uniqueGaps).toBe(2);
      expect(graph.metadata.uniqueCalls).toBeGreaterThan(0);
    });

    it('should save and load graph', async () => {
      await repository.createRun(runId);

      const builder = new RunGraphBuilder(runId);
      const graph = builder.buildFromScanResults(scanResult);

      await repository.saveGraph(runId, graph);
      const loaded = await repository.loadGraph(runId);

      expect(loaded.runId).toBe(runId);
      expect(loaded.nodes.length).toBe(graph.nodes.length);
      expect(loaded.edges.length).toBe(graph.edges.length);
    });
  });

  describe('Sprint 3: Report Engine', () => {
    let graph: any;

    beforeEach(async () => {
      const scanResult: ScanResult = {
        endpoints: [
          {
            method: 'GET',
            path: '/users',
            file: 'src/routes/users.ts',
            line: 12,
            auth: true,
          },
          {
            method: 'DELETE',
            path: '/users/:id',
            file: 'src/routes/users.ts',
            line: 30,
            auth: false,
          },
        ],
        calls: [
          {
            from: 'src/pages/Users.tsx',
            to: '/users',
            file: 'src/pages/Users.tsx',
            line: 50,
          },
        ],
        gaps: [
          {
            endpoint: '/users/:id',
            type: 'MISSING_AUTH',
            severity: 'CRITICAL',
            reason: 'DELETE endpoint lacks authentication',
          },
          {
            endpoint: '/users/:id',
            type: 'NO_INPUT_VALIDATION',
            severity: 'HIGH',
            reason: 'Input ID not validated',
          },
          {
            endpoint: '/users',
            type: 'NO_RATE_LIMITING',
            severity: 'MEDIUM',
            reason: 'Rate limiting not configured',
          },
        ],
      };

      const builder = new RunGraphBuilder(runId);
      graph = builder.buildFromScanResults(scanResult);
    });

    it('should generate report data', () => {
      const generator = new ReportGenerator(graph);
      const report = generator.generateReportData();

      expect(report.runId).toBe(runId);
      expect(report.summary.totalEndpoints).toBe(2);
      expect(report.summary.totalGaps).toBe(3);
      expect(report.summary.overallRiskScore).toBeGreaterThan(0);
    });

    it('should calculate risk distribution', () => {
      const generator = new ReportGenerator(graph);
      const report = generator.generateReportData();

      expect(report.summary.riskDistribution.critical).toBe(1);
      expect(report.summary.riskDistribution.high).toBe(1);
      expect(report.summary.riskDistribution.medium).toBe(1);
    });

    it('should identify top gaps', () => {
      const generator = new ReportGenerator(graph);
      const report = generator.generateReportData();

      expect(report.topGaps.length).toBeGreaterThan(0);
      expect(report.topGaps[0].riskScore).toBeGreaterThanOrEqual(report.topGaps[1].riskScore);
    });

    it('should generate recommendations', () => {
      const generator = new ReportGenerator(graph);
      const report = generator.generateReportData();

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0]).toContain('CRITICAL');
    });

    it('should generate JSON report', () => {
      const generator = new ReportGenerator(graph);
      const json = generator.generateJSON();

      const parsed = JSON.parse(json);
      expect(parsed.runId).toBe(runId);
      expect(parsed.summary).toBeDefined();
      expect(parsed.topGaps).toBeDefined();
    });

    it('should generate HTML report', () => {
      const generator = new ReportGenerator(graph);
      const html = generator.generateHTML();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('RepoSense');
      expect(html).toContain('Security Gaps');
      expect(html).toContain('Risk Score');
    });

    it('should generate Markdown report', () => {
      const generator = new ReportGenerator(graph);
      const md = generator.generateMarkdown();

      expect(md).toContain('#');
      expect(md).toContain('Endpoints');
      expect(md).toContain('Recommendations');
    });

    it('should generate CSV report', () => {
      const generator = new ReportGenerator(graph);
      const csv = generator.generateCSV();

      expect(csv).toContain('Endpoint');
      expect(csv).toContain('Severity');
      expect(csv).toContain('Risk Score');
    });

    it('should support all report formats', () => {
      const generator = new ReportGenerator(graph);

      const jsonReport = generator.generate(ReportFormat.JSON);
      expect(jsonReport).toBeTruthy();

      const htmlReport = generator.generate(ReportFormat.HTML);
      expect(htmlReport).toContain('<!DOCTYPE html>');

      const mdReport = generator.generate(ReportFormat.MARKDOWN);
      expect(mdReport).toContain('#');

      const csvReport = generator.generate(ReportFormat.CSV);
      expect(csvReport).toContain('Endpoint');
    });

    it('should save reports to disk', async () => {
      await repository.createRun(runId);

      const generator = new ReportGenerator(graph);
      const jsonReport = generator.generateJSON();

      await repository.saveReport(runId, JSON.parse(jsonReport), 'json');
      const htmlReport = generator.generateHTML();
      await repository.saveReport(runId, htmlReport, 'html');

      expect(await repository.runExists(runId)).toBe(true);
    });
  });

  describe('End-to-End: Complete Sprint 1-3 Flow', () => {
    it('should execute complete pipeline: scan → graph → report', async () => {
      // 1. Create run
      const newRunId = repository.generateRunId();
      await repository.createRun(newRunId);

      // 2. Initialize metadata
      const meta = {
        runId: newRunId,
        state: RunState.CREATED,
        createdAt: new Date().toISOString(),
        version: '1.0.0',
      };
      await repository.saveMeta(newRunId, meta);

      // 3. Simulate scan and save results
      await repository.updateMetaState(newRunId, RunState.SCANNING);

      const scanResult: ScanResult = {
        endpoints: [
          {
            method: 'GET',
            path: '/products',
            file: 'src/routes/products.ts',
            line: 10,
            auth: true,
          },
          {
            method: 'POST',
            path: '/products',
            file: 'src/routes/products.ts',
            line: 30,
            auth: false,
          },
        ],
        calls: [
          {
            from: 'src/pages/Products.tsx',
            to: '/products',
            file: 'src/pages/Products.tsx',
            line: 45,
          },
        ],
        gaps: [
          {
            endpoint: '/products',
            type: 'MISSING_LOGGING',
            severity: 'HIGH',
            reason: 'POST action not logged',
          },
        ],
      };

      await repository.saveScan(newRunId, scanResult);
      await repository.updateMetaState(newRunId, RunState.ANALYZED);

      // 4. Build graph
      const builder = new RunGraphBuilder(newRunId);
      const graph = builder.buildFromScanResults(scanResult);
      await repository.saveGraph(newRunId, graph);
      await repository.updateMetaState(newRunId, RunState.GRAPH_BUILT);

      // 5. Generate reports
      const generator = new ReportGenerator(graph);
      const jsonReport = generator.generateJSON();
      await repository.saveReport(newRunId, JSON.parse(jsonReport), 'json');

      const htmlReport = generator.generateHTML();
      await repository.saveReport(newRunId, htmlReport, 'html');

      await repository.updateMetaState(newRunId, RunState.COMPLETED);

      // 6. Verify complete flow
      const finalMeta = await repository.loadMeta(newRunId);
      expect(finalMeta.state).toBe(RunState.COMPLETED);
      expect(finalMeta.duration).toBeGreaterThan(0);

      const savedScan = await repository.loadScan(newRunId);
      expect(savedScan.endpoints).toHaveLength(2);

      const savedGraph = await repository.loadGraph(newRunId);
      expect(savedGraph.nodes.length).toBeGreaterThan(0);

      const latestId = await repository.getLatestRunId();
      expect(latestId).toBe(newRunId);

      console.log(`✅ Complete pipeline executed: ${newRunId}`);
    });
  });
});
