# SPRINT 11: QUICK REFERENCE CARD

**One-page Sprint 11 at a glance**

---

## PROBLEM → SOLUTION

| Problem | Sprint 11 Solution |
|---------|------------------|
| Two diagram generators (drift) | Pick one canonical path (DiagramGeneratorNew); remove ArchitectureDiagramGenerator from critical path |
| Two chatbot paths (drift) | Unify: ChatPanel → ChatOrchestrator → IntentRouter → Commands |
| UI recomputes analysis | Refactor: UI reads `.reposense/` artifacts only (no AnalysisEngine calls) |
| No active-run context | Add RunContextService (workspace state + fallback to latest) |
| No run comparison | Add DeltaEngine (compare graphs → delta.json → trend) |
| Fixtures are stubs | Make real: checked-in repos OR deterministic generator |

---

## 8 MODULES (2,600 LOC)

### NEW Modules (5)

1. **RunContextService** (250 LOC)
   - Knows which run is active
   - Fallback: latest successful
   - `getActiveRunId()`, `setActiveRunId()`, `getCurrentContext()`

2. **ArtifactReader** (300 LOC)
   - Read graph, report, diagrams, delta from disk
   - Validate structure
   - `readGraph()`, `readReport()`, `readMermaid()`, `readDelta()`

3. **ChatOrchestrator** (400 LOC)
   - Unified chat backend
   - Enforce response contract: `{runId, nodeLinks, suggestedActions}`
   - `handleMessage(input) → ChatResponse`

4. **IntentRouter** (250 LOC)
   - Detect intent: EXPLAIN, PLAN, GENERATE, EXECUTE, AUDIT
   - `detectIntent()` + handlers for each
   - Keywords-based routing (can upgrade to ML)

5. **DeltaEngine** (350 LOC)
   - Compare two runs
   - Compute trend: IMPROVING | DEGRADING | STABLE
   - `computeDelta()` → persist delta.json

### REFACTOR Modules (3)

6. **GapAnalysisProvider** (refactor)
   - Remove: AnalysisEngine scan calls
   - Add: Read graph.json from ArtifactReader
   - Empty state: "No artifacts. Run Scan."

7. **ReportPanel** (refactor)
   - Remove: hardcoded sample metrics
   - Add: Read report.json only
   - Empty state if no artifacts

8. **DiagramUI** (refactor)
   - Remove: diagram generation in render
   - Add: Read .mmd files from diagrams/
   - Use diagrams.json as index

---

## RESPONSE CONTRACT (Mandatory)

Every chat response **must** include:

```typescript
{
  text: "response",
  runId: "run-123",                      // MANDATORY
  nodeLinks: [
    { nodeId: "node-abc", label: "GET /users/:id" }  // when applicable
  ],
  suggestedActions: [                    // MANDATORY (≥1)
    { label: "View Report", commandId: "reposense.openReport" }
  ]
}
```

**Enforcement**: ChatOrchestrator ensures every response satisfies this.

---

## ZERO DRIFT RULES

| Rule | Enforce | Check |
|------|---------|-------|
| **One chat path** | ChatPanel → ChatOrchestrator (not direct Ollama) | `grep OllamaService src/providers/ChatPanel.ts` → 0 matches |
| **One diagram path** | Use .mmd files (not runtime generation) | `grep DiagramGenerator src/providers/` → 0 matches |
| **UI artifact-driven** | All panels read `.reposense/` (not live scan) | `grep AnalysisEngine src/providers/` → 0 matches |
| **Run context everywhere** | Every UI action knows active runId | UI shows active run in status bar |
| **Contract enforcement** | All chat responses valid | 10 messages tested → 100% valid |
| **Delta & trends** | Runs compared, trend computed | delta.json exists + trendDirection accurate |

---

## DAILY FOCUS (12 Days)

```
Day 1:  RunContextService
Day 2:  ArtifactReader
Day 3:  GapAnalysisProvider refactor
Day 4:  ReportPanel refactor
Day 5:  DiagramUI refactor
Day 6:  ChatOrchestrator + IntentRouter
Day 7:  ChatPanel refactor + CommandInvoker
Day 8:  DeltaEngine + Compare Runs command
Day 9:  Golden fixtures (checked-in or generated)
Day 10: End-to-end integration + smoke tests
Day 11: Sprint 9 suite execution (54 tests)
Day 12: Polish + AC sign-off
```

---

## TEST COMMAND

```bash
# Run all Sprint 9 tests
npm test -- src/test/integration/sprint-9.verification.test.ts

# Expected: 54/54 passing
# Minimum: Workstream A (12) + B (12) passing
```

---

## ACCEPTANCE CRITERIA (AC1-AC5)

| AC | Test | Pass? |
|----|------|-------|
| **AC1** | Gap tree, Report panel, Diagrams render from artifacts (no recompute) | ✅ |
| **AC2** | Switching active run updates all panels | ✅ |
| **AC3** | 10 chat messages → 100% include runId + nodeLinks + actions | ✅ |
| **AC4** | Delta computed correctly, trendDirection accurate | ✅ |
| **AC5** | Workstream B fixtures execute, 12/12 pass | ✅ |

---

## COMMON MISTAKES (Avoid These)

❌ **Leave AnalysisEngine calls in UI panels**  
→ Search for `AnalysisEngine` in `src/providers/`; delete every call

❌ **Keep hardcoded sample report data**  
→ Delete `defaultReport =` from ReportPanel; gate behind `!runId` check

❌ **Chat responses without runId**  
→ ChatOrchestrator enforces; test 10 messages

❌ **Fixtures with random generation**  
→ Run twice; outputs must match 100%

❌ **Diagram generation in render**  
→ Only read `.mmd` files in UI; no DiagramGenerator calls

❌ **Symlinks for latest pointer**  
→ Use `latest.json` (already done in Sprint 10; just verify)

---

## CRITICAL FILES TO MODIFY

```
Create (NEW):
  src/services/run/RunContextService.ts
  src/services/run/ArtifactReader.ts
  src/services/chat/ChatOrchestrator.ts
  src/services/chat/IntentRouter.ts
  src/services/chat/CommandInvoker.ts
  src/services/delta/DeltaEngine.ts

Refactor (EXISTING):
  src/providers/GapAnalysisProvider.ts
  src/providers/ReportPanel.ts
  src/providers/DiagramPanel.ts (or equivalent)
  src/providers/ChatPanel.ts

Fixtures:
  src/test/fixtures/FixtureSuite.ts (update or check in repos)
  src/test/fixtures/repos/* (new repos or generated)
```

---

## SEARCH & REPLACE TARGETS

**Find all violations of "UI artifact-driven" rule**:

```bash
grep -r "AnalysisEngine" src/providers/
grep -r "BackendAnalyzer" src/providers/
grep -r "FrontendAnalyzer" src/providers/
grep -r "DiagramGenerator" src/providers/
```

**All matches should be 0 after Sprint 11 refactor.**

---

## SPRINT 10 DEPENDENCY

Sprint 11 assumes Sprint 10 completed:

✅ `.reposense/runs/<runId>/` exists  
✅ meta.json, scan.json, graph.json created  
✅ report.json, diagrams/*.mmd generated  
✅ latest.json pointer active  
✅ Stable IDs deterministic  

**Do NOT start Sprint 11 until Sprint 10 finishes.**

---

## EMERGENCY STOPS

**If on Day 11, Sprint 9 tests still fail**:

1. Check failure type (artifact missing vs. logic error)
2. If missing artifact → Sprint 10 not done; don't continue
3. If logic error → fix immediately (that day)
4. All AC1-AC5 must pass before Day 12

**If fixtures not deterministic on Day 9**:

1. Run generation 5x, compare outputs
2. If different → check for randomness (Date.now, Math.random, Object.keys ordering)
3. If can't fix in 4 hours → fall back to checked-in fixture repos

---

**Sprint 11: Zero Drift, Artifact-Driven, Unified Backend**
