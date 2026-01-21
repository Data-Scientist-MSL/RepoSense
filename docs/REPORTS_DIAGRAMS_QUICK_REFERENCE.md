# Reports + Diagrams Bridge: Quick Reference

**Status:** ✅ Foundation Complete  
**Last Updated:** January 2024

---

## Quick Start

### For Developers

**Location of Key Files:**
```
src/
├─ models/
│  └─ ReportAndDiagramModels.ts      ← Type contracts (447 LOC)
├─ services/
│  ├─ RunGraphBuilder.ts              ← Graph builder (120 LOC)
│  └─ DiagramGenerator.ts             ← Mermaid generator (270 LOC)
└─ providers/
   └─ ReportPanel.ts                  ← WebView UI (300+ LOC)

docs/
├─ REPORT_AND_DIAGRAM_SPEC.md         ← Architecture & design
├─ MERMAID_TEMPLATES_GUIDE.md         ← Diagram generation
└─ REPORTS_DIAGRAMS_IMPLEMENTATION_SUMMARY.md ← What's done
```

### Architecture at a Glance

```
graph.json (canonical) → ReportGenerator → report.json → WebView
                      ↘ DiagramGenerator → diagrams.mmd → Rendered
                      ↘ ChatBot service  → Explanations
```

### Core Interfaces

**Run Graph (source of truth):**
```typescript
interface RunGraph {
  runId: string;
  nodes: GraphNode[];        // 6 types
  edges: GraphEdge[];        // 7 types
  metadata: GraphMetadata;   // Statistics
}
```

**Graph Nodes (6 types):**
- `BACKEND_ENDPOINT` - API routes
- `FRONTEND_CALL` - Client calls
- `TEST` - Test cases
- `EVIDENCE` - Artifacts
- `REMEDIATION` - Proposed fixes
- `MODULE` - Code packages

**Graph Edges (7 types):**
- `CALLS` - Frontend → Endpoint
- `ENDPOINT_TESTED_BY` - Endpoint → Test
- `TEST_PRODUCES` - Test → Evidence
- `GAP_FIXES` - Remediation → Gap
- `DEPENDS_ON` - Module → Module
- `CONTAINS` - Module → Node
- `SAME_AS` - Deduplication

---

## Key Features

### 1. Deterministic Generation
- Same graph → Same diagrams (bit-for-bit identical)
- Enables clean Git diffs of Mermaid files
- Reproducible across runs

### 2. Single Source of Truth
- All outputs (reports, diagrams, ChatBot explanations) from `graph.json`
- Ensures consistency
- Simplifies updates

### 3. Interactive Navigation
- Click diagram nodes → Jump to code
- Click test names → Show evidence
- Click evidence → Open artifacts

### 4. Quality Transparency
- Every artifact has confidence score (0.0-1.0)
- Limitations explicitly noted
- Severity levels assigned

### 5. Multiple Export Formats
- **Markdown** - Git-friendly
- **HTML** - Self-contained, shareable
- **PDF** - Professional printing
- **Evidence Bundle** - ZIP with all artifacts

---

## File Locations in Run

After analysis completes:

```
.reposense/runs/run-20240115-143022/
├── graph.json                 ← Source of truth
├── report/
│   ├── report.json           ← Structured report
│   ├── report.md             ← Markdown export
│   └── report.html           ← HTML export
├── diagrams/
│   ├── system-context.mmd    ← Mermaid source
│   ├── api-flow.mmd
│   ├── coverage-map.mmd
│   ├── diagrams.json         ← Registry
│   ├── system-context.svg    ← SVG export
│   └── system-context.png    ← PNG export
└── evidence/
    ├── screenshots/
    ├── videos/
    ├── logs/
    └── artifacts.json        ← Manifest
```

---

## Three Diagram Types

### 1. System Context
**Shows:** Module interactions  
**Example:** Auth → User → Database  
**Use case:** Understanding architecture  

### 2. API Flow
**Shows:** Request → Test → Evidence sequence  
**Example:** FE calls → BE endpoint → Test runs → Screenshot captured  
**Use case:** Tracing end-to-end flows  

### 3. Coverage Map
**Shows:** Endpoints by module, colored by coverage  
**Example:** Auth (100%), User (60%), Admin (0%)  
**Use case:** Identifying gaps at a glance  

---

## Integration Points

### RunOrchestrator
```typescript
// In execute() method:
const graph = await graphBuilder.buildGraph(
  analysisResult,
  testCoverage,
  executionResult
);
await graphBuilder.saveGraph(graph, graphPath);
```

### ChatBot
```typescript
// Explain what's in the report:
"Why is POST /users untested?"
→ ChatBot queries graph.json
→ Shows linked tests, recommended patches
```

### Evidence Panel
```typescript
// Show artifacts for selected gap:
Selected Gap → Find in graph → Show tests → Show evidence
```

---

## Determinism Checklist

When generating diagrams, ensure:
- ✅ All nodes sorted alphabetically before rendering
- ✅ No random elements (UUIDs, timestamps, etc.)
- ✅ Fixed decimal precision (round percentages)
- ✅ Normalized node IDs (lowercase, no special chars)
- ✅ Consistent indentation (2 spaces)
- ✅ Stable sort (JavaScript Array.sort is stable)

**Validation:**
```typescript
const hash1 = sha256(diagram);
const hash2 = sha256(diagram);  // Same as hash1?
console.assert(hash1 === hash2, 'Non-deterministic!');
```

---

## Quality Scores Reference

### Confidence Levels

| Score | Category | Example |
|-------|----------|---------|
| 0.95+ | Excellent | Endpoint from AST |
| 0.85-0.95 | Very Good | Frontend call pattern |
| 0.70-0.85 | Good | AI-generated test patch |
| <0.70 | Fair | Dynamic path resolution |

### How It Works

Each artifact displays:
```
POST /users
├─ Confidence: ███████░░ 85%
├─ Source: AST parse of UserController.ts:42
├─ Tests: 2 passing
└─ Limitations: Dynamic URL params via heuristics
```

---

## Common Tasks

### Task 1: Display a Report
```typescript
const panel = ReportPanel.createOrShow(
  extensionUri,
  graph,
  diagramGenerator
);
```

### Task 2: Export as Markdown
```typescript
const report = reportGenerator.generateReport();
const markdown = exportMarkdown(report, graph);
fs.writeFileSync('report.md', markdown);
```

### Task 3: Find Tests for Endpoint
```typescript
const endpoint = graph.nodes.find(n =>
  n.type === 'BACKEND_ENDPOINT' &&
  n.endpoint?.path === '/users'
);

const tests = graph.edges
  .filter(e => e.type === 'ENDPOINT_TESTED_BY' &&
    e.sourceNodeId === endpoint.id)
  .map(e => graph.nodes.find(n => n.id === e.targetNodeId));
```

### Task 4: Calculate Coverage
```typescript
const endpoints = graph.nodes.filter(
  n => n.type === 'BACKEND_ENDPOINT'
);

const tested = endpoints.filter(ep =>
  graph.edges.some(e =>
    e.type === 'ENDPOINT_TESTED_BY' &&
    e.sourceNodeId === ep.id
  )
);

const coverage = (tested.length / endpoints.length) * 100;
```

### Task 5: Validate Determinism
```typescript
import { createHash } from 'crypto';

function validateDeterminism(graph) {
  const hashes = [];
  for (let i = 0; i < 3; i++) {
    const diagram = generateDiagram(graph);
    const hash = createHash('sha256')
      .update(diagram)
      .digest('hex');
    hashes.push(hash);
  }
  return hashes[0] === hashes[1] && hashes[1] === hashes[2];
}
```

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Graph generation | <10s | Depends on codebase size |
| Diagram generation | <2s | All 3 diagrams |
| Report generation | <5s | HTML with embedded images |
| WebView rendering | <3s | Initial paint |
| Export to PDF | <10s | Depends on report size |

---

## Common Errors & Solutions

### Error: "Non-deterministic diagram"
**Cause:** Node iteration order varies  
**Solution:** Add `.sort()` before iteration

### Error: "Missing node in edge"
**Cause:** Edge references non-existent node  
**Solution:** Validate graph before export

### Error: "Invalid Mermaid syntax"
**Cause:** Special characters in labels  
**Solution:** Escape or sanitize node labels

### Error: "WebView not showing"
**Cause:** HTML not rendering  
**Solution:** Check VS Code WebView security policies

---

## Dependencies

**No external packages required** for core functionality:
- TypeScript (already in project)
- Node.js fs/path (built-in)
- JSON (built-in)

**Optional for enhanced features:**
- `mermaid-cli` - Render diagrams to PNG/SVG
- `puppeteer` - Generate PDF reports
- `html2canvas` - Screenshot diagrams
- `markdown-it` - Parse Markdown in WebView

---

## Browser Compatibility

**WebView (VS Code):**
- ✅ Chromium-based (always latest)
- ✅ All modern JS/CSS supported
- ✅ Web APIs available

**Exported Formats:**
- **Markdown** - Any Markdown viewer
- **HTML** - Any modern browser
- **PDF** - Any PDF reader
- **PNG** - Any image viewer

---

## Troubleshooting

### Report not updating
1. Check `.reposense/runs/<runId>/graph.json` exists
2. Verify `report.json` matches graph
3. Clear WebView cache: `Cmd+Shift+P` → Clear WebView Cache

### Diagrams not rendering
1. Check Mermaid syntax: `system-context.mmd`
2. Verify node IDs are valid
3. Check for circular dependencies

### Export failing
1. Check permissions on output directory
2. Verify Node.js/npm installation
3. Check for disk space

### Performance slow
1. Profile: Large codebases (10K+ endpoints) expected to be slow
2. Check system resources (CPU, RAM)
3. Disable background analysis if running

---

## References

- **Full spec:** `docs/REPORT_AND_DIAGRAM_SPEC.md`
- **Diagram guide:** `docs/MERMAID_TEMPLATES_GUIDE.md`
- **Implementation:** `docs/REPORTS_DIAGRAMS_IMPLEMENTATION_SUMMARY.md`
- **Types:** `src/models/ReportAndDiagramModels.ts`

---

## Next Steps

1. ✅ Phase 1: Foundation - COMPLETE
2. ⏳ Phase 2: Integration with RunOrchestrator
3. ⏳ Phase 3: Full report generation service
4. ⏳ Phase 4: Mermaid rendering in WebView
5. ⏳ Phase 5: Export functionality

**Expected completion:** 4 weeks total

---

## Contact

Questions about the Reports + Diagrams Bridge? See documentation files above or refer to code comments in service implementations.
