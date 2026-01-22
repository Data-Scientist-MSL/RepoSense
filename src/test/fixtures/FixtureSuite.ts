/**
 * Sprint 9: Golden Run Test Fixtures
 * Reference repositories with expected validated outputs
 * Used to verify consistency across runs
 */

export interface FixtureSpec {
  name: string;
  description: string;
  complexity: 'SIMPLE' | 'INTERMEDIATE' | 'COMPLEX';
  expectedStats: ExpectedStats;
  testCases: TestCase[];
}

export interface ExpectedStats {
  nodeCount: number;
  nodeCountTolerance: number; // ±%
  edgeCount: number;
  edgeCountTolerance: number; // ±%
  gapCount: number;
  endpointCount: number;
  callCount: number;
  stableIdCount: number;
}

export interface TestCase {
  name: string;
  assertion: (run: any) => boolean;
  message: string;
}

// FIXTURE 1: Simple REST - Static Routes Only

export const simpleRestFixture: FixtureSpec = {
  name: 'simple-rest',
  description: 'Static REST routes, no path parameters or dynamic behavior',
  complexity: 'SIMPLE',
  expectedStats: {
    nodeCount: 12,
    nodeCountTolerance: 5,
    edgeCount: 8,
    edgeCountTolerance: 10,
    gapCount: 2,
    endpointCount: 4,
    callCount: 6,
    stableIdCount: 12,
  },
  testCases: [
    {
      name: 'All endpoints normalized',
      assertion: (run) => {
        const graph = run.graph;
        const endpoints = graph.nodes.filter((n: any) => n.type === 'BackendEndpoint');
        // GET /users, POST /users, GET /users/:id, DELETE /users/:id
        return endpoints.length === 4;
      },
      message: 'Should have exactly 4 backend endpoints',
    },
    {
      name: 'Path parameters normalized',
      assertion: (run) => {
        const graph = run.graph;
        const userIdEndpoints = graph.nodes.filter((n: any) => n.normalizedPath === '/users/:id');
        return userIdEndpoints.length === 2; // GET and DELETE
      },
      message: 'Path parameters (:id, {id}, ?id) should normalize to :id',
    },
    {
      name: 'No orphaned calls',
      assertion: (run) => {
        const report = run.report;
        return (report.apiContractHealth?.orphanedCalls || 0) === 0;
      },
      message: 'All frontend calls should match endpoints',
    },
    {
      name: 'Stable IDs consistent on rescan',
      assertion: (run) => {
        const ids1 = new Set(run.graph.nodes.map((n: any) => n.id));
        const ids2 = new Set(run.graphRescan.nodes.map((n: any) => n.id));
        return ids1.size === ids2.size && [...ids1].every((id) => ids2.has(id));
      },
      message: 'IDs should be identical on rescan without changes',
    },
  ],
};

// FIXTURE 2: Dynamic Parameters - Path Params, Query Strings

export const dynamicParamsFixture: FixtureSpec = {
  name: 'dynamic-params',
  description: 'Path parameters, query strings, regex patterns',
  complexity: 'INTERMEDIATE',
  expectedStats: {
    nodeCount: 18,
    nodeCountTolerance: 8,
    edgeCount: 14,
    edgeCountTolerance: 12,
    gapCount: 3,
    endpointCount: 6,
    callCount: 11,
    stableIdCount: 18,
  },
  testCases: [
    {
      name: 'Path parameter variants normalized',
      assertion: (run) => {
        const graph = run.graph;
        // /api/users/:id, /api/users/{id}, /api/users/{id:regex}
        const variants = ['/users/:id', '/users/{id}', '/users/{id:\\d+}'];
        const normalized = new Set(
          graph.nodes
            .filter((n: any) => n.type === 'BackendEndpoint' && n.normalizedPath.includes('users'))
            .map((n: any) => n.normalizedPath)
        );
        return normalized.size === 1 && normalized.has('/users/:id');
      },
      message: 'All user ID endpoint variants should normalize to /users/:id',
    },
    {
      name: 'Query strings not part of endpoint identity',
      assertion: (run) => {
        const graph = run.graph;
        // /api/search?q=foo and /api/search?sort=date should be same endpoint
        const searchEndpoints = graph.nodes.filter(
          (n: any) => n.type === 'BackendEndpoint' && n.normalizedPath === '/search'
        );
        return searchEndpoints.length === 1;
      },
      message: 'Query strings should not create duplicate endpoints',
    },
    {
      name: 'Complex regex patterns handled',
      assertion: (run) => {
        const graph = run.graph;
        const regexPatterns = graph.nodes.filter((n: any) => n.metadata?.pattern?.includes('\\d+'));
        return regexPatterns.length > 0;
      },
      message: 'Regex patterns in routes should be captured',
    },
  ],
};

// FIXTURE 3: Mixed Patterns - Complex Architecture

export const mixedPatternsFixture: FixtureSpec = {
  name: 'mixed-patterns',
  description: 'Middleware chains, route wrappers, decorators, nested routers',
  complexity: 'COMPLEX',
  expectedStats: {
    nodeCount: 28,
    nodeCountTolerance: 12,
    edgeCount: 22,
    edgeCountTolerance: 15,
    gapCount: 5,
    endpointCount: 10,
    callCount: 17,
    stableIdCount: 28,
  },
  testCases: [
    {
      name: 'Middleware-wrapped routes detected',
      assertion: (run) => {
        const graph = run.graph;
        // Routes through middleware should still be recognized
        const protectedRoutes = graph.nodes.filter(
          (n: any) => n.type === 'BackendEndpoint' && n.metadata?.middlewareChain?.length > 0
        );
        return protectedRoutes.length > 0;
      },
      message: 'Protected/decorated routes should be detected',
    },
    {
      name: 'Nested router paths flattened correctly',
      assertion: (run) => {
        const graph = run.graph;
        // Router at /api/v1 with nested /users should resolve to /api/v1/users
        const nestedRoutes = graph.nodes.filter((n: any) => n.normalizedPath?.startsWith('/api/v'));
        return nestedRoutes.length > 0;
      },
      message: 'Nested router prefixes should be included in path',
    },
    {
      name: 'Multiple call sites to same endpoint',
      assertion: (run) => {
        const graph = run.graph;
        const edges = graph.edges.filter((e: any) => e.type === 'CALLS');
        const targetCounts = new Map<string, number>();
        for (const edge of edges) {
          targetCounts.set(edge.to, (targetCounts.get(edge.to) || 0) + 1);
        }
        // Some endpoints should be called from multiple locations
        return [...targetCounts.values()].some((count) => count > 1);
      },
      message: 'Endpoints can be called from multiple call sites',
    },
  ],
};

// Comparison Test: Delta Detection

export interface DeltaTestCase {
  name: string;
  baselineRun: any;
  modifiedRepo: () => void;
  currentRun: any;
  expectedDelta: DeltaExpectation;
}

export interface DeltaExpectation {
  gapsAdded: number;
  gapsRemoved: number;
  gapsUnchanged: number;
  endpointsAdded: number;
  endpointsRemoved: number;
  callsAdded: number;
}

export const deltaSample1: DeltaTestCase = {
  name: 'Add new endpoint, remove unused call',
  baselineRun: simpleRestFixture,
  modifiedRepo: () => {
    // Simulate: Add POST /products, remove GET /legacy from codebase
  },
  currentRun: simpleRestFixture,
  expectedDelta: {
    gapsAdded: 1,
    gapsRemoved: 2,
    gapsUnchanged: 0,
    endpointsAdded: 1,
    endpointsRemoved: 0,
    callsAdded: 0,
  },
};

// Fixture Runner

export class FixtureRunner {
  private fixtures: FixtureSpec[];

  constructor() {
    this.fixtures = [simpleRestFixture, dynamicParamsFixture, mixedPatternsFixture];
  }

  /**
   * Run all fixtures, generate baseline expected outputs
   */
  public async generateBaselines(): Promise<Map<string, any>> {
    const baselines = new Map<string, any>();

    for (const fixture of this.fixtures) {
      const result = {
        fixture: fixture.name,
        stats: fixture.expectedStats,
        testsPassed: 0,
        testsFailed: 0,
        errors: [] as string[],
      };

      baselines.set(fixture.name, result);
    }

    return baselines;
  }

  /**
   * Validate a run against fixture expectations
   */
  public validateAgainstFixture(runData: any, fixtureName: string): boolean {
    const fixture = this.fixtures.find((f) => f.name === fixtureName);
    if (!fixture) {
      throw new Error(`Fixture not found: ${fixtureName}`);
    }

    for (const testCase of fixture.testCases) {
      const passed = testCase.assertion(runData);
      if (!passed) {
        console.error(`FAILED: ${testCase.name} - ${testCase.message}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Compare actual stats against expected with tolerance
   */
  public validateStats(actual: ExpectedStats, expected: ExpectedStats): boolean {
    const nodeOk = this.withinTolerance(actual.nodeCount, expected.nodeCount, expected.nodeCountTolerance);
    const edgeOk = this.withinTolerance(actual.edgeCount, expected.edgeCount, expected.edgeCountTolerance);
    const gapOk = actual.gapCount === expected.gapCount;

    return nodeOk && edgeOk && gapOk;
  }

  private withinTolerance(actual: number, expected: number, tolerance: number): boolean {
    const percent = Math.abs(actual - expected) / expected;
    return percent <= tolerance / 100;
  }
}

export default FixtureRunner;
