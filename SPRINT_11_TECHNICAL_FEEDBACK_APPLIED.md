# SPRINT 11: TECHNICAL REVIEW FEEDBACK IMPLEMENTATION GUIDE

**Applied feedback from Sprint 1-9 code inspection**

---

## FEEDBACK 1: Run System Consolidation

### Issue Identified

Sprint 1 "Run Orchestrator" is partially duplicated:

- `src/services/RunOrchestrator.ts` (exists)
- `src/services/RunRepositoryNew.ts` (exists)
- `src/test/fixtures/FixtureSuite.ts` (expects `.reposense/`)

**Drift Risk**: No single source of truth for run persistence.

### Sprint 11 Action

**Consolidate into one RunContextService + ArtifactReader pattern**:

```
Old (Parallel paths):
  RunOrchestrator → run state machine
  RunRepositoryNew → artifact storage
  UI → direct calls to both

New (Single path):
  RunContextService → knows which run is active (workspace state)
  ArtifactReader → reads from `.reposense/runs/<id>/`
  UI → asks RunContextService for context, then ArtifactReader for data
```

**Enforcement**: Remove RunRepositoryNew from codebase during Sprint 11 refactor. All code must go through RunContextService.

---

## FEEDBACK 2: Analysis Output Persistence

### Issue Identified

Analyzer output currently behaves like runtime results (in-memory), not persisted contracts.

```
Current: AnalysisEngine.scan() → returns JS object → UI renders
Problem: Each call potentially produces different result (timestamps, file order)
```

### Sprint 11 Action

**Make analysis output a persisted artifact (scan.json → graph.json)**:

```
After Sprint 10:
  .reposense/runs/<runId>/
    ├── scan.json (raw analyzer output, deterministic)
    └── graph.json (canonical with stable IDs)

UI must read graph.json, not call AnalysisEngine
```

**Enforcement Rule**: Any code in `src/providers/` that calls `AnalysisEngine` or `BackendAnalyzer` must be refactored to read from artifact instead.

---

## FEEDBACK 3: Report Panel Sample Data

### Issue Identified

`ReportPanel.ts` initializes with hardcoded sample metrics.

```typescript
// Current (bad)
const defaultReport = {
  coverage: 0.87,
  endpoints: 42,
  orphanEndpoints: 3
};
getWebviewContent() {
  return renderHTML(defaultReport); // Shows sample even if artifacts exist
}
```

### Sprint 11 Action

**Remove sample defaults, gate behind "no artifacts exist" check**:

```typescript
// After Sprint 11
async getWebviewContent() {
  const runId = await runContextService.getActiveRunId();
  
  if (!runId) {
    return renderEmptyState(); // "No artifacts. Run Scan."
  }
  
  const report = await artifactReader.readReport(runId);
  return renderHTML(report); // Real data only
}
```

**Enforcement**: ReportPanel must never show default/sample metrics once `.reposense/` exists.

---

## FEEDBACK 4: Diagram Generator Ambiguity

### Issue Identified

Two diagram generators with unclear relationship:

- `src/services/DiagramGeneratorNew.ts` (spec-based)
- `src/services/llm/ArchitectureDiagramGenerator.ts` (LLM-based)

**Drift Risk**: Unclear which is canonical; UI might regenerate instead of reading pre-generated `.mmd`.

### Sprint 11 Action

**Establish single path; make LLM optional**:

```
Canonical path (deterministic):
  Sprint 10 builds graph.json
  Sprint 10 runs DiagramGeneratorNew
  Outputs: api-overview.mmd, call-flow.mmd, orphan-analysis.mmd
  
Optional augmentation:
  ArchitectureDiagramGenerator can enhance, but not replace

Sprint 11 UI:
  Reads .mmd files only
  No diagram generation in render
```

**Action Item**: During Sprint 11, remove ArchitectureDiagramGenerator from critical path. Keep it as optional async enrichment only.

---

## FEEDBACK 5: Chatbot Unification

### Issue Identified

Two independent chatbot implementations:

- `ChatPanel.ts` → calls `OllamaService` directly (tightly coupled)
- `ChatBotServiceNew.ts` → defines intent/action/schema (not used)

**Impact**: No single chatbot backend; hard to enforce response contract.

### Sprint 11 Action

**Implement unified ChatOrchestrator backend**:

```
New Path:
  ChatPanel (UI only, no logic)
    ↓
  ChatOrchestrator (backend, enforces contract)
    ├─ IntentRouter (detect intent)
    ├─ CommandInvoker (execute commands)
    └─ OllamaService (LLM as adapter, not driver)

Response Contract (mandatory):
  {
    text: "response",
    runId: "run-123",           // MUST include
    nodeLinks: [{nodeId, label}], // when applicable
    suggestedActions: [{...}]   // MUST include ≥1
  }
```

**Action Items**:
1. Create `ChatOrchestrator.ts` (new)
2. Create `IntentRouter.ts` (new, moves logic from ChatBotServiceNew)
3. Refactor `ChatPanel.ts` to call orchestrator only
4. Keep `OllamaService` as adapter behind orchestrator

---

## FEEDBACK 6: Evidence Service Integration

### Issue Identified

`EvidenceServiceNew.ts` is "model/spec-heavy", not integrated.

```typescript
// Current (stubs)
async addEvidence(artifact) { /* not implemented */ }
async linkEvidence(gap, evidence) { /* not implemented */ }
```

### Sprint 11 Action

**Minimal evidence support: index only, no capture yet**:

```
Stub for Sprint 11:
  .reposense/runs/<runId>/evidence/evidence-index.json
  {
    "artifacts": [
      { "type": "log", "file": "run.log", "link": "#L42" },
      { "type": "screenshot", "file": "gap-123.png", "link": null }
    ]
  }
```

**Do NOT implement** in Sprint 11: screenshot capture, video recording, network interception. Just create index stub.

**Acceptance E Requirement**: Chat can reference evidence by type, even if links are stubs.

---

## FEEDBACK 7: Performance Optimizer Timing

### Issue Identified

`PerformanceOptimizerNew.ts` defines worker pools and caching, but Sprint 10 hasn't created artifacts yet.

### Sprint 11 Action

**Defer worker pools; enable artifact caching**:

```
Spring 11 wins (immediate):
  1. Read report.json instead of recompute
  2. Cache graph in memory per active run
  3. Skip re-analyze for unchanged files

Spring 12+ (future):
  1. Worker pools for parallel scans
  2. Incremental analysis triggers
```

**Do NOT build** in Sprint 11: thread pools, worker coordination, external processes.

---

## FEEDBACK 8: Production Hardening Points

### Issue Identified

`ProductionHardeningNew.ts` has recovery patterns but no integration points.

### Sprint 11 Action

**Wire hardening to real failure points Sprint 10 creates**:

```
Failure points to handle:
  1. Partial .reposense/ folder creation → atomic writes (Sprint 10 job)
  2. Interrupted scan → "FAILED" status in meta.json (Sprint 10 job)
  3. Corrupted JSON in artifact read → ArtifactReader validation (Sprint 11)
  4. Active run deleted → RunContextService fallback (Sprint 11)

Sprint 11 handles:
  - ArtifactReader.readGraph() catches JSON parse errors
  - RunContextService falls back to latest when active run missing
  - DiagramPanel shows error state instead of crashing
```

---

## FEEDBACK 9: Fixture Determinism

### Issue Identified

`FixtureSuite.ts` exists but `generateBaselines()` and `validateAgainstFixture()` are unimplemented stubs.

**Workstream B cannot execute.**

### Sprint 11 Action

**Make fixtures real (either checked-in or deterministic generator)**:

```
Option A (Checked-in repos):
  src/test/fixtures/repos/
    ├── simple-rest/
    │   ├── src/UserProfile.tsx
    │   ├── src/ProductList.tsx
    │   └── backend/routes.js (4 endpoints, 2 orphans)
    ├── dynamic-params/
    │   └── backend with /users/:id, /users/{id}, /users/{id:\d+}
    └── mixed-patterns/
        └── Express with middleware + nested routers

Option B (Deterministic generator):
  FixtureSuite.generateSimpleRestFixture()
    → writes to /tmp/reposense-fixtures/simple-rest/
    → guarantees same output every run (no randomness)
```

**Acceptance**: Run fixture suite twice, compare outputs byte-for-byte. Must match 100%.

---

## FEEDBACK 10: Symlink Hazard (Windows)

### Issue Identified

Original Sprint 10 plan used symlinks for `latest` pointer.

### Sprint 11 Action

**This is ALREADY FIXED by Sprint 10** (uses `latest.json`), but verify:

```
✅ .reposense/
    ├── runs/run-001/, run-002/, ...
    └── latest.json  (points to run-002)

Do NOT use symlinks, ever. latest.json is platform-safe.
```

---

## FEEDBACK 11: UI Recompute Pattern

### Issue Identified

Multiple UI panels might call analyzers at render time instead of reading artifacts.

```typescript
// Bad pattern (currently in codebase)
render() {
  const analysis = this.analyzer.scan(); // Called every time panel refreshes
  return renderGaps(analysis);
}
```

### Sprint 11 Action

**Enforce artifact-read-only pattern**:

```typescript
// Good pattern (Sprint 11 standard)
async render() {
  const runId = await this.runContextService.getActiveRunId();
  if (!runId) { return renderEmptyState(); }
  
  const graph = await this.artifactReader.readGraph(runId);
  return renderGaps(graph);
}
```

**Search & Replace during Sprint 11**: Grep for all direct `AnalysisEngine`, `BackendAnalyzer`, `FrontendAnalyzer` calls in `src/providers/`. Move them to backend services only.

---

## FEEDBACK 12: Delta/Trends Missing

### Issue Identified

No comparison between runs; Acceptance C requires it.

```
Acceptance C: "Delta Detection — detect changes run-to-run"
Current: Not implemented anywhere
```

### Sprint 11 Action

**Implement DeltaEngine**:

```
Sprint 10 creates: graph.json (run 1), graph.json (run 2)
Sprint 11 creates: DeltaEngine compares them
  → outputs: delta.json with added/removed/unchanged gaps
  → outputs: trendDirection (IMPROVING/DEGRADING/STABLE)
  → triggers: "Compare Runs" command in chat
```

---

## ENFORCEMENT CHECKLIST

Sprint 11 must enforce these rules (use grep/search patterns):

| Rule | Pattern to Eliminate | Pattern to Enforce |
|------|---------------------|------------------|
| No UI recompute | `AnalysisEngine` in `src/providers/` | `ArtifactReader` in `src/providers/` |
| No sample data | `defaultReport =` in ReportPanel | `!runId ? empty()` pattern |
| Single diagram path | Remove `ArchitectureDiagramGenerator` from critical path | Use `.mmd` files only in UI |
| Unified chat | `ChatPanel.call(OllamaService)` | `ChatPanel.call(ChatOrchestrator)` |
| Run context everywhere | `this.analyzer.scan()` without runId | All UI calls include `runId` context |
| Contract enforcement | Chat response without runId/actions | 100% responses have runId + actions ≥1 |

---

## APPLIED FEEDBACK SUMMARY

✅ Run system consolidated (RunContextService)  
✅ Analysis output persisted (graph.json read path)  
✅ Report panel no sample data  
✅ Diagram generator single path (canonical .mmd)  
✅ Chatbot unified (ChatOrchestrator)  
✅ Evidence indexed (stub for now)  
✅ Performance deferred appropriately  
✅ Hardening integrated to failure points  
✅ Fixtures made real and deterministic  
✅ Symlink hazard already fixed by Sprint 10  
✅ UI recompute pattern eliminated  
✅ Delta engine implemented  

---

**All feedback applied in Sprint 11 Implementation Contract**
