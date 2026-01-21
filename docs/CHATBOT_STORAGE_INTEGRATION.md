# ChatBot + Storage Integration Guide

**Version:** 1.0  
**Status:** Design Specification  
**Audience:** Engineers implementing ChatBot service layer

---

## Overview

This document shows how the **ChatBot** (intent-driven conversational engine) discovers and retrieves artifacts from the **Storage Model** (immutable `.reposense/runs/` directory).

```
ChatBot Intent
    ↓
ChatBotService (routes to action handlers)
    ↓
RunIndexService / EvidenceDiscoveryService (queries storage)
    ↓
.reposense/runs/<runId>/ (immutable artifact source)
```

---

## 1. ChatBot Discover Latest Run

**User:** "Show me the latest analysis"

**Flow:**

```typescript
// In ChatBotService
async handleShowLatestAnalysis(context: ChatContext): Promise<ChatAction> {
  // 1. Get latest run
  const runIndex = new RunIndexService(context.workspaceRoot);
  const latest = await runIndex.getLatestRun();
  
  if (!latest) {
    return {
      type: 'REPLY',
      content: 'No runs found. Run RepoSense to start.',
    };
  }
  
  // 2. Load report
  const report = runIndex.loadArtifactJson(
    latest.runId,
    'report',
    'report.json'
  );
  
  // 3. Format for display
  return {
    type: 'REPLY',
    content: `Latest analysis (${latest.runId}):
      • Endpoints: ${latest.summary.totalEndpoints}
      • Coverage: ${latest.summary.coverage}%
      • Gaps: ${latest.summary.gaps}
      • Status: ${latest.status}`,
  };
}
```

**Storage Queries:**
- `RunIndexService.getLatestRun()` → reads `.reposense/index.json`
- `RunIndexService.loadArtifactJson(runId, 'report', 'report.json')` → reads `.reposense/runs/<runId>/report/report.json`

---

## 2. ChatBot Explain a Gap

**User:** "Explain gap-123"  
**or:** "What's the evidence that gap-123 was tested?"

**Flow:**

```typescript
// In ChatBotService
async handleExplainGap(gapId: string, context: ChatContext): Promise<ChatAction> {
  // 1. Get latest run
  const runIndex = new RunIndexService(context.workspaceRoot);
  const latest = await runIndex.getLatestRun();
  if (!latest) return { type: 'ERROR', content: 'No runs found' };
  
  // 2. Find evidence for gap
  const evidence = new EvidenceDiscoveryService(context.workspaceRoot);
  const gapEvidence = await evidence.findEvidenceForGap(latest.runId, gapId);
  
  if (!gapEvidence) {
    return { type: 'ERROR', content: `No evidence found for ${gapId}` };
  }
  
  // 3. Get proof (best evidence artifacts)
  const proof = await evidence.findProofForGap(latest.runId, gapId);
  
  // 4. Generate explanation
  return {
    type: 'REPLY',
    content: `Gap: ${gapId}
      Endpoint: ${gapEvidence.endpoint.method} ${gapEvidence.endpoint.path}
      Status: ${gapEvidence.confidence * 100}% confident it's tested
      
      Proof:
      • Test: ${proof?.testCase.testName}
      • Result: ${proof?.passed ? '✓ PASSED' : '✗ FAILED'}
      • Evidence: ${gapEvidence.artifacts.length} artifacts
        - Screenshots: ${gapEvidence.artifacts.filter((a) => a.type === 'SCREENSHOT').length}
        - Videos: ${gapEvidence.artifacts.filter((a) => a.type === 'VIDEO').length}
        - Logs: ${gapEvidence.artifacts.filter((a) => a.type === 'CONSOLE_LOG').length}`,
    actions: [
      {
        label: 'View Evidence',
        command: 'reposense.showEvidencePanel',
        args: [latest.runId, gapId],
      },
      {
        label: 'View Screenshot',
        command: 'reposense.openFile',
        args: [proof?.screenshot],
      },
    ],
  };
}
```

**Storage Queries:**
- `RunIndexService.getLatestRun()`
- `EvidenceDiscoveryService.findEvidenceForGap(runId, gapId)` → reads `.reposense/runs/<runId>/evidence/evidence-index.json`
- `EvidenceDiscoveryService.findProofForGap(runId, gapId)` → finds best evidence from `evidence-index.json`

---

## 3. ChatBot Compare Two Runs

**User:** "How did we improve from yesterday?"  
**or:** "Compare run-A with run-B"

**Flow:**

```typescript
// In ChatBotService
async handleComparRuns(context: ChatContext): Promise<ChatAction> {
  // 1. Get two most recent runs
  const runIndex = new RunIndexService(context.workspaceRoot);
  const recent = await runIndex.getRecentRuns(2);
  
  if (recent.length < 2) {
    return { type: 'ERROR', content: 'Need at least 2 runs to compare' };
  }
  
  const [latest, previous] = recent;
  
  // 2. Calculate deltas
  const delta = {
    endpointDiff: latest.summary.totalEndpoints - previous.summary.totalEndpoints,
    coverageDiff: latest.summary.coverage - previous.summary.coverage,
    gapsDiff: latest.summary.gaps - previous.summary.gaps,
  };
  
  // 3. Find evidence improvements
  const evidence = new EvidenceDiscoveryService(context.workspaceRoot);
  // For each gap in both runs, compare evidence
  
  return {
    type: 'REPLY',
    content: `Comparison: ${previous.runId} → ${latest.runId}
      
      Endpoints: ${delta.endpointDiff > 0 ? '↑' : '↓'} ${Math.abs(delta.endpointDiff)}
      Coverage: ${(delta.coverageDiff * 100).toFixed(1)}% ${delta.coverageDiff > 0 ? '↑' : '↓'}
      Gaps: ${delta.gapsDiff} fewer ${delta.gapsDiff > 0 ? '✓' : '✗'}`,
  };
}
```

**Storage Queries:**
- `RunIndexService.getRecentRuns(2)` → reads `.reposense/index.json`
- For each gap, compare evidence via `EvidenceDiscoveryService.compareEvidence(runId1, runId2, gapId)`

---

## 4. ChatBot Find Tests by Gap

**User:** "What tests cover GET /users?"

**Flow:**

```typescript
// In ChatBotService
async handleFindTestsForEndpoint(
  method: string,
  path: string,
  context: ChatContext
): Promise<ChatAction> {
  // 1. Get latest run
  const runIndex = new RunIndexService(context.workspaceRoot);
  const latest = await runIndex.getLatestRun();
  
  // 2. Find evidence for endpoint
  const evidence = new EvidenceDiscoveryService(context.workspaceRoot);
  const endpointEvidence = await evidence.findEvidenceForEndpoint(
    latest.runId,
    method,
    path
  );
  
  // 3. Collect tests across all gaps for this endpoint
  const tests = new Set<string>();
  const totalEvidence = endpointEvidence.flatMap((e) => e.linkedTests);
  
  for (const test of totalEvidence) {
    tests.add(test.testName);
  }
  
  return {
    type: 'REPLY',
    content: `Tests for ${method} ${path}:
      ${Array.from(tests)
        .map((t) => `  • ${t}`)
        .join('\n')}`,
  };
}
```

**Storage Queries:**
- `EvidenceDiscoveryService.findEvidenceForEndpoint(runId, method, path)` → reads `evidence-index.json`, filters by endpoint

---

## 5. ChatBot Generate Summary

**User:** "Summary"

**Flow:**

```typescript
// In ChatBotService
async handleSummary(context: ChatContext): Promise<ChatAction> {
  // 1. Get index stats
  const runIndex = new RunIndexService(context.workspaceRoot);
  const stats = runIndex.getStatistics();
  
  // 2. Get latest run summary
  const latest = await runIndex.getLatestRun();
  if (!latest) {
    return {
      type: 'REPLY',
      content: 'No runs yet. Run RepoSense to get started.',
    };
  }
  
  // 3. Get evidence stats
  const evidence = new EvidenceDiscoveryService(context.workspaceRoot);
  const evidenceStats = await evidence.getEvidenceStats(latest.runId);
  
  return {
    type: 'REPLY',
    content: `RepoSense Summary:
      
      Runs:
      • Total: ${stats.totalRuns}
      • Successful: ${stats.successfulRuns}
      • Failed: ${stats.failedRuns}
      
      Latest Run (${latest.runId}):
      • Status: ${latest.status}
      • Coverage: ${latest.summary.coverage}%
      • Endpoints Analyzed: ${latest.summary.totalEndpoints}
      • Gaps Found: ${latest.summary.gaps}
      • Critical: ${latest.summary.criticalGaps}
      
      Evidence:
      • Total artifacts: ${evidenceStats.totalEvidence}
      • By type: ${Object.entries(evidenceStats.byType)
        .map(([type, count]) => `${count} ${type}`)
        .join(', ')}`,
  };
}
```

**Storage Queries:**
- `RunIndexService.getStatistics()` → reads `.reposense/index.json`
- `RunIndexService.getLatestRun()`
- `EvidenceDiscoveryService.getEvidenceStats(runId)` → reads `evidence-manifest.json`

---

## 6. ChatBot Export Report

**User:** "Export the latest report as Markdown"

**Flow:**

```typescript
// In ChatBotService
async handleExportReport(
  format: 'MARKDOWN' | 'HTML' | 'JSON',
  context: ChatContext
): Promise<ChatAction> {
  // 1. Get latest run
  const runIndex = new RunIndexService(context.workspaceRoot);
  const latest = await runIndex.getLatestRun();
  
  if (!latest) {
    return { type: 'ERROR', content: 'No runs found' };
  }
  
  // 2. Get artifact path
  const reportPath = runIndex.getFilePath(latest.runId, 'report', `report.${format.toLowerCase()}`);
  
  if (!runIndex.hasArtifact(latest.runId, 'report', `report.${format.toLowerCase()}`)) {
    return { type: 'ERROR', content: `Report not available in ${format} format` };
  }
  
  // 3. Open or download
  return {
    type: 'ACTION',
    action: {
      command: 'reposense.openFile',
      args: [reportPath],
    },
    content: `Opened report: ${reportPath}`,
  };
}
```

**Storage Queries:**
- `RunIndexService.getLatestRun()`
- `RunIndexService.getFilePath(runId, 'report', filename)`
- `RunIndexService.hasArtifact(runId, 'report', filename)`

---

## 7. Storage Query Patterns

### Pattern A: Latest Run Queries

```typescript
// Always start with latest run
const runIndex = new RunIndexService(workspaceRoot);
const latest = await runIndex.getLatestRun();

// Then query artifacts
const report = runIndex.loadArtifactJson(latest.runId, 'report', 'report.json');
```

### Pattern B: Evidence for Gap

```typescript
// Get evidence discovery service
const evidence = new EvidenceDiscoveryService(workspaceRoot);

// Find evidence for gap
const gapEvidence = await evidence.findEvidenceForGap(runId, gapId);

// Get proof (best evidence)
const proof = await evidence.findProofForGap(runId, gapId);
```

### Pattern C: Cross-Run Comparison

```typescript
// Get recent runs
const runIndex = new RunIndexService(workspaceRoot);
const recent = await runIndex.getRecentRuns(5);

// For each run, compare
for (const run of recent) {
  const evidence = new EvidenceDiscoveryService(workspaceRoot);
  const delta = await evidence.compareEvidence(runId1, runId2, gapId);
}
```

### Pattern D: Search by Type

```typescript
// Find all evidence of a specific type
const evidence = new EvidenceDiscoveryService(workspaceRoot);

const screenshots = await evidence.findEvidenceByType(runId, 'SCREENSHOT');
const videos = await evidence.findEvidenceByType(runId, 'VIDEO');
const logs = await evidence.findEvidenceByType(runId, 'CONSOLE_LOG');
```

---

## 8. Error Handling

**Design principle:** Storage queries should be **fail-safe** and **informative**.

```typescript
// Good error handling
async function safeGetLatestRun(workspaceRoot: string) {
  try {
    const runIndex = new RunIndexService(workspaceRoot);
    const latest = await runIndex.getLatestRun();
    
    if (!latest) {
      return {
        error: 'NO_RUNS',
        message: 'No analyses found. Run RepoSense first.',
      };
    }
    
    return { success: true, data: latest };
  } catch (err) {
    return {
      error: 'INDEX_READ_ERROR',
      message: `Failed to read index: ${err.message}`,
    };
  }
}
```

---

## 9. Integration Points

### RunOrchestrator Integration

When orchestrator finishes a run:

```typescript
// In RunOrchestrator.executeRun()
async executeRun(): Promise<void> {
  // ... run analysis ...
  
  // After analysis complete:
  const graphBuilder = new RunGraphBuilder(runId, repoRoot);
  const graph = await graphBuilder.buildGraph(...);
  
  // Register run in index
  const runIndex = new RunIndexService(workspaceRoot);
  await runIndex.registerRun({
    runId,
    timestamp,
    status: 'SUCCESS',
    summary: {
      totalEndpoints: graph.nodes.filter(n => n.type === 'BACKEND_ENDPOINT').length,
      testedEndpoints: ...,
      coverage: ...,
      gaps: ...,
      criticalGaps: ...,
    },
    // ... other fields ...
  });
  
  // ChatBot can now find this run
}
```

### ChatBotService Integration

```typescript
// In ChatBotService constructor
constructor(workspaceRoot: string) {
  this.runIndex = new RunIndexService(workspaceRoot);
  this.evidence = new EvidenceDiscoveryService(workspaceRoot);
}

// ChatBot handlers use discovery services
async handleIntent(intent: ChatIntent): Promise<ChatAction> {
  const latest = await this.runIndex.getLatestRun();
  const evidence = await this.evidence.findEvidenceForGap(...);
  // ... etc ...
}
```

---

## 10. Performance Considerations

### Caching

To avoid repeated disk reads:

```typescript
class CachedRunIndexService extends RunIndexService {
  private indexCache: RepoSenseIndex | null = null;
  private cacheTimestamp: number = 0;
  private cacheTtlMs: number = 60000; // 1 minute
  
  async getLatestRun(): Promise<RunIndexEntry | null> {
    // Check cache freshness
    if (
      this.indexCache &&
      Date.now() - this.cacheTimestamp < this.cacheTtlMs
    ) {
      return this.indexCache.runs[0] || null;
    }
    
    // Cache miss, reload
    this.indexCache = this.loadIndex();
    this.cacheTimestamp = Date.now();
    return this.indexCache.runs[0] || null;
  }
}
```

### Lazy Loading

Only load evidence details when needed:

```typescript
// Fast: Get list of gaps with summary
const gaps = await evidence.findEvidenceForEndpoint(runId, method, path);

// Slower: Get full evidence with artifacts
const full = await evidence.getFullEvidenceForGap(runId, gapId);
```

---

## 11. File Path Reference

Quick lookup for where artifacts live:

| Query | Storage Path | Service Method |
|-------|--------------|-----------------|
| Latest run metadata | `.reposense/index.json` | `RunIndexService.getLatestRun()` |
| Run details | `.reposense/runs/<runId>/run-metadata.json` | `RunIndexService.loadArtifactJson()` |
| Report (canonical) | `.reposense/runs/<runId>/report/report.json` | `RunIndexService.loadArtifactJson()` |
| Report (Markdown) | `.reposense/runs/<runId>/report/report.md` | `RunIndexService.getFilePath()` |
| Diagrams (Mermaid) | `.reposense/runs/<runId>/diagrams/*.mmd` | `RunIndexService.getArtifactPath()` |
| Evidence index | `.reposense/runs/<runId>/evidence/evidence-index.json` | `EvidenceDiscoveryService.findEvidenceForGap()` |
| Evidence manifest | `.reposense/runs/<runId>/evidence/evidence-manifest.json` | `EvidenceDiscoveryService.getEvidenceStats()` |
| Evidence artifacts | `.reposense/runs/<runId>/evidence/{screenshots\|videos\|...}` | `EvidenceDiscoveryService.getFullEvidenceForGap()` |
| Generated tests | `.reposense/runs/<runId>/tests/<framework>/` | `RunIndexService.getArtifactPath()` |
| Remediation diffs | `.reposense/runs/<runId>/diffs/*.patch` | `RunIndexService.getFilePath()` |

---

## 12. Conclusion

**The storage model enables ChatBot intelligence:**

✅ ChatBot always knows where artifacts live  
✅ Queries are type-safe and discoverable  
✅ Evidence is traceable (gap → test → artifact)  
✅ Multiple runs coexist without conflict  
✅ Exports to CI/Cloud are well-structured  

**Next Steps:**

1. Implement `ChatBotService` using these discovery patterns
2. Add `RunIndexService` initialization to `RunOrchestrator`
3. Create test fixtures with sample runs in `.reposense/` structure
4. Build evidence-based explanations in ChatBot intent handlers

