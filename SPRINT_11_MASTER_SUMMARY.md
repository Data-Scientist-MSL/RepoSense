# SPRINT 11: MASTER SUMMARY

**Complete Sprint 11 Package • UI Truthfulness & Zero Drift • 12-Day Build Sprint**

---

## WHAT THIS IS

A **comprehensive, production-ready sprint plan** for converting RepoSense from "features exist but aren't integrated" to **"artifact-driven, deterministic, unified, run-aware."**

**Timeline**: 12 business days (after Sprint 10 completes)  
**Scope**: 2,600 LOC (~8 modules)  
**Risk**: LOW (integration, not new logic)  
**Confidence**: 85%

---

## WHY SPRINT 11 EXISTS

### The Problem (From Technical Review)

Sprints 1-9 built 9,000+ LOC of analyzers, UI, and services, but created **8 drift issues**:

1. ❌ **Two diagram generators** (unclear which is canonical)
2. ❌ **Two chatbot paths** (UI calls Ollama directly; spec exists unused)
3. ❌ **UI recomputes analysis** (panels call AnalysisEngine, not read artifacts)
4. ❌ **No active-run context** (UI doesn't know which `.reposense/run/` it's showing)
5. ❌ **No delta/trends** (can't compare run-to-run)
6. ❌ **Fixtures are stubs** (Workstream B tests can't execute)
7. ❌ **Sample data in UI** (hardcoded defaults mask missing artifacts)
8. ❌ **Path assumptions** (Windows symlinks, hardcoded paths)

### The Impact

**Sprint 9's 54 tests are BLOCKED** on integration issues, not missing features:
- Workstream A can't verify because UI isn't artifact-driven
- Workstream B can't run because fixtures aren't deterministic
- Workstream C tests assume UI reads from `.reposense/` (not true yet)
- Acceptance tests fail because chatbot responses lack runId + actions

---

## THE SOLUTION

### 3-Layer Strategy

**Layer 1: Unify (Pick one path for each)**
- One chatbot backend (ChatOrchestrator)
- One diagram rendering (canonical .mmd files)
- One run persistence (RunContextService + ArtifactReader)

**Layer 2: Artifact-Drive (UI reads only, doesn't compute)**
- GapAnalysisProvider → reads graph.json (not live scan)
- ReportPanel → reads report.json (no sample defaults)
- DiagramUI → reads .mmd files (no runtime generation)

**Layer 3: Add Missing Features**
- DeltaEngine (run-to-run comparison)
- Deterministic fixtures (Workstream B executable)
- Active-run context (every panel knows which run)

### Result

✅ **UI truthfulness** (what user sees = what artifacts contain)  
✅ **Zero drift** (no competing implementations)  
✅ **Unified chat** (testable, deterministic backend)  
✅ **Runnable tests** (Sprint 9 unblocked)  
✅ **Windows-safe** (no symlinks, proper path handling)

---

## DOCUMENTS IN THIS PACKAGE

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **SPRINT_11_IMPLEMENTATION_CONTRACT.md** | Complete module specs + skeleton code | 60 min |
| **SPRINT_11_EXECUTIVE_SUMMARY.md** | High-level overview for leadership | 10 min |
| **SPRINT_11_BUILD_CHECKLIST.md** | Daily task breakdown (Day 1-12) | 30 min |
| **SPRINT_11_QUICK_REFERENCE.md** | One-page reference card | 5 min |
| **SPRINT_11_TECHNICAL_FEEDBACK_APPLIED.md** | How feedback was incorporated | 25 min |
| **SPRINT_11_DRIFT_FORENSICS.md** | How to detect and eliminate drift | 40 min |

---

## ROLE-SPECIFIC READING GUIDE

### If You're the **Engineer Building Sprint 11**

1. **Start here**: SPRINT_11_QUICK_REFERENCE.md (5 min)
   - Understand the 8 modules at a glance
   - Learn the zero-drift rules
   - See daily focus

2. **Read next**: SPRINT_11_IMPLEMENTATION_CONTRACT.md (60 min)
   - Full module specifications
   - Skeleton code for each
   - Acceptance criteria
   - Implementation sequence

3. **Use daily**: SPRINT_11_BUILD_CHECKLIST.md
   - Day-by-day task breakdown
   - Tests to run each day
   - Code review checklist for each module

4. **Reference**: SPRINT_11_DRIFT_FORENSICS.md
   - When unsure if code has drift
   - Search patterns to verify
   - Common mistakes to avoid

### If You're the **Tech Lead**

1. **Start here**: SPRINT_11_EXECUTIVE_SUMMARY.md (10 min)
2. **Deep dive**: SPRINT_11_IMPLEMENTATION_CONTRACT.md (Part 1 - Architecture) (20 min)
3. **Enforce**: SPRINT_11_DRIFT_FORENSICS.md (code review checklist)
4. **Monitor**: SPRINT_11_BUILD_CHECKLIST.md (daily standups, blockers)

### If You're **QA**

1. **Start here**: SPRINT_11_QUICK_REFERENCE.md (5 min - AC1-AC5)
2. **Read**: SPRINT_11_IMPLEMENTATION_CONTRACT.md (Part 3 - Acceptance Criteria) (15 min)
3. **Build tests**: `npm test -- src/test/integration/sprint-9.verification.test.ts`
4. **Verify**: All AC1-AC5 criteria pass by Day 12

### If You're **Leadership**

1. **Read**: SPRINT_11_EXECUTIVE_SUMMARY.md (10 min) — The entire story
2. **Skim**: SPRINT_11_IMPLEMENTATION_CONTRACT.md sections on risk (Part 5)
3. **Decision**: "Do we approve this sprint plan?" → YES if all documents reviewed

---

## 8 MODULES (What's Built)

### NEW (5 modules, ~1,300 LOC)

1. **RunContextService** (250 LOC)
   - Tracks which run is active (workspace state + fallback to latest)
   - Emits events when active run changes
   - All UI panels depend on this

2. **ArtifactReader** (300 LOC)
   - Typed access to `.reposense/` artifacts
   - Read: graph.json, report.json, diagrams.json, delta.json, evidence-index.json
   - Validates structure before returning

3. **ChatOrchestrator** (400 LOC)
   - Unified chat backend
   - Enforces response contract: `{runId, nodeLinks, suggestedActions}`
   - Routes to IntentRouter

4. **IntentRouter + CommandInvoker** (350 LOC)
   - Detects intent: EXPLAIN, PLAN, GENERATE, EXECUTE, AUDIT
   - Maps intents to handlers
   - Invokes VS Code commands

5. **DeltaEngine** (300 LOC)
   - Compares two runs
   - Computes trend: IMPROVING | DEGRADING | STABLE
   - Persists delta.json

### REFACTOR (3 modules, ~1,300 LOC affected)

6. **GapAnalysisProvider** (refactor)
   - Remove: AnalysisEngine scan calls
   - Add: Read graph.json from ArtifactReader
   - Add: Empty state if no artifacts

7. **ReportPanel** (refactor)
   - Remove: hardcoded sample metrics
   - Add: Read report.json only
   - Add: Empty state if no artifacts

8. **DiagramUI** (refactor)
   - Remove: diagram generation in render
   - Add: Read .mmd files from diagrams/
   - Add: Use diagrams.json as index

---

## ZERO DRIFT RULES (Enforced)

### Rule 1: Single Source of Truth per Feature

| Feature | Canonical Path | Remove |
|---------|---|---|
| **Chat** | ChatPanel → ChatOrchestrator → IntentRouter → Commands | Direct OllamaService calls |
| **Diagrams** | Read .mmd files from diagrams/ | ArchitectureDiagramGenerator from critical path |
| **Gap analysis** | Read graph.json | AnalysisEngine calls in UI |
| **Run persistence** | RunContextService + ArtifactReader | RunRepositoryNew (consolidate) |

### Rule 2: Artifact-Driven UI

```
✓ All panels read from .reposense/runs/<runId>/
✗ No UI code calls AnalysisEngine
✗ No hardcoded sample data
✗ No live recompute during render
```

### Rule 3: Active Run Context Everywhere

```
✓ Every panel knows active runId
✓ UI shows active runId in status bar
✓ Switching run updates all panels
✗ No run-agnostic rendering
```

### Rule 4: Chat Response Contract

Every response must include:
```json
{
  "runId": "run-123",
  "nodeLinks": [{"nodeId": "...", "label": "..."}],
  "suggestedActions": [{"label": "...", "commandId": "..."}]
}
```

### Rule 5: Determinism

```
✓ Fixtures generate identically across 5 runs
✓ No randomness, no timestamps, no Object.keys() ordering
✗ Math.random(), Date.now() in fixture generation
```

---

## ACCEPTANCE CRITERIA (Must All Pass)

### AC1 — UI Truthfulness
**Test**: All 3 UI panels (Gap tree, Report, Diagrams) render from artifacts with no live computation.
**Pass condition**: Grep shows zero AnalysisEngine calls in src/providers/

### AC2 — Run Awareness
**Test**: Switching active run via "Switch Run" command updates all panels instantly.
**Pass condition**: Manual test: select different run → all panels refresh

### AC3 — Chatbot Integrity
**Test**: 10 consecutive chat messages all include runId + nodeLinks (if applicable) + ≥1 suggestedActions.
**Pass condition**: Unit test passes

### AC4 — Delta Generation
**Test**: After modifying repo (add/remove endpoint), new run produces correct delta.json with accurate trend.
**Pass condition**: Manual test: 2 runs with known changes → delta.json matches expectations

### AC5 — Fixtures Deterministic
**Test**: Workstream B golden fixtures execute on real repos (checked-in or generated).
**Pass condition**: `npm test -- Workstream B` → 12/12 tests pass

---

## IMPLEMENTATION SEQUENCE (No Ambiguity)

```
Day 1:   RunContextService
Day 2:   ArtifactReader
Day 3:   GapAnalysisProvider refactor
Day 4:   ReportPanel refactor
Day 5:   DiagramUI refactor
Day 6:   ChatOrchestrator + IntentRouter
Day 7:   ChatPanel refactor + CommandInvoker
Day 8:   DeltaEngine + Compare Runs command
Day 9:   Golden fixtures (checked-in or generated)
Day 10:  End-to-end integration + smoke tests
Day 11:  Sprint 9 suite execution (54 tests)
Day 12:  Polish + AC sign-off
```

**Critical path**: Days 1-2 (foundation) → Days 3-5 (UI unification) → Days 6-8 (backend + delta) → Day 9 (fixtures) → Days 10-12 (integration & testing)

---

## RISK MITIGATION

| Risk | Likelihood | Impact | Mitigation |
|------|----------|--------|-----------|
| Chat not unified | Medium | High | Daily review of chat refactoring |
| UI still recomputes | Medium | High | Grep for AnalysisEngine in providers/ (every day) |
| Fixtures not deterministic | Low | Medium | Test fixtures 5x, compare outputs |
| Delta logic wrong | Medium | Medium | Unit tests with known base/current pairs |
| Scope creep | High | High | Hard scope gate: only these 8 modules |

---

## BLOCKERS & DEPENDENCIES

**Depends On**:
- Sprint 10 MUST be complete (`.reposense/` artifacts exist)
- Test framework (Mocha + Assert) must be available

**Blocks**:
- Sprint 12 (can't ship without drift fixed)
- Sprint 9 tests (unblocked once Sprint 11 complete)

**Does NOT Block**:
- Other teams (isolated to RepoSense)
- CI/CD (can be wired after)

---

## SUCCESS LOOKS LIKE (Day 12)

✅ **AC1-AC5 all passing**  
✅ **Sprint 9 Workstream A + B tests pass**  
✅ **No AnalysisEngine calls in UI** (grep: 0 matches)  
✅ **Chat responses include runId + actions** (10/10 valid)  
✅ **Fixtures deterministic** (generated 5x, outputs match)  
✅ **Active run visible in UI** (status bar shows runId)  
✅ **All panels refresh on run switch** (tested manually)  
✅ **Delta computed correctly** (trend accurate)  
✅ **Zero new drift introduced** (forensics check passes)  
✅ **Code reviewed** (all modules JSDoc'd, no `any` types)

---

## COMMON MISTAKES (AVOID THESE)

❌ Leave `AnalysisEngine` calls in `src/providers/`  
→ Defeats entire AC1 goal; search daily

❌ Keep hardcoded sample data in ReportPanel  
→ Users see fake data; delete defaults

❌ Make fixtures with `Math.random()` or `Date.now()`  
→ Tests flake; Workstream B unexecutable

❌ Chat responses without `runId`  
→ Fails AC3; enforce at orchestrator level

❌ Use symlinks for `latest` pointer  
→ Breaks on Windows; use `latest.json`

❌ Refactor chat but leave OllamaService in ChatPanel  
→ Still two paths; must be single flow

---

## AFTER SPRINT 11

### Immediately (Day 12)

- ✅ Deploy Sprint 11 code to staging
- ✅ Run full Sprint 9 suite (54 tests)
- ✅ Demo to stakeholders
- ✅ Get sign-off

### Next (Sprint 12 - Polish)

- 🔄 Handle edge cases Workstream C tests reveal
- 🔄 Optimize performance (caching, incremental scans)
- 🔄 Complete evidence capture (if in scope)

### Go-Live

- 🚀 All tests passing
- 🚀 No drift
- 🚀 Zero known bugs
- 🚀 Production-ready

---

## QUICK START

1. **Engineer**: Read SPRINT_11_QUICK_REFERENCE.md (5 min)
2. **Engineer**: Read SPRINT_11_IMPLEMENTATION_CONTRACT.md (60 min)
3. **Tech Lead**: Review SPRINT_11_DRIFT_FORENSICS.md (20 min)
4. **Team**: Start Day 1 with SPRINT_11_BUILD_CHECKLIST.md

---

## CONTACT / QUESTIONS

**If you have questions about...**

- **Module specifications**: See SPRINT_11_IMPLEMENTATION_CONTRACT.md (Part 2)
- **Daily tasks**: See SPRINT_11_BUILD_CHECKLIST.md (Day X section)
- **What constitutes drift**: See SPRINT_11_DRIFT_FORENSICS.md (Drift Type 1-8)
- **Acceptance criteria**: See SPRINT_11_IMPLEMENTATION_CONTRACT.md (Part 3)
- **Executive summary**: See SPRINT_11_EXECUTIVE_SUMMARY.md

---

**SPRINT 11: READY TO BUILD**

**Status**: All 6 planning documents complete  
**Scope**: 2,600 LOC, 8 modules  
**Timeline**: 12 business days  
**Confidence**: 85%  
**Dependency**: Sprint 10 must be 100% complete  

**Next Step**: Engineer reads SPRINT_11_QUICK_REFERENCE.md, then starts Day 1 of SPRINT_11_BUILD_CHECKLIST.md

---

*Sprint 11 Package compiled: January 21, 2026*  
*All feedback from technical review applied and integrated*  
*Zero drift by design*
