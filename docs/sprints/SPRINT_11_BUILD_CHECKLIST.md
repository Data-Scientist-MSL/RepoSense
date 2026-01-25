# SPRINT 11: BUILD CHECKLIST

**12-Day Sprint • Zero Drift Enforcement • UI Truthfulness**

---

## DAILY EXECUTION GUIDE

### DAY 1: RunContextService Implementation

**Goal**: Single source of truth for active run selection

**Tasks**:
- [ ] Create `src/services/run/RunContextService.ts`
  - [ ] Implement `getActiveRunId()` (workspace state + fallback to latest)
  - [ ] Implement `getLatestSuccessfulRunId()` (scan `.reposense/runs/`)
  - [ ] Implement `loadMeta()` with caching
  - [ ] Implement `getCurrentContext()` aggregator
  - [ ] Add `onActiveRunChanged` event emitter
  - [ ] Parse runId timestamps correctly (Windows-safe)

- [ ] Unit tests for RunContextService
  - [ ] Test: get active run (no selection) → falls back to latest
  - [ ] Test: set active run → persists to workspace state
  - [ ] Test: load metadata → caches result
  - [ ] Test: latest successful run → ignores FAILED/RUNNING

**Code Review Checklist**:
- [ ] No hard-coded paths
- [ ] Windows path handling (path.join, no backslashes)
- [ ] Event emitter fires on active run change
- [ ] Error handling for missing meta.json

**Sign-off**: Commit with message `feat: add RunContextService`

---

### DAY 2: ArtifactReader Implementation

**Goal**: Typed access to all `.reposense/` artifacts

**Tasks**:
- [ ] Create `src/services/run/ArtifactReader.ts`
  - [ ] Implement `readGraph(runId)` with structure validation
  - [ ] Implement `readReport(runId)` 
  - [ ] Implement `readDiagramsIndex(runId)`
  - [ ] Implement `readMermaid(runId, fileName)`
  - [ ] Implement `readDelta(runId)` (nullable)
  - [ ] Implement `readEvidenceIndex(runId)` (nullable, stub)

- [ ] Unit tests for ArtifactReader
  - [ ] Test: read graph → validates nodes/edges arrays exist
  - [ ] Test: read missing artifact → throws descriptive error
  - [ ] Test: read delta (doesn't exist) → returns null, not error
  - [ ] Test: read mermaid → returns string content

**Code Review Checklist**:
- [ ] All methods check file existence before reading
- [ ] JSON parse errors are caught and wrapped
- [ ] Return types match spec exactly
- [ ] No circular dependencies

**Sign-off**: Commit with message `feat: add ArtifactReader`

---

### DAY 3: GapAnalysisProvider Refactor

**Goal**: Read graph.json only, no live scan

**Tasks**:
- [ ] Review current `src/providers/GapAnalysisProvider.ts`
  - [ ] Identify all calls to AnalysisEngine
  - [ ] Map current data flow
  
- [ ] Refactor
  - [ ] Add dependency injection: `RunContextService`, `ArtifactReader`
  - [ ] Replace scan calls with `artifactReader.readGraph(runId)`
  - [ ] Add empty state: "No artifacts. Run Scan to start."
  - [ ] Update tree item transformation to use graph nodes
  - [ ] Wire click handler to navigate via stored path+line

- [ ] Integration tests
  - [ ] Test: tree refresh without artifacts → shows empty state
  - [ ] Test: tree refresh with artifacts → renders gaps from graph
  - [ ] Test: click gap → navigates to source

**Code Review Checklist**:
- [ ] Grep confirms: no `AnalysisEngine` calls in this file
- [ ] Empty state properly styled
- [ ] Node IDs from graph match orphan detection logic
- [ ] Tree expands/collapses work

**Sign-off**: Commit with message `refactor: gap-tree reads graph.json only`

---

### DAY 4: ReportPanel Refactor

**Goal**: Remove sample data, read report.json only

**Tasks**:
- [ ] Review current `src/providers/ReportPanel.ts`
  - [ ] List all hardcoded sample metrics
  - [ ] Check initialization logic
  
- [ ] Refactor
  - [ ] Add dependency injection: `RunContextService`, `ArtifactReader`
  - [ ] Remove hardcoded `defaultReport` object
  - [ ] Replace with: if no runId → `renderEmptyState()`, else read report.json
  - [ ] Update all metric displays to source from artifact
  - [ ] Add "Open Run Folder" button (for dev purposes)

- [ ] Integration tests
  - [ ] Test: panel without artifacts → shows empty state with CTA
  - [ ] Test: panel with artifacts → shows real metrics (no defaults)
  - [ ] Test: switch active run → panel refreshes instantly

**Code Review Checklist**:
- [ ] No `defaultReport` variable remains
- [ ] Empty state visible and styled
- [ ] All metrics match report.json schema
- [ ] No calculation/recomputation in render

**Sign-off**: Commit with message `refactor: report-panel artifact-driven`

---

### DAY 5: DiagramUI Refactor

**Goal**: Read .mmd files, no diagram generation

**Tasks**:
- [ ] Identify diagram provider location
  - [ ] Check `src/providers/` for diagram panel/provider
  - [ ] Confirm it renders diagrams to user
  
- [ ] Refactor
  - [ ] Add dependency injection: `RunContextService`, `ArtifactReader`
  - [ ] Replace diagram generation calls with mermaid file reads
  - [ ] List diagrams from diagrams.json index
  - [ ] Render each .mmd via Mermaid library
  - [ ] Add error state if files missing

- [ ] Integration tests
  - [ ] Test: no artifacts → empty state
  - [ ] Test: with artifacts → lists diagrams from index
  - [ ] Test: click diagram → renders mermaid content
  - [ ] Test: invalid mermaid → shows error gracefully

**Code Review Checklist**:
- [ ] No `DiagramGenerator` calls in render path
- [ ] All diagrams loaded from `.mmd` files
- [ ] Mermaid library correctly configured
- [ ] Fallback for missing files

**Sign-off**: Commit with message `refactor: diagram-ui mermaid-only`

---

### DAY 6: ChatOrchestrator Implementation

**Goal**: Unified chat backend with enforced response contract

**Tasks**:
- [ ] Create `src/services/chat/ChatOrchestrator.ts`
  - [ ] Implement `handleMessage(input: ChatInput)` entry point
  - [ ] Enforce response contract: `{ text, runId, nodeLinks, suggestedActions }`
  - [ ] Get active run context
  - [ ] Check runId exists (return helpful prompt if not)
  - [ ] Delegate to IntentRouter
  - [ ] Load artifacts as needed (graph, report)
  - [ ] Build final response
  - [ ] Ensure suggestedActions always ≥1

- [ ] Create `src/services/chat/IntentRouter.ts`
  - [ ] Implement `detectIntent(message)` → IntentType
  - [ ] Implement `handleExplain(input, graph, report)` → response parts
  - [ ] Implement `handlePlan(input, graph, report)` → response parts
  - [ ] Implement `handleGenerate(input)` → response parts
  - [ ] Implement `handleExecute(input, invoker)` → response parts
  - [ ] Implement `handleAudit(input, graph)` → response parts
  - [ ] Keywords: "explain", "what is", "plan", "how do", "generate", "create", "run", "execute", "audit", "check"

- [ ] Unit tests
  - [ ] Test: every response includes runId
  - [ ] Test: gap-related responses include nodeLinks
  - [ ] Test: every response has ≥1 suggestedActions
  - [ ] Test: intent detection for all 5 types

**Code Review Checklist**:
- [ ] Response contract enforced at orchestrator level
- [ ] IntentRouter is pure (no side effects)
- [ ] Fallback messages for missing runId
- [ ] Error responses also include runId + action

**Sign-off**: Commit with message `feat: add ChatOrchestrator + IntentRouter`

---

### DAY 7: ChatPanel Refactor + CommandInvoker

**Goal**: Wire ChatPanel to orchestrator, implement command invocation

**Tasks**:
- [ ] Create `src/services/chat/CommandInvoker.ts`
  - [ ] Implement `invoke(commandId, args)` → invokes VS Code command
  - [ ] Return `{ success, result?, error? }`
  - [ ] Handle errors gracefully

- [ ] Refactor `src/providers/ChatPanel.ts`
  - [ ] Remove direct OllamaService calls
  - [ ] Add dependency injection: `ChatOrchestrator`
  - [ ] On message input → `orchestrator.handleMessage(input)`
  - [ ] Display response with formatting
  - [ ] Render suggestedActions as clickable buttons
  - [ ] Wire button clicks to `CommandInvoker.invoke()`

- [ ] Integration tests
  - [ ] Test: send message → orchestrator called
  - [ ] Test: response displayed with runId visible
  - [ ] Test: suggested actions clickable
  - [ ] Test: action click invokes command

**Code Review Checklist**:
- [ ] No OllamaService called directly from ChatPanel
- [ ] All commands invoked through CommandInvoker
- [ ] Response contract visible in UI (runId, actions rendered)
- [ ] Error handling for failed commands

**Sign-off**: Commit with message `refactor: chat-panel uses ChatOrchestrator`

---

### DAY 8: DeltaEngine Implementation

**Goal**: Compute run-to-run comparison, persist delta.json

**Tasks**:
- [ ] Create `src/services/delta/DeltaEngine.ts`
  - [ ] Implement `computeDelta(runsDir, baseRunId, currentRunId)` → Delta
  - [ ] Load graph for both runs
  - [ ] Extract orphan node IDs
  - [ ] Compute added/removed/unchanged sets
  - [ ] Load reports for statistics
  - [ ] Compute trend direction (IMPROVING/DEGRADING/STABLE)
  - [ ] Persist to `.reposense/runs/<currentId>/delta/delta.json`

- [ ] Add "Compare Runs" command
  - [ ] Command: `reposense.compareRuns`
  - [ ] UI: Ask user to select base run (or use latest successful)
  - [ ] Call `DeltaEngine.computeDelta()`
  - [ ] Display trend in UI message

- [ ] Unit tests
  - [ ] Test: gaps decreased → IMPROVING trend
  - [ ] Test: gaps increased → DEGRADING trend
  - [ ] Test: gaps same → STABLE trend
  - [ ] Test: delta.json written with correct structure

**Code Review Checklist**:
- [ ] Trend calculation logic verified with examples
- [ ] Delta JSON structure matches spec exactly
- [ ] No side effects (read-only for both graphs)
- [ ] Windows-safe file paths

**Sign-off**: Commit with message `feat: add DeltaEngine + Compare Runs command`

---

### DAY 9: Golden Fixtures Finalization

**Goal**: Make Workstream B runnable with deterministic fixtures

**Tasks**:
- [ ] **Option A: Check-in fixture repos**
  - [ ] Create `src/test/fixtures/repos/simple-rest/`
    - [ ] Add minimal frontend components (UserProfile.tsx, ProductList.tsx, etc.)
    - [ ] Add backend routes (4 endpoints: GET /users/:id, POST /users, GET /products, POST /checkout)
    - [ ] Mark 2 endpoints as orphaned intentionally
  - [ ] Create `src/test/fixtures/repos/dynamic-params/`
    - [ ] Routes with path parameter variants
  - [ ] Create `src/test/fixtures/repos/mixed-patterns/`
    - [ ] Middleware chains, nested routers
  
  **OR**

- [ ] **Option B: Deterministic generator**
  - [ ] Update `src/test/fixtures/FixtureSuite.ts`
  - [ ] Implement `generateSimpleRestFixture()` → deterministic output
  - [ ] Implement `generateDynamicParamsFixture()` → deterministic output
  - [ ] Implement `generateMixedPatternsFixture()` → deterministic output
  - [ ] Write to temp directory
  - [ ] Ensure same output across runs (no random anything)

- [ ] Validate fixtures
  - [ ] Run fixture generation twice
  - [ ] Compare outputs byte-for-byte (must match 100%)
  - [ ] Scan each fixture → verify expected gaps detected

**Code Review Checklist**:
- [ ] Fixtures are deterministic (or checked-in and immutable)
- [ ] FixtureSuite tests can actually run
- [ ] Expected outputs match spec (4 endpoints, 2 orphans, etc.)

**Sign-off**: Commit with message `feat: finalize golden fixtures (Workstream B)`

---

### DAY 10: End-to-End Integration

**Goal**: All modules working together, manual testing

**Tasks**:
- [ ] **Smoke tests**
  - [ ] Start extension
  - [ ] Run scan (triggers Sprint 10 to create artifacts)
  - [ ] Switch active run in UI
  - [ ] Verify all panels update
  - [ ] Open chat, send message
  - [ ] Verify response has runId + actions

- [ ] **Edge cases**
  - [ ] No artifacts → empty states show
  - [ ] Missing active run → fallback to latest
  - [ ] Chat without artifacts → helpful prompt
  - [ ] Compare runs (no delta yet) → graceful handling

- [ ] **Integration verify**
  - [ ] RunContextService + ArtifactReader working
  - [ ] All 3 UI panels artifact-driven
  - [ ] ChatOrchestrator enforcing contract
  - [ ] DeltaEngine computing correctly
  - [ ] Fixtures deterministic

**Code Review Checklist**:
- [ ] No errors in dev console
- [ ] All dependencies injected correctly
- [ ] No hardcoded paths
- [ ] Event emitters working

**Sign-off**: Commit with message `test: integration smoke tests passing`

---

### DAY 11: Sprint 9 Suite Execution

**Goal**: Run Sprint 9 tests, verify no blocks

**Tasks**:
- [ ] **Workstream A: Contract Validation** (all 12 tests must pass)
  - [ ] A1.1: Directory structure creation → PASS
  - [ ] A1.2: meta.json creation → PASS
  - [ ] A1.3: graph.json schema → PASS
  - [ ] A1.4: Error-free completion → PASS
  - [ ] A2.1-A2.5: Multi-run stability → PASS
  - [ ] A3.1-A3.3: Delta detection → PASS

- [ ] **Workstream B: Golden Run Suite** (all 12 tests must execute)
  - [ ] Fixture 1: Simple REST (4 tests) → PASS
  - [ ] Fixture 2: Dynamic params (3 tests) → PASS
  - [ ] Fixture 3: Mixed patterns (3 tests) → PASS
  - [ ] Cross-fixture tests (2 tests) → PASS

- [ ] **Workstream C: UX Integrity** (9+ tests should execute)
  - [ ] UI panel display tests → PASS
  - [ ] Action safety tests → PASS
  - [ ] Chat integrity tests → PASS

- [ ] **Acceptance Tests** (all 7 must pass)
  - [ ] A: Clean install → PASS
  - [ ] B: Multi-run stability → PASS
  - [ ] C: Delta detection → PASS
  - [ ] D: Evidence chain → PASS
  - [ ] E: Chatbot integrity → PASS
  - [ ] F: Export/import → PASS
  - [ ] G: Crash recovery → PASS

**Test command**:
```bash
npm test -- src/test/integration/sprint-9.verification.test.ts
```

**Log any failures** with reproduction steps.

**Sign-off**: Commit with message `test: Sprint 9 suite passes (X/54 tests)`

---

### DAY 12: Polish + Documentation + Sign-Off

**Goal**: Final quality check, document completeness

**Tasks**:
- [ ] **Code quality**
  - [ ] Grep for any remaining `AnalysisEngine` calls in `src/providers/` → delete or comment
  - [ ] JSDoc on all public methods
  - [ ] No `any` types without explanation
  - [ ] Error messages are user-friendly

- [ ] **Test coverage**
  - [ ] Run entire test suite: `npm test`
  - [ ] No new regressions
  - [ ] New modules have unit tests

- [ ] **Documentation**
  - [ ] Update README with "active run" UI feature
  - [ ] Document ChatOrchestrator intents
  - [ ] Add troubleshooting for common drift issues
  - [ ] Document fixture format for contributors

- [ ] **Final AC checklist**
  - [ ] AC1: UI truthfulness ✅ (all panels artifact-driven)
  - [ ] AC2: Run awareness ✅ (switching run updates all)
  - [ ] AC3: Chatbot integrity ✅ (10 messages all valid)
  - [ ] AC4: Delta generation ✅ (trend computed correctly)
  - [ ] AC5: Fixtures runnable ✅ (Workstream B executes)

**Sign-off**: Commit with message `Sprint 11 complete: UI truthfulness + zero drift`

---

## EMERGENCY PROCEDURES

### If Sprint 9 Tests Still Fail on Day 11

1. **Identify failing test**:
   ```bash
   npm test -- --grep "TEST.*" 2>&1 | tee test-failure.log
   ```

2. **Check failure type**:
   - Missing artifact → Sprint 10 issue (not Sprint 11)
   - UI recompute detected → Find and remove AnalysisEngine call
   - Chat response missing runId → Debug ChatOrchestrator contract
   - Delta wrong trend → Check trend logic in DeltaEngine

3. **Fix immediately** (same day if possible):
   - Do not ship with broken tests
   - All AC1-AC5 must pass before Day 12

### If Fixtures Not Deterministic on Day 9

1. **Test determinism**:
   ```bash
   for i in {1..5}; do npm run generate-fixtures > fixture-$i.json; done
   diff fixture-1.json fixture-2.json  # Must be identical
   ```

2. **If files differ**:
   - Check for `Math.random()`, `Date.now()`, `Object.keys()` ordering
   - Use sorted arrays, fixed seeds, or checked-in fixtures instead

3. **Fall back to checked-in repos** if generator can't be made deterministic in 4 hours

---

## DAILY STANDUP TEMPLATE

**Each day, report**:

```
Day X Status:
  ✅ Completed: [module/refactor]
  🔄 In progress: [task]
  ⚠️ Blockers: [issue if any]
  AC Metrics: [% of AC1-AC5 met]
  Test pass rate: [X/54 Sprint 9 tests]
  On track: YES/NO
```

---

## SUCCESS CRITERIA (Day 12 Sign-Off)

✅ **AC1**: All 3 UI panels read artifacts only  
✅ **AC2**: Switching active run updates all panels  
✅ **AC3**: 10 chat messages all include runId + actions  
✅ **AC4**: Delta computed with correct trend  
✅ **AC5**: Workstream B fixtures execute deterministically  
✅ **Bonus**: Workstream C UX tests passing  
✅ **Zero Drift**: No new inconsistencies introduced  
✅ **All Sprint 9 tests**: Minimum Workstream A + B passing  

---

**Sprint 11 Build Checklist: Complete**
