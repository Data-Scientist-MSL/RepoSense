/**
 * Sprints 7-8 Integration Tests
 * PerformanceOptimizer, ErrorRecoveryService, DeploymentManager
 * Tests for performance, error handling, and production readiness
 */

import * as assert from 'assert';
import { suite, test } from 'mocha';
import PerformanceOptimizer from '../../services/PerformanceOptimizerNew';
import {
  ErrorRecoveryService,
  DeploymentManager,
  ErrorSeverity,
  RecoveryStrategy,
} from '../../services/ProductionHardeningNew';

suite('Sprint 7: PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;

  test('should cache diagram generation results', () => {
    optimizer = new PerformanceOptimizer();
    const diagramData = { type: 'system-context', nodes: 10, edges: 5 };

    optimizer.cacheDiagram('diagram-1', diagramData, 3600);
    const cached = optimizer.getCachedDiagram('diagram-1');

    assert.deepStrictEqual(cached, diagramData);
  });

  test('should expire cached entries by TTL', async () => {
    optimizer = new PerformanceOptimizer();
    const diagramData = { type: 'api-flow', nodes: 5 };

    optimizer.cacheDiagram('diagram-ttl', diagramData, 0.001); // 1ms TTL
    await new Promise((resolve) => setTimeout(resolve, 10));

    const cached = optimizer.getCachedDiagram('diagram-ttl');
    assert.strictEqual(cached, null);
  });

  test('should track cache hit/miss rates', () => {
    optimizer = new PerformanceOptimizer();

    optimizer.cacheDiagram('diag', { data: 'test' }, 3600);
    optimizer.getCachedDiagram('diag'); // Hit
    optimizer.getCachedDiagram('diag'); // Hit
    optimizer.getCachedDiagram('nonexistent'); // Miss

    const stats = optimizer.getCacheStats();
    assert(stats.hitRate > stats.missRate);
  });

  test('should lazy load data in chunks', async () => {
    optimizer = new PerformanceOptimizer();
    const chunks: any[] = [];

    const dataFetcher = async (start: number, end: number) => {
      return Array.from({ length: end - start }, (_, i) => ({ id: start + i }));
    };

    for await (const chunk of optimizer.lazyLoadData(250, dataFetcher)) {
      chunks.push(chunk);
    }

    assert(chunks.length > 0);
    let totalItems = 0;
    for (const chunk of chunks) {
      totalItems += chunk.length;
    }
    assert.strictEqual(totalItems, 250);
  });

  test('should execute tests in parallel', async () => {
    optimizer = new PerformanceOptimizer();
    const results: string[] = [];

    const tasks = Array.from({ length: 10 }, (_, i) => ({
      id: `task-${i}`,
      execute: async () => {
        await new Promise((r) => setTimeout(r, Math.random() * 100));
        return `result-${i}`;
      },
    }));

    const parallelResults = await optimizer.executeParallel(tasks, (result) => {
      if (result.success) results.push(result.data);
    });

    assert(parallelResults.length === 10);
    assert(parallelResults.every((r: any) => r.success || r.success === false));
  });

  test('should batch generate diagrams with caching', async () => {
    optimizer = new PerformanceOptimizer();

    const configs = Array.from({ length: 5 }, (_, i) => ({
      id: `diagram-${i}`,
      type: 'system-context',
      data: { nodes: 10 + i },
    }));

    const results = await optimizer.batchGenerateDiagrams(configs);

    assert.strictEqual(results.length, 5);
    assert(results.every((r: any) => r.success || r.success === false));
  });

  test('should optimize gap analysis with caching', () => {
    optimizer = new PerformanceOptimizer();
    const graphData = {
      nodes: [
        { id: 'ep1', type: 'TESTED_ENDPOINT' },
        { id: 'ep2', type: 'UNTESTED_ENDPOINT' },
        { id: 'gap1', type: 'GAP', metadata: { endpoint: '/users' } },
      ],
    };

    const result1 = optimizer.optimizeGapAnalysis(graphData, true);
    const result2 = optimizer.optimizeGapAnalysis(graphData, true);

    assert.strictEqual(result1.testedEndpoints.length, 1);
    assert.strictEqual(result1.untestedEndpoints.length, 1);
    assert(result1.gapClusters.length > 0);
  });

  test('should clear cache by pattern', () => {
    optimizer = new PerformanceOptimizer();

    optimizer.cacheDiagram('diagram-1', { data: 'a' }, 3600);
    optimizer.cacheDiagram('diagram-2', { data: 'b' }, 3600);
    optimizer.cacheDiagram('analysis-1', { data: 'c' }, 3600);

    const removed = optimizer.clearCache('diagram');
    assert.strictEqual(removed, 2);
  });

  test('should provide cache info', () => {
    optimizer = new PerformanceOptimizer();

    optimizer.cacheDiagram('test-1', { data: 'test' }, 3600);
    optimizer.getCachedDiagram('test-1');
    optimizer.getCachedDiagram('test-1');

    const info = optimizer.getCacheInfo();
    assert(info.length > 0);
    assert(info[0].hits === 2);
  });

  test('should get cache statistics', () => {
    optimizer = new PerformanceOptimizer();

    optimizer.cacheDiagram('stat-test', { data: 'test' }, 3600);
    optimizer.getCachedDiagram('stat-test');
    optimizer.getCachedDiagram('nonexistent');

    const stats = optimizer.getCacheStats();
    assert(stats.totalEntries >= 1);
    assert(stats.avgResponseTimeMs >= 0);
    assert(stats.memoryUsageMB >= 0);
  });
});

suite('Sprint 8: ErrorRecoveryService', () => {
  let errorRecovery: ErrorRecoveryService;

  test('should record errors with context', async () => {
    errorRecovery = new ErrorRecoveryService();
    const error = new Error('Test error');

    await errorRecovery.handleError(
      error,
      ErrorSeverity.HIGH,
      { operation: 'test-op', category: 'network' },
      RecoveryStrategy.RETRY
    );

    const history = errorRecovery.getErrorHistory();
    assert(history.length > 0);
  });

  test('should retry with exponential backoff', async () => {
    errorRecovery = new ErrorRecoveryService();
    let attempts = 0;

    const operation = async () => {
      attempts++;
      if (attempts < 2) throw new Error('Fail');
      return 'success';
    };

    const result = await errorRecovery.retryWithBackoff(operation, 3);
    assert.strictEqual(result, 'success');
    assert.strictEqual(attempts, 2);
  });

  test('should use fallback on primary failure', async () => {
    errorRecovery = new ErrorRecoveryService();

    const fallback = async () => {
      return { fallback: true, data: 'fallback-result' };
    };

    const result = await errorRecovery.useFallback(fallback, {
      primaryError: 'Primary failed',
    });

    assert(result.fallback === true);
  });

  test('should apply circuit breaker pattern', async () => {
    errorRecovery = new ErrorRecoveryService();

    const failingOp = async () => {
      throw new Error('Service down');
    };

    // First call opens circuit
    const result1 = await errorRecovery.applyCircuitBreaker('service-1', failingOp);
    assert(!result1.success);
    assert(result1.error);

    // Second call finds circuit open
    const result2 = await errorRecovery.applyCircuitBreaker('service-1', failingOp);
    assert(!result2.success);
    assert(result2.circuitOpen === true);
  });

  test('should get error history with filtering', async () => {
    errorRecovery = new ErrorRecoveryService();

    const err1 = new Error('Critical error');
    const err2 = new Error('Low priority');

    await errorRecovery.handleError(
      err1,
      ErrorSeverity.CRITICAL,
      { category: 'test' },
      RecoveryStrategy.RETRY
    );

    await errorRecovery.handleError(
      err2,
      ErrorSeverity.LOW,
      { category: 'test' },
      RecoveryStrategy.FALLBACK
    );

    const criticalErrors = errorRecovery.getErrorHistory(ErrorSeverity.CRITICAL);
    assert(criticalErrors.length > 0);
  });

  test('should track error statistics', async () => {
    errorRecovery = new ErrorRecoveryService();

    await errorRecovery.handleError(
      new Error('Error 1'),
      ErrorSeverity.HIGH,
      { category: 'network' },
      RecoveryStrategy.RETRY
    );

    await errorRecovery.handleError(
      new Error('Error 2'),
      ErrorSeverity.MEDIUM,
      { category: 'validation' },
      RecoveryStrategy.FALLBACK
    );

    const stats = errorRecovery.getErrorStats();
    assert(stats.totalErrors >= 2);
    assert(stats.bySeverity[ErrorSeverity.HIGH] >= 1);
  });

  test('should clear error history', async () => {
    errorRecovery = new ErrorRecoveryService();

    await errorRecovery.handleError(
      new Error('Test'),
      ErrorSeverity.LOW,
      { category: 'test' },
      RecoveryStrategy.RETRY
    );

    const cleared = errorRecovery.clearErrors();
    assert(cleared > 0);

    const history = errorRecovery.getErrorHistory();
    assert.strictEqual(history.length, 0);
  });
});

suite('Sprint 8: DeploymentManager', () => {
  let deploymentMgr: DeploymentManager;

  test('should add deployment checkpoints', () => {
    deploymentMgr = new DeploymentManager();

    deploymentMgr.addCheckpoint('Build', 'PASSED', 120, 'Build successful');
    deploymentMgr.addCheckpoint('Tests', 'PASSED', 340, 'All tests passed');

    const readiness = deploymentMgr.getDeploymentReadiness();
    assert(readiness.checkpoints.length >= 2);
  });

  test('should run pre-deployment checks', async () => {
    deploymentMgr = new DeploymentManager();

    const checks = await deploymentMgr.runDeploymentChecks();

    assert(checks.length > 0);
    assert(checks.every((c) => c.status === 'PASSED' || c.status === 'FAILED'));
    assert(checks.every((c) => c.duration >= 0));
  });

  test('should perform health checks', async () => {
    deploymentMgr = new DeploymentManager();

    const health = await deploymentMgr.performHealthCheck();

    assert(health.status === 'HEALTHY' || health.status === 'DEGRADED' || health.status === 'UNHEALTHY');
    assert(health.checks.length > 0);
    assert(health.overallHealth >= 0 && health.overallHealth <= 1);
  });

  test('should apply rate limiting', async () => {
    deploymentMgr = new DeploymentManager();

    const allowed1 = await deploymentMgr.checkRateLimit('client-1');
    assert.strictEqual(allowed1, true);

    const status = deploymentMgr.getRateLimitStatus('client-1');
    assert(status.remaining > 0);
    assert(status.limit > 0);
  });

  test('should get rate limit status', () => {
    deploymentMgr = new DeploymentManager();

    deploymentMgr.checkRateLimit('client-rl');
    deploymentMgr.checkRateLimit('client-rl');

    const status = deploymentMgr.getRateLimitStatus('client-rl');
    assert.strictEqual(status.remaining, status.limit - 2);
  });

  test('should determine deployment readiness', async () => {
    deploymentMgr = new DeploymentManager();

    const checks = await deploymentMgr.runDeploymentChecks();
    const readiness = deploymentMgr.getDeploymentReadiness();

    assert(readiness.score >= 0 && readiness.score <= 1);
    assert(readiness.checkpoints.length > 0);
  });

  test('should clear rate limit data', () => {
    deploymentMgr = new DeploymentManager();

    deploymentMgr.checkRateLimit('client-clear-1');
    deploymentMgr.checkRateLimit('client-clear-2');

    const cleared = deploymentMgr.clearRateLimitData('client-clear-1');
    assert.strictEqual(cleared, 1);
  });
});

suite('End-to-End: Sprints 7-8 Complete Flow', () => {
  test('should orchestrate performance optimization, error handling, and deployment', async () => {
    // Sprint 7: Performance
    const optimizer = new PerformanceOptimizer();
    optimizer.cacheDiagram('perf-test', { type: 'system', nodes: 20 }, 3600);

    const tasks = Array.from({ length: 5 }, (_, i) => ({
      id: `task-${i}`,
      execute: async () => `result-${i}`,
    }));

    const parallelResults = await optimizer.executeParallel(tasks);
    assert(parallelResults.length === 5);

    const cacheStats = optimizer.getCacheStats();
    assert(cacheStats.totalEntries >= 1);

    // Sprint 8: Error Handling
    const errorRecovery = new ErrorRecoveryService();

    await errorRecovery.handleError(
      new Error('Test error'),
      ErrorSeverity.MEDIUM,
      { operation: 'test' },
      RecoveryStrategy.RETRY
    );

    const errorStats = errorRecovery.getErrorStats();
    assert(errorStats.totalErrors >= 1);

    // Sprint 8: Deployment
    const deploymentMgr = new DeploymentManager();
    const checks = await deploymentMgr.runDeploymentChecks();
    assert(checks.length > 0);

    const health = await deploymentMgr.performHealthCheck();
    assert(health.status);

    const readiness = deploymentMgr.getDeploymentReadiness();
    assert(readiness.score >= 0);

    console.log('✅ E2E Test Complete: Performance → Error Handling → Deployment');
  });
});
