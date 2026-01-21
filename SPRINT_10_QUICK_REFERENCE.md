# SPRINT 10: QUICK REFERENCE CARD

**Print this. Put it on your desk. Reference daily.**

---

## THE MISSION (One Sentence)

Wrap existing analyzers with filesystem persistence so Sprint 9 tests can run.

---

## THE ARCHITECTURE (5 Modules)

```
Analyzer (existing)
    ↓ scan.json
    ↓
GraphBuilder (new) → graph.json
ReportBuilder (new) → report.json
DiagramBuilder (new) → diagrams.json
    ↓
RunStorage (new) → .reposense/runs/<id>/
    ↓
RunOrchestrator (new) → lifecycle management
```

---

## WHAT TO BUILD (6 Files)

| File | LOC | Purpose | Key Method | Days |
|------|-----|---------|------------|------|
| RunOrchestrator.ts | 200 | Lifecycle | `createRun()`, `completeRun()` | 1 |
| RunStorage.ts | 300 | I/O | `writeJson()`, `readJson()` | 1 |
| GraphBuilder.ts | 400 | Transform | `buildGraph()`, `generateStableId()` | 2 |
| ReportBuilder.ts | 250 | Summarize | `buildReport()` | 1 |
| DiagramBuilder.ts | 200 | Visualize | `buildDiagrams()` | 1 |
| ArtifactWriter.ts | 150 | Orchestrate | `writeAllArtifacts()` | 1 |

**Total**: ~1,500 LOC, 2 weeks

---

## THE CRITICAL PIECE: STABLE IDs

### Generate Once, Match Forever

```typescript
generateStableId(endpoint): string {
  const input = `${type}|${method}|${normalized_path}|${line}`;
  const hash = sha256(input).substring(0, 12);
  return `node-${hash}`;
}
```

### Gotchas

❌ Don't use: timestamps, random, file order, absolute paths  
✅ Do use: hash, immutable properties, normalized paths

### Test

```bash
npm test -- GraphBuilder.test.ts --grep "stable"
```

**Must pass**: Same ID across 5 consecutive scans

---

## THE DIRECTORY STRUCTURE

```
.reposense/
├── runs/
│   ├── run-20260121-153022/
│   │   ├── meta.json
│   │   ├── scan.json
│   │   ├── graph.json
│   │   ├── report/
│   │   │   └── report.json
│   │   └── diagrams/
│   │       ├── diagrams.json
│   │       ├── api-overview.mmd
│   │       ├── call-flow.mmd
│   │       └── orphan-analysis.mmd
│   └── ...
└── latest.json
```

---

## THE TEST ASSERTIONS (12 Checks)

| Test | Checks |
|------|--------|
| A1.x | meta.json: exists, schema, status, timestamps |
| A2.x | graph.json: exists, stable IDs, node/edge counts |
| A3.x | report.json: exists, statistics, coverage |
| A4.x | diagrams.json: exists |

**All must pass** before Sprint 10 is done.

---

## DAILY WORKFLOW

### Morning

```bash
git pull
npm install
npm run compile
```

### Build

Edit one module (RunOrchestrator → RunStorage → ... → ArtifactWriter)

### Afternoon

```bash
# Unit tests for your module
npm test -- src/test/suite/orchestration/[ModuleName].test.ts

# Integration (if ready)
npm test -- src/test/suite/sprint-9/workstream-a.test.ts

# Fixture test
npm test -- test/fixtures/simple-rest.test.ts
```

### Log Results in SPRINT_10_BUILD_CHECKLIST.md

---

## WINDOWS COMPATIBILITY RULES

✅ Use `path.join()` everywhere  
✅ Normalize paths (backslash → forward slash)  
✅ Use latest.json (no symlinks)  
✅ Test on Windows (not just Linux)  
✅ Atomic writes (temp → rename)

---

## CODE QUALITY

Every module must have:
- ✅ TypeScript strict mode
- ✅ JSDoc on all public methods
- ✅ Unit tests (80%+ coverage)
- ✅ Error handling (no silent failures)
- ✅ No `any` types

---

## COMMON MISTAKES

| Mistake | Fix |
|---------|-----|
| IDs include timestamp | Remove date, use hash only |
| Paths use backslashes | Normalize to forward slash |
| Using symlinks | Switch to latest.json |
| Writing directly (no atomic) | Use temp file → rename |
| Catching errors silently | Log + rethrow |
| No error messages | Make messages descriptive |

---

## DEBUGGING CHECKLIST

When a test fails:

1. **Read the error message carefully** (70% of failures clear here)
2. **Check if file exists**: `ls -la .reposense/runs/`
3. **Check file content**: `cat .reposense/runs/abc/meta.json | jq`
4. **Check IDs**: `npm test -- GraphBuilder.test.ts --grep "stable"`
5. **Enable logging**: Add `console.log()` (before submitting, remove them)
6. **Run isolated test**: `npm test -- [specific test file]`

---

## ASKING FOR HELP

Before asking, have ready:
- The exact error message
- The test that's failing
- What you tried to fix it
- The relevant code snippet (10 lines max)

**Example**:
> Test A2.1 fails. Error: "Expected IDs to match, got abc123 and def456 on second scan."
> I'm using `Date.now()` in the hash input. I think that's the issue.

---

## THE FINISH LINE

When you can run:

```bash
npm test -- src/test/suite/sprint-9/workstream-a.test.ts
```

And get:

```
WORKSTREAM A: Contract Validation
✓ 12 tests passing
✓ No file-not-found errors
✓ All artifacts present
```

→ **You're done. Sprint 10 complete.**

---

## REFERENCE DOCS

Read these in order:

1. **SPRINT_10_CORRECTED_GAP_ANALYSIS.md** — Understand the context
2. **SPRINT_10_IMPLEMENTATION_CONTRACT.md** — Know what to build
3. **SPRINT_10_BUILD_CHECKLIST.md** — Track your progress
4. **SPRINT_10_STABLE_ID_SPECIFICATION.md** — The hard part (read twice)

---

## KEY PHONE NUMBERS (Metaphorical)

**When stuck on IDs**: See SPRINT_10_STABLE_ID_SPECIFICATION.md  
**When stuck on architecture**: See SPRINT_10_IMPLEMENTATION_CONTRACT.md  
**When unsure what to do next**: See SPRINT_10_BUILD_CHECKLIST.md  
**When tests fail**: See the test file + error message  

---

## SUCCESS CHECKLIST

Before submitting:

- [ ] `npm run compile` succeeds
- [ ] `npm test` runs all modules
- [ ] Contract Validation tests: 12/12 passing
- [ ] No `any` types in your code
- [ ] Windows paths tested
- [ ] JSDoc on all public methods
- [ ] Error handling present
- [ ] No console.log left in code (use proper logging)
- [ ] All fixture repos working
- [ ] You can explain every line you wrote

---

**Status**: 🟢 Ready to Start  
**Timeline**: 10 business days  
**Definition of Done**: 12/12 Contract Validation tests passing
