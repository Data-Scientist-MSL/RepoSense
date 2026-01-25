# SPRINT 11: DRIFT FORENSICS & ENFORCEMENT

**How to detect and eliminate drift during implementation**

---

## DRIFT TYPE 1: UI Recomputes Analysis

### What It Looks Like

```typescript
// BAD: UI calls analyzer
export class GapAnalysisProvider {
  render() {
    const analysis = this.analyzer.scan(); // ← DRIFT
    return this.renderTree(analysis);
  }
}
```

### Why It's Drift

- Each render potentially produces different results
- Analysis should be persisted once, read many times
- Violates AC1: "UI reads artifacts only"

### How to Fix

```typescript
// GOOD: UI reads from artifact
export class GapAnalysisProvider {
  render() {
    const runId = await this.runContext.getActiveRunId();
    if (!runId) return this.renderEmpty();
    
    const graph = await this.reader.readGraph(runId);
    return this.renderTree(graph);
  }
}
```

### Search Pattern (Grep)

```bash
grep -n "AnalysisEngine\|BackendAnalyzer\|FrontendAnalyzer" src/providers/*
```

**Expected result**: 0 matches

---

## DRIFT TYPE 2: Sample/Default Data in UI

### What It Looks Like

```typescript
// BAD: Hardcoded defaults
const defaultMetrics = {
  coverage: 0.87,
  endpoints: 42,
  orphans: 3
};

export class ReportPanel {
  getWebviewContent() {
    // Shows sample even if artifacts exist
    const data = this.loadReportData() || defaultMetrics;
    return renderReport(data);
  }
}
```

### Why It's Drift

- User sees fake data when real data exists
- Violates AC1: "no sample data once artifacts exist"
- Makes it hard to tell if system is working

### How to Fix

```typescript
// GOOD: No defaults, empty state if missing
export class ReportPanel {
  async getWebviewContent() {
    const runId = await this.runContext.getActiveRunId();
    
    if (!runId) {
      return renderEmptyState(); // "Run Scan to start"
    }
    
    const report = await this.reader.readReport(runId);
    return renderReport(report); // Only real data
  }
}
```

### Search Pattern (Grep)

```bash
grep -n "defaultMetrics\|defaultReport\|sampleData\|mockData" src/providers/*
```

**Expected result**: 0 matches (or clearly marked as test/demo only)

---

## DRIFT TYPE 3: Multiple Implementations of Same Feature

### What It Looks Like

**Diagram generators**:
- `src/services/DiagramGeneratorNew.ts` (spec-based, deterministic)
- `src/services/llm/ArchitectureDiagramGenerator.ts` (LLM-based, non-deterministic)

**Chat backends**:
- `ChatPanel.ts` calls `OllamaService` directly (UI + logic mixed)
- `ChatBotServiceNew.ts` defines intents (unused)

### Why It's Drift

- Unclear which is canonical
- Easy to call wrong one by accident
- Spec vs. implementation inconsistency
- Tests can't reliably verify behavior

### How to Fix

**For diagrams**:
```typescript
// GOOD: Single path, LLM is optional
class DiagramUI {
  async render() {
    const runId = await this.context.getActiveRunId();
    const index = await this.reader.readDiagramsIndex(runId);
    
    // Render canonical diagrams
    for (const diag of index.diagrams) {
      const mermaid = await this.reader.readMermaid(runId, diag.name);
      renderMermaid(mermaid);
    }
    
    // Optional: async LLM enhancement (not blocking)
    // this.llm.enhanceDiagrams(runId).then(...)
  }
}
```

**For chat**:
```typescript
// GOOD: Single unified backend
class ChatPanel {
  async handleMessage(input: string) {
    const response = await this.orchestrator.handleMessage(input);
    // ChatOrchestrator internally:
    // 1. Routes to IntentRouter
    // 2. Calls CommandInvoker
    // 3. Enforces response contract
    this.renderResponse(response);
  }
}
```

### Verification

```bash
# Should show only ONE active path for each feature
grep -n "ArchitectureDiagramGenerator" src/providers/ # 0 matches
grep -n "DiagramGeneratorNew" src/providers/ # 1+ matches (the canonical path)

grep -n "OllamaService" src/providers/ # 0 direct calls
grep -n "ChatOrchestrator" src/providers/ # 1+ matches (the canonical path)
```

---

## DRIFT TYPE 4: Active Run Context Missing

### What It Looks Like

```typescript
// BAD: UI doesn't know which run it's showing
export class GapTree {
  render() {
    const graph = readGraphJson(); // Which run? Unknown.
    return renderTree(graph);
  }
}
```

### Why It's Drift

- Violates AC2: "switching active run updates all"
- UI can't refresh when run changes
- No way to display which run is active

### How to Fix

```typescript
// GOOD: UI explicitly tracks active run
export class GapTree {
  constructor(
    private runContext: RunContextService,
    private reader: ArtifactReader
  ) {
    // Subscribe to run changes
    runContext.onActiveRunChanged.subscribe(() => this.refresh());
  }
  
  async render() {
    const runId = await this.runContext.getActiveRunId();
    this.statusBar.text = `Active Run: ${runId}`;
    
    const graph = await this.reader.readGraph(runId);
    return renderTree(graph);
  }
}
```

### Verification

```bash
# Every UI module should have these:
grep -n "RunContextService" src/providers/* # All providers should import
grep -n "getActiveRunId()" src/providers/* # All should call this
grep -n "onActiveRunChanged" src/providers/* # Should subscribe to changes
```

---

## DRIFT TYPE 5: Chat Response Contract Violated

### What It Looks Like

```typescript
// BAD: Response doesn't include runId or actions
const response = {
  text: "This is an orphaned endpoint.",
  // Missing: runId
  // Missing: suggestedActions
};
```

### Why It's Drift

- Violates AC3: "every response includes runId + actions"
- UI can't verify response or offer next steps
- Not testable or auditable

### How to Fix

```typescript
// GOOD: Response includes all required fields
const response = {
  text: "This is an orphaned endpoint: GET /users/:id",
  runId: "run-123",  // ← MANDATORY
  nodeLinks: [
    { nodeId: "node-abc", label: "GET /users/:id" }
  ],
  suggestedActions: [
    { label: "View Code", commandId: "reposense.viewSource" },
    { label: "Generate Test", commandId: "reposense.generateTest" }
  ]
};
```

### Verification (Unit Test)

```typescript
it('every response includes runId + suggestedActions', async () => {
  const messages = [
    "What is an orphan?",
    "How do I fix this?",
    "Generate a test",
    "Run the scan",
    "What did I miss?"
  ];
  
  for (const msg of messages) {
    const response = await orchestrator.handleMessage({ message: msg });
    
    assert(response.runId, 'Missing runId');
    assert(Array.isArray(response.suggestedActions), 'Missing suggestedActions');
    assert(response.suggestedActions.length >= 1, 'No actions offered');
  }
});
```

---

## DRIFT TYPE 6: Determinism Violations

### What It Looks Like

```typescript
// BAD: Fixture generation has randomness
class FixtureSuite {
  generateSimpleRest() {
    const count = Math.random() * 10; // ← Non-deterministic
    const endpoints = [];
    for (let i = 0; i < count; i++) {
      endpoints.push({
        path: `/endpoint-${Date.now()}`, // ← Non-deterministic
        method: random(['GET', 'POST']) // ← Non-deterministic
      });
    }
    return endpoints;
  }
}
```

### Why It's Drift

- Violates AC5: "fixtures deterministic"
- Workstream B tests will flake
- Can't reproduce failures

### How to Fix

```typescript
// GOOD: Deterministic fixture generation
class FixtureSuite {
  generateSimpleRest() {
    // Fixed count, no randomness
    return {
      endpoints: [
        { path: '/users/:id', method: 'GET' },
        { path: '/users', method: 'POST' },
        { path: '/products', method: 'GET' },
        { path: '/checkout', method: 'POST' }
      ],
      orphans: [
        { path: '/admin/logs', method: 'POST' },
        { path: '/internal/cache-clear', method: 'DELETE' }
      ]
    };
  }
}
```

### Verification (Determinism Test)

```bash
# Generate fixtures 5 times
for i in {1..5}; do
  npm run generate-fixtures > /tmp/fixture-$i.json
done

# Compare all outputs
diff /tmp/fixture-1.json /tmp/fixture-2.json  # Must be identical
diff /tmp/fixture-2.json /tmp/fixture-3.json  # Must be identical
```

**If any diffs exist**: Find the source of randomness (Date.now, Math.random, key ordering, etc.) and fix it.

---

## DRIFT TYPE 7: Artifact Path Assumptions

### What It Looks Like

```typescript
// BAD: Hardcoded Windows paths
const reportPath = 'C:\\Users\\Dev\\.reposense\\runs\\run-001\\report.json';

// BAD: Forward slashes on Windows
const graphPath = '/c/reposense/runs/run-001/graph.json';

// BAD: Absolute paths
const filePath = '/home/user/project/.reposense/...';
```

### Why It's Drift

- Breaks on different machines, OS
- Violates Windows compatibility rule
- Fragile and hard to test

### How to Fix

```typescript
// GOOD: Relative paths with path.join()
import * as path from 'path';

const runsDir = path.join(workspaceFolder, '.reposense', 'runs');
const reportPath = path.join(runsDir, runId, 'report', 'report.json');
```

### Verification

```bash
grep -rn "C:\\\\" src/ # Windows drive letters (0 matches expected)
grep -rn "^/home" src/ # Absolute Linux paths (0 matches expected)
grep -n "path.join" src/services/run/* # Should use path.join (all paths)
```

---

## DRIFT TYPE 8: Window-Specific Issues

### What It Looks Like

```typescript
// BAD: Symlink for latest pointer
fs.symlinkSync(path.join(runsDir, 'run-123'), path.join(reposenseDir, 'latest'));

// BAD: Backslashes in file content
const path = "src\\providers\\GapAnalysisProvider.ts";

// BAD: Unix-only file operations
fs.exec('ln -s run-123 latest'); // Won't work on Windows
```

### Why It's Drift

- Symlinks don't work reliably on Windows
- Backslashes in JSON strings are escaped and cause issues
- Violates Windows compatibility rule (from technical review)

### How to Fix

```typescript
// GOOD: JSON pointer file instead of symlink
const latestPointer = { runId: 'run-123', timestamp: new Date().toISOString() };
fs.writeFileSync(
  path.join(reposenseDir, 'latest.json'),
  JSON.stringify(latestPointer, null, 2)
);

// GOOD: Always use forward slashes in stored paths
const normalizedPath = sourceRef.path
  .replace(/\\/g, '/') // Backslash → forward slash
  .toLocaleLowerCase();

// GOOD: Path operations via path.join()
const graphFile = path.join(runsDir, runId, 'graph.json');
// Works correctly on Windows and Unix
```

---

## DRIFT FORENSICS CHECKLIST

Run this during Sprint 11 to find drift:

```bash
# 1. Check for UI recomputes
echo "=== Potential UI recomputes ==="
grep -rn "AnalysisEngine\|BackendAnalyzer\|FrontendAnalyzer" src/providers/

# 2. Check for sample data
echo "=== Potential sample data ==="
grep -rn "defaultMetrics\|defaultReport\|sampleData\|mockData" src/providers/ | grep -v test

# 3. Check for competing implementations
echo "=== Potential competing diagram paths ==="
grep -rn "ArchitectureDiagramGenerator" src/providers/

echo "=== Potential competing chat paths ==="
grep -rn "OllamaService" src/providers/ | grep -v test

# 4. Check for missing run context
echo "=== Providers not importing RunContextService ==="
grep -L "RunContextService" src/providers/*.ts

# 5. Check for hardcoded paths
echo "=== Hardcoded paths (drift risk) ==="
grep -rn "^C:" src/ | head -5
grep -rn "^/home" src/ | head -5
grep -rn "^/Users" src/ | head -5

# 6. Check for Windows path issues
echo "=== Path handling (should use path.join) ==="
grep -n "fs\." src/services/run/* | grep -v "path.join"
```

**Goal**: All grep results should show 0 matches (or expected matches only in tests).

---

## DRIFT PREVENTION (Moving Forward)

### Code Review Gate

**Before merging any Sprint 11 PR, verify**:

- [ ] No `AnalysisEngine` in UI code
- [ ] No `defaultMetrics` or sample data
- [ ] No duplicate generators/backends
- [ ] All UI panels have RunContextService
- [ ] All chat responses include runId + actions
- [ ] Path operations use `path.join()`
- [ ] Tests pass (including Sprint 9 suite)

### Continuous Monitoring

After Sprint 11, monitor for drift regression:

```bash
# Weekly check
npm run check-drift  # (if such a script exists)

# Or manually:
grep -rn "AnalysisEngine" src/providers/  # Should always be 0
grep -rn "OllamaService" src/providers/ | grep -v "CommandInvoker"  # Should be 0
```

---

**Sprint 11: Zero Drift by Forensic Design**
