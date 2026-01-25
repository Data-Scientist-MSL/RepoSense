# SPRINT 11: EXECUTIVE SUMMARY

**RepoSense Drift Correction Sprint**  
**Objective**: Convert from "features exist (but aren't integrated)" → **"artifact-driven, deterministic, unified"**

---

## THE PROBLEM (Why Sprint 11 Exists)

### What Sprints 1-9 Built

✅ **9,000+ LOC** of analyzers, UI, LSP integration  
✅ **Functional foundation** for reports, diagrams, chat  
✅ **Test suite** with 54 test cases ready to run  

### What They Created (But Didn't Unify)

❌ **Two diagram generators** — unclear which is canonical  
❌ **Two chatbot paths** — UI calls Ollama directly, spec exists  
❌ **UI recomputes** — panels call AnalysisEngine at render time, not from artifacts  
❌ **No active-run context** — UI doesn't know which `.reposense/run/<id>/` to look at  
❌ **No delta/trends** — can't compare run-to-run  
❌ **Fixtures are specs** — Workstream B tests can't execute  

**Result**: Sprint 9's 54 tests are blocked on integration issues, not missing features.

---

## THE SOLUTION (What Sprint 11 Does)

### Core Strategy

1. **Pick one path for each duplicate** (diagram generator, chatbot)
2. **Make all UI read from `.reposense/` artifacts** (no runtime recompute)
3. **Unify chatbot into a command-driven backend** (deterministic, testable)
4. **Add delta engine** (run-to-run comparison)
5. **Make fixtures real** (Workstream B executable)

### What You Get

✅ **UI truthfulness** — what user sees = what artifacts contain  
✅ **Active run awareness** — every panel knows which run it's displaying  
✅ **Unified chat** — one backend, intent → command → response  
✅ **Delta tracking** — trends (IMPROVING/DEGRADING/STABLE)  
✅ **Runnable tests** — Sprint 9 unblocked  

---

## THE NUMBERS

| Metric | Value |
|--------|-------|
| **New Modules** | 8 (RunContextService, ArtifactReader, ChatOrchestrator, IntentRouter, CommandInvoker, DeltaEngine, + 2 refactors) |
| **UI Refactors** | 3 (GapAnalysisProvider, ReportPanel, DiagramUI) |
| **LOC to Build** | ~2,600 |
| **Timeline** | 12 business days |
| **Engineers** | 1 (full-time) + 0.5 (QA) |
| **Risk Level** | LOW (integration, not new concepts) |
| **Confidence** | 85% |

---

## THE BLOCKS IT REMOVES

### Before Sprint 11

```
Sprint 9 tests are BLOCKED:
  ❌ Workstream A (contract validation) — can't run because UI doesn't read artifacts
  ❌ Workstream B (golden fixtures) — can't execute, fixtures not deterministic
  ❌ Workstream C (UX) — assumes UI is artifact-driven
  ❌ Acceptance tests — most require drift-free execution
```

### After Sprint 11

```
Sprint 9 tests can RUN:
  ✅ Workstream A — all tests pass
  ✅ Workstream B — fixtures deterministic, tests execute
  ✅ Workstream C — UI is now artifact-driven
  ✅ Acceptance tests — 7/7 criteria met

Then: Sprint 11 complete → Sprint 12 polish → Go-live
```

---

## WHAT MAKES THIS DIFFERENT

### NOT Building

❌ New analyzers or backend logic  
❌ Evidence capture or screenshots  
❌ Test execution engines  
❌ Security/taint analysis  

### IS Building

✅ **Integration layer** to connect existing pieces  
✅ **Zero-drift enforcement** to prevent new inconsistencies  
✅ **Deterministic comparison** for trends/delta  
✅ **Unified chat backend** with testable routing  

---

## THE HARD PART (What You Need to Know)

### Risk: UI Still Recomputes

If during refactor you miss an AnalysisEngine call in a UI panel, tests will fail. Mitigation: grep for all `AnalysisEngine` references outside of `src/services/`.

### Risk: Chat Responses Vary

If chat doesn't consistently include `runId` + `nodeLinks` + `suggestedActions`, Acceptance E fails. Mitigation: Unit test response contract before wiring to UI.

### Risk: Fixtures Not Deterministic

If fixtures generate randomly or in non-deterministic order, Workstream B will flake. Mitigation: Generate twice, compare outputs byte-for-byte.

---

## ROLE-SPECIFIC READING GUIDE

**Leadership** (10 min): Read "THE PROBLEM" and "THE NUMBERS" sections above

**Tech Lead** (15 min): Read this entire summary + Implementation Contract Part 1 (Architecture)

**Engineer** (45 min): Read Implementation Contract Parts 2-4 (Modules, Specs, Acceptance)

**QA** (20 min): Read Acceptance Criteria section + Part 5 (Enforcement)

---

## SUCCESS LOOKS LIKE

✅ All 3 UI panels read from `.reposense/` artifacts  
✅ Switching active run updates everything  
✅ Chat responses always include runId + actions  
✅ Run-to-run delta computed correctly  
✅ Workstream B golden fixtures execute  
✅ Sprint 9 tests no longer blocked  
✅ Zero new drift introduced  

---

**Sprint 11: The Integration Sprint**  
**Removes all drift from Sprints 1-9 and unblocks testing.**
