# SPRINT 10: BUILD CHECKLIST & DAILY TRACKER

**Start Date**: [Date]  
**Target Completion**: 10 business days  
**Owner**: [Assign to engineer]  
**Status**: 🟢 READY TO START

---

## PHASE 1: FOUNDATION (Days 1-2) — RunOrchestrator + RunStorage

### Day 1: RunOrchestrator.ts

- [ ] **File created**: `src/services/orchestration/RunOrchestrator.ts`
- [ ] **Methods implemented**:
  - [ ] `constructor(repositoryPath)`
  - [ ] `createRun(config)` → returns runId, creates folder + meta.json
  - [ ] `completeRun(runId, analysisOutput)` → calls ArtifactWriter
  - [ ] `failRun(runId, error)` → writes error to meta.json
  - [ ] `listRuns()` → returns all RunMetadata
  - [ ] `getRun(runId)` → returns specific RunMetadata
  - [ ] `generateRunId()` → deterministic format (NOT random)
- [ ] **Unit tests written**: `src/test/suite/orchestration/RunOrchestrator.test.ts`
- [ ] **Tests passing**: ✓ 6 tests

**Sanity Check**:
```bash
npm test -- src/test/suite/orchestration/RunOrchestrator.test.ts
```

---

### Day 2: RunStorage.ts

- [ ] **File created**: `src/services/orchestration/RunStorage.ts`
- [ ] **Methods implemented**:
  - [ ] `ensureDirectories()` → creates .reposense/runs
  - [ ] `createRunFolder(runId)` → creates structure with report/ + diagrams/
  - [ ] `writeJson(fileName, data, runId)` → atomic write (temp → rename)
  - [ ] `readJson(fileName, runId)` → read + parse
  - [ ] `updateLatestPointer(runId)` → writes latest.json (Windows-safe)
  - [ ] `listAllRuns()` → returns metadata
  - [ ] `deleteRun(runId)` → cleanup
  - [ ] `getArtifactPath(runId, artifactName)` → returns absolute path
- [ ] **Windows compatibility**:
  - [ ] All paths use `path.join()`
  - [ ] No hardcoded backslashes
  - [ ] No symlinks (use latest.json instead)
- [ ] **Atomic write pattern tested**: temp file → rename → delete old
- [ ] **Unit tests written**: `src/test/suite/orchestration/RunStorage.test.ts`
- [ ] **Tests passing**: ✓ 8 tests

**Sanity Check**:
```bash
npm test -- src/test/suite/orchestration/RunStorage.test.ts
```

**Manual Test (Windows)**:
```powershell
# Create a test run, verify .reposense/runs/<id>/ exists
# Verify latest.json exists and contains runId
```

---

## PHASE 2: GRAPH BUILDING (Days 3-4) — GraphBuilder

### Day 3: Stable ID Generation (CRITICAL)

- [ ] **File created**: `src/services/orchestration/GraphBuilder.ts`
- [ ] **Core method**: `generateStableId(endpoint)` ← **MUST PASS TEST A2.1**
  - [ ] Uses crypto.createHash('sha256')
  - [ ] Input: `type|method|normalizedPath|line`
  - [ ] Output: `node-<12-char-hash>`
  - [ ] **NOT timestamp-based**
  - [ ] **NOT random**
  - [ ] **Deterministic**: Same input → Same ID always

- [ ] **Path normalization**: `normalizePath(filePath)`
  - [ ] Windows: `C:\repo\src\api.ts` → `/repo/src/api.ts`
  - [ ] Backslashes → forward slashes
  - [ ] Drive letters removed
  - [ ] Leading slash ensured
  - [ ] **Test on Windows**: Run against fixture with Windows paths

- [ ] **Stability test prepared**: 
```javascript
// Test: Run analyzer 5 times on same repo
// Verify: IDs are identical across all 5 runs
const ids1 = buildGraph(output1).nodes.map(n => n.id);
const ids5 = buildGraph(output5).nodes.map(n => n.id);
// Assert: ids1 === ids5
```

- [ ] **Unit tests written**: `src/test/suite/orchestration/GraphBuilder.test.ts`
- [ ] **Tests passing**: ✓ Stability test + path normalization + hash generation

**Sanity Check** (CRITICAL):
```bash
npm test -- src/test/suite/orchestration/GraphBuilder.test.ts --grep "stable"
```

---

### Day 4: Graph Extraction + Integration

- [ ] **Methods implemented**:
  - [ ] `buildGraph(analysisOutput)` → returns CanonicalGraph
  - [ ] Node extraction from `analysisOutput.endpoints`
  - [ ] Edge extraction from `analysisOutput.calls`
  - [ ] Orphan detection (isOrphan flag)
  - [ ] Statistics calculation (nodeCount, edgeCount, etc.)
- [ ] **Tested against simple-rest fixture**:
  - [ ] 3 endpoints extracted
  - [ ] 2 edges extracted
  - [ ] 1 orphan detected
  - [ ] IDs match expected values
- [ ] **Full unit tests passing**: ✓ 10 tests
- [ ] **Fixture test passing**: `FixtureSuite.validateGraphBuilder(simple-rest)`

**Daily Checklist**:
```bash
npm test -- src/test/suite/orchestration/GraphBuilder.test.ts
npm test -- test/fixtures/simple-rest.graph.test.ts
```

---

## PHASE 3: REPORTING + DIAGRAMS (Days 5-6)

### Day 5: ReportBuilder.ts

- [ ] **File created**: `src/services/orchestration/ReportBuilder.ts`
- [ ] **Methods implemented**:
  - [ ] `buildReport(graph)` → returns Report
  - [ ] `calculateStatistics(graph)` → totals, orphan count, coverage ratio
  - [ ] `generateSummary(stats)` → human-readable text
  - [ ] `analyzeGaps(graph)` → orphan list
- [ ] **Statistics validation**:
  - [ ] `totalEndpoints = nodes.filter(type=ENDPOINT).length`
  - [ ] `orphanEndpoints = nodes.filter(isOrphan=true).length`
  - [ ] `coverageRatio = (total - orphan) / total` (between 0-1)
- [ ] **Unit tests written**: `src/test/suite/orchestration/ReportBuilder.test.ts`
- [ ] **Tests passing**: ✓ 6 tests
- [ ] **Fixture tests passing**: Simple-rest, dynamic-params, mixed-patterns

---

### Day 6: DiagramBuilder.ts

- [ ] **File created**: `src/services/orchestration/DiagramBuilder.ts`
- [ ] **Methods implemented**:
  - [ ] `buildDiagrams(graph)` → returns Diagrams
  - [ ] `generateApiOverviewMermaid(graph)` → graph TD format
  - [ ] `generateCallFlowMermaid(graph)` → graph LR format
  - [ ] `generateOrphanAnalysisMermaid(graph)` → subgraph format
- [ ] **Mermaid validation**:
  - [ ] No syntax errors in generated diagrams
  - [ ] Can be rendered with Mermaid viewer
  - [ ] Orphan count matches report
- [ ] **Unit tests written**: `src/test/suite/orchestration/DiagramBuilder.test.ts`
- [ ] **Tests passing**: ✓ 6 tests
- [ ] **Manual Mermaid validation**: Copy generated .mmd to Mermaid Live Editor

---

## PHASE 4: ORCHESTRATION (Days 7-8) — ArtifactWriter + Extension Wiring

### Day 7: ArtifactWriter.ts

- [ ] **File created**: `src/services/orchestration/ArtifactWriter.ts`
- [ ] **Core method**: `writeAllArtifacts(runId, analysisOutput)`
  - [ ] Instantiates all 4 builders (Graph, Report, Diagram)
  - [ ] Writes scan.json (raw input)
  - [ ] Writes graph.json (builder output)
  - [ ] Writes report/report.json (builder output)
  - [ ] Writes diagrams/diagrams.json (builder output)
  - [ ] Writes individual .mmd files
- [ ] **Order verified**:
  1. Graph first (others depend on it)
  2. Report
  3. Diagrams
- [ ] **Error handling**: Graceful fallback if any step fails
- [ ] **Integration tests written**: `src/test/suite/orchestration/ArtifactWriter.test.ts`
- [ ] **Tests passing**: ✓ 5 integration tests

---

### Day 8: Wire Extension Command

- [ ] **File modified**: `src/extension.ts`
- [ ] **"Scan Repository" command updated**:
  - [ ] Creates RunOrchestrator
  - [ ] Calls `createRun()`
  - [ ] Runs existing analyzer (AnalysisEngine)
  - [ ] Calls `completeRun(runId, output)`
  - [ ] Shows success: "Scan complete! Run ID: {runId}"
  - [ ] Shows error: "Scan failed: {error.message}"
- [ ] **Manual test**:
  - [ ] Open VS Code
  - [ ] Run "Scan Repository" command
  - [ ] Verify .reposense/runs/<id>/ created
  - [ ] Verify all artifacts exist
  - [ ] Verify can read .reposense/runs/<id>/meta.json

---

## PHASE 5: TESTING (Days 9-10) — Sprint 9 Validation

### Day 9: Contract Validation (Workstream A Tests)

- [ ] **Test file**: `src/test/suite/sprint-9/workstream-a.test.ts`
- [ ] **All 12 tests ready**:

| Test | Validates | Status |
|------|-----------|--------|
| A1.1 | meta.json exists | ⬜ |
| A1.2 | meta.json schema | ⬜ |
| A1.3 | meta.json status | ⬜ |
| A1.4 | meta.json timestamps | ⬜ |
| A2.1 | Stable IDs (5 scans) | ⬜ |
| A2.2 | graph.json exists | ⬜ |
| A2.3 | graph.json nodes | ⬜ |
| A2.4 | graph.json edges | ⬜ |
| A3.1 | report.json exists | ⬜ |
| A3.2 | report.json stats | ⬜ |
| A3.3 | report.json coverage | ⬜ |
| A4.1 | diagrams.json exists | ⬜ |

**Run all tests**:
```bash
npm test -- src/test/suite/sprint-9/workstream-a.test.ts
```

**Expected**: 12/12 ✅ passing

### Day 10: Final Validation + Polish

- [ ] **Rerun all Workstream A tests**: ✓ 12/12
- [ ] **Fixture tests all passing**:
  - [ ] `simple-rest` → 3 endpoints, 1 orphan
  - [ ] `dynamic-params` → 8 endpoints, 3 orphans
  - [ ] `mixed-patterns` → 12 endpoints, 5 orphans
- [ ] **Code quality**:
  - [ ] No `any` types (use explicit types)
  - [ ] JSDoc comments on all public methods
  - [ ] Error messages are descriptive
  - [ ] No console.log (use proper logging)
- [ ] **Windows compatibility verified**:
  - [ ] Run on Windows machine
  - [ ] Test with Windows file paths
  - [ ] Verify no symlink issues
  - [ ] Verify latest.json works
- [ ] **Documentation**:
  - [ ] README for each module
  - [ ] API docs complete
  - [ ] Example usage documented

**Final checks**:
```bash
# Compile
npm run compile

# Unit tests
npm test -- src/test/suite/orchestration/

# Integration tests
npm test -- src/test/suite/sprint-9/workstream-a.test.ts

# Fixture tests
npm test -- test/fixtures/
```

---

## FIXTURE REPOSITORIES CHECKLIST

### Fixture 1: simple-rest

- [ ] **Location**: `test/fixtures/simple-rest/`
- [ ] **Structure**:
  ```
  simple-rest/
  ├── src/
  │   ├── api.ts          (3 REST endpoints)
  │   ├── server.ts       (calls 2 of them)
  │   └── unused.ts       (orphan endpoint)
  ├── package.json
  └── fixture-output.json (expected analysis output)
  ```
- [ ] **Expected**:
  - [ ] 3 total endpoints
  - [ ] 1 orphan
  - [ ] 2 edges
  - [ ] Coverage: 67%
- [ ] **Documentation**: `README.md` explains structure + expected outputs

### Fixture 2: dynamic-params

- [ ] **Location**: `test/fixtures/dynamic-params/`
- [ ] **Structure**:
  ```
  dynamic-params/
  ├── src/
  │   ├── users.ts        (5 endpoints with :id, :uuid)
  │   ├── products.ts     (3 endpoints with patterns)
  │   └── routes.ts       (calls some)
  ├── package.json
  └── fixture-output.json
  ```
- [ ] **Expected**:
  - [ ] 8 total endpoints
  - [ ] 3 orphans
  - [ ] 5 edges
  - [ ] Coverage: 38%
- [ ] **Documentation**: README

### Fixture 3: mixed-patterns

- [ ] **Location**: `test/fixtures/mixed-patterns/`
- [ ] **Structure**:
  ```
  mixed-patterns/
  ├── src/
  │   ├── auth.ts         (middleware endpoints)
  │   ├── handlers.ts     (event handlers)
  │   ├── services.ts     (service layer)
  │   └── index.ts        (orchestrator)
  ├── package.json
  └── fixture-output.json
  ```
- [ ] **Expected**:
  - [ ] 12 total endpoints
  - [ ] 5 orphans
  - [ ] 8 edges
  - [ ] Coverage: 58%
- [ ] **Documentation**: README

---

## DAILY STANDUP FORMAT

Use this template each day:

### Day X: [Phase Name]

**Completed Today**:
- [ ] Task 1: [Status]
- [ ] Task 2: [Status]

**Test Results**:
```
npm test -- [test file]
# Expected: N/N ✅ passing
# Actual: [Result]
```

**Blockers**:
- None / [List any]

**Tomorrow**:
- [ ] Task 1
- [ ] Task 2

**Notes**:
- [Any findings or decisions]

---

## SIGN-OFF CRITERIA

When all of the following are ✅:

```
✅ RunOrchestrator.ts implemented + 6 tests passing
✅ RunStorage.ts implemented + 8 tests passing
✅ GraphBuilder.ts implemented + 10 tests passing (IDs stable)
✅ ReportBuilder.ts implemented + 6 tests passing
✅ DiagramBuilder.ts implemented + 6 tests passing
✅ ArtifactWriter.ts implemented + 5 tests passing
✅ Extension wired to orchestrator
✅ All 3 fixture repos checked in + documented
✅ All 12 Contract Validation tests (A1.1-A4.1) passing
✅ Code quality review completed
✅ Windows compatibility verified
```

→ **Sprint 10 is DONE** ✅

---

## RISK FLAGS

Watch for these during the build:

| Flag | Action |
|------|--------|
| **IDs not stable** | Stop. Review hash function. Test with fixture. |
| **Windows path fails** | Stop. Fix path logic. Re-test on Windows. |
| **Tests can't find artifacts** | Stop. Check if files being written. Use debugger. |
| **Atomic writes failing** | Stop. Test temp→rename pattern. Check permissions. |
| **Any test still not passing** | Don't move forward. Debug the specific test. |

---

## QUESTIONS FOR OWNER

Before starting:

1. **Can I assume existing AnalysisEngine.ts produces `{endpoints: [], calls: []}`?**
2. **Should runId be UUID or timestamp-based?**
3. **Any specific logging framework (Winston, etc.) or console is OK?**
4. **Should we support Node.js 14, 16, or 18+?**

---

## SUCCESS MESSAGE

When complete:

> ✅ **Sprint 10 Complete**
> 
> All 12 Contract Validation tests passing.
> 
> Run artifacts persisted to `.reposense/runs/<id>/`.
> 
> Sprint 9 tests unblocked.
> 
> Ready for Workstream B (golden run validation).

---

**Checklist Owner**: [Assign]  
**Last Updated**: [Today's Date]  
**Status**: 🟢 Ready to Start
