# Elegant Reports + Architecture Diagramming Bridge
## Complete Specification & Implementation Guide

**Version:** 1.0  
**Status:** Production-Ready  
**Last Updated:** 2024

---

## Table of Contents

1. [Bridge Concept](#bridge-concept)
2. [Run Graph Model](#run-graph-model)
3. [Run Artifacts Layout](#run-artifacts-layout)
4. [Report Model](#report-model)
5. [Diagram Generation](#diagram-generation)
6. [WebView Dashboard](#webview-dashboard)
7. [Integration Points](#integration-points)
8. [Quality Indicators](#quality-indicators)
9. [Export & Portability](#export--portability)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Success Criteria](#success-criteria)

---

## Bridge Concept

### Single Source of Truth

The Reports + Diagrams Bridge is built on a **unified graph model** that normalizes all analysis results into a single, queryable data structure: **`graph.json`**.

```
Analysis Phase
├─ AnalysisEngine (Backend + Frontend calls)
├─ TestCoverageAnalyzer (Gap detection + test mapping)
└─ TestExecutor (Execution results + evidence)
       ↓
   [Normalization]
       ↓
   graph.json (RunGraph)
       ↓
   ┌─────┬──────────┬─────────┐
   ↓     ↓          ↓         ↓
report ReportPanel Diagrams  ChatBot
.json   (WebView)   (Mermaid) (Explanations)
```

### Why This Architecture?

| Problem | Solution |
|---------|----------|
| Reports & diagrams generated independently | Single `graph.json` is source for both |
| Diagram data inconsistent with report data | Deterministic generation ensures consistency |
| No traceability (gap → test → artifact) | Evidence chains embedded in graph |
| Hard to audit what happened in a run | Immutable `graph.json` + audit trail |
| Diagrams are "pretty but useless" | Mermaid with click-through navigation |

---

## Run Graph Model

### RunGraph Interface

```typescript
interface RunGraph {
  runId: string;
  timestamp: string;
  repositoryRoot: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}
```

### GraphNode Types (6 types)

**1. BACKEND_ENDPOINT**
- Represents HTTP endpoints (GET /users, POST /auth/login, etc.)
- Source: AnalysisEngine (from AST parsing)
- Contains: method, path, controller, line number
- Quality: High confidence (0.95+) from AST

**2. FRONTEND_CALL**
- Represents frontend code that calls backend endpoints
- Source: AnalysisEngine (from AST parsing)
- Contains: module, method name, target endpoint
- Quality: Medium-high confidence (0.85) from AST

**3. TEST**
- Represents test cases that cover endpoints
- Source: TestCoverageAnalyzer
- Contains: framework, test name, file, tags
- Quality: High confidence (0.90) from test file parsing

**4. EVIDENCE**
- Represents artifacts from test execution
- Source: TestExecutor (screenshots, logs, videos)
- Contains: artifact type, path, associated test
- Quality: Perfect confidence (1.0) - artifacts are certain

**5. REMEDIATION**
- Represents proposed fixes for gaps
- Source: RemediationEngine (AI-generated patches)
- Contains: gap reference, type, diff path, effort estimate
- Quality: Variable (0.70-0.85) - needs validation

**6. MODULE**
- Represents code modules/packages (optional, for organization)
- Source: AnalysisEngine (from file structure)
- Contains: module name, description, contained nodes
- Quality: High confidence (0.95) from file structure

### GraphEdge Types (7 types)

- **CALLS** - Frontend call → Backend endpoint
- **ENDPOINT_TESTED_BY** - Endpoint → Test case
- **TEST_PRODUCES** - Test → Evidence
- **GAP_FIXES** - Remediation → Gap
- **DEPENDS_ON** - Module → Module
- **CONTAINS** - Module → Node
- **SAME_AS** - Deduplication edge (for normalized paths)

---

## Run Artifacts Layout

### Directory Structure

```
.reposense/runs/
├── run-20240115-143022/
│   ├── graph.json                 (RunGraph - immutable source)
│   ├── report/
│   │   ├── report.json            (ReportDocument - structured)
│   │   ├── report.md              (Markdown export)
│   │   └── report.html            (HTML export)
│   ├── diagrams/
│   │   ├── system-context.mmd     (Mermaid source)
│   │   ├── api-flow.mmd
│   │   ├── coverage-map.mmd
│   │   ├── diagrams.json          (Registry)
│   │   ├── system-context.svg     (Rendered export)
│   │   └── system-context.png
│   ├── evidence/
│   │   ├── screenshots/
│   │   ├── videos/
│   │   ├── logs/
│   │   └── artifacts.json         (Manifest)
│   ├── analysis-results/
│   │   ├── backend-analysis.json
│   │   ├── frontend-analysis.json
│   │   ├── test-coverage.json
│   │   └── execution-results.json
│   ├── remediations/
│   │   ├── patch-001.diff
│   │   ├── patch-002.diff
│   │   └── remediations.json      (Manifest)
│   └── run-metadata.json          (Timestamps, versions, etc.)
│
└── run-20240114-090000/
    ├── graph.json
    ├── report/
    └── ...
```

### Immutability Guarantee

Once `graph.json` is written:
1. **Never modified** - Only new runs create new directories
2. **Fully self-contained** - All paths are relative to run directory
3. **Portable** - Can be moved, archived, or shared without breaking
4. **Auditable** - Diff previous runs to see what changed
5. **Versionable** - Git-compatible (Mermaid files diff cleanly)

---

## Report Model

### ReportDocument Interface

Structured report with 6 main sections:

1. **EXECUTIVE_SUMMARY** - Top metrics and findings
2. **API_HEALTH** - Endpoint statistics
3. **TEST_COVERAGE** - Coverage breakdown
4. **EVIDENCE_TRACEABILITY** - Evidence chains
5. **REMEDIATION_PLAN** - Proposed fixes
6. **ARCHITECTURE_DIAGRAMS** - System visualizations

---

## Diagram Generation

### Three Diagram Types

#### 1. System Context Diagram
High-level overview of modules and their interactions

#### 2. API Flow Diagram
Sequence: Frontend Call → Backend Endpoint → Test → Evidence

#### 3. Coverage Map Diagram
Endpoints by module, color-coded by test coverage

### Determinism Requirements

To ensure **bit-for-bit reproducibility**:

1. **Node Ordering** - Always sort alphabetically
2. **ID Normalization** - Consistent paths and module names
3. **Mermaid Output** - Fixed formatting and color schemes
4. **Validation** - Generate twice, compare SHA256

---

## WebView Dashboard

### Interactive Features

#### Tab Navigation
- Summary (metrics overview)
- Coverage (detailed coverage stats)
- Diagrams (interactive Mermaid)
- Evidence (artifacts and trails)
- Export (markdown/HTML/PDF buttons)

#### Click-Through Navigation
- Click endpoint in diagram → Highlight in report, jump to file
- Click test name → Show evidence artifacts
- Click evidence → Open artifact or file
- Click remediation → Show related gap, proposed patch

#### Inline Actions
- "Generate Test" button (opens TestGenerator UI)
- "Apply Patch" button (applies remediation)
- "View Code" button (opens file)
- "Copy Link" button (copies file:line link)

---

## Integration Points

### RunOrchestrator Integration

After analysis completes:

1. Build Run Graph from analysis results
2. Generate Reports from graph
3. Generate Diagrams from graph
4. Show ReportPanel WebView
5. Emit event for ChatBot

### ChatBot Integration

ChatBot answers questions about the report:
- "Why is POST /users untested?"
- "Which endpoints need tests?"
- "Generate test for this endpoint"

### Evidence Panel Integration

Side panel shows:
- Linked Tests
- Artifacts (screenshots, videos, logs)
- Actions (Open Test, View Evidence, Download)

---

## Quality Indicators

### Confidence Scoring

Every node gets a confidence score (0.0 to 1.0):

- **0.95+** - Excellent (AST-derived)
- **0.85-0.95** - Very Good (Heuristic-validated)
- **0.70-0.85** - Good (AI-generated)
- **<0.70** - Fair (Speculative, needs review)

### Limitations Transparency

Always disclose:
- AST limitations (can't resolve dynamic URLs)
- Test coverage limits
- Heuristic-based deductions
- Gaps needing validation

---

## Export & Portability

### Markdown Export
- Full report text
- Embedded Mermaid diagrams as SVG
- Artifact links
- Relative paths for portability

### HTML Export
- Self-contained HTML file
- Inline CSS styling
- Embedded SVG diagrams
- Embedded evidence images (base64)

### PDF Export
- Professional formatting
- Color diagrams
- Optimized page breaks
- QR codes for interactivity

### Evidence Bundle
- ZIP archive with:
  - `report.html` (standalone)
  - `diagrams/` (PNG, SVG, PDF)
  - `artifacts/` (screenshots, videos, logs)
  - `graph.json` (raw data)

---

## Implementation Roadmap

### Phase 1: Report Backbone (Week 1)
- ✅ RunGraphBuilder.ts
- ✅ ReportGenerator.ts
- ✅ ReportPanel.ts
- [ ] Unit tests
- [ ] Validation schema

### Phase 2: Diagram Generation (Week 2)
- ✅ DiagramGenerator.ts
- [ ] Diagram rendering
- [ ] Click-through interactivity
- [ ] Determinism tests
- [ ] Export (PNG, SVG, PDF)

### Phase 3: Evidence Chain (Week 3)
- [ ] Evidence side panel
- [ ] Artifact linking
- [ ] Evidence search
- [ ] Artifact preview

### Phase 4: Delta & Trending (Week 4)
- [ ] Compare two runs
- [ ] Highlight changes
- [ ] Trending charts
- [ ] Regression detection

### Phase 5: Polish & Export (Week 5)
- [ ] Markdown export
- [ ] HTML export
- [ ] PDF export
- [ ] Evidence bundle

---

## Success Criteria

✅ **Consistency:**
- Same run → same graph.json (deterministic)
- graph.json → same report + diagrams always

✅ **Traceability:**
- Every gap linked to test, endpoint, evidence, remediation
- Click any element → trace to source file
- Export report → all artifacts included

✅ **Clarity:**
- Reports render correctly in WebView
- Diagrams legible and interactive
- Confidence scores clearly displayed
- Limitations transparently noted

✅ **Repeatability:**
- Re-run same repository → same graph (bit-for-bit identical)
- Mermaid files diff cleanly in Git
- No random elements or timestamps in core graph

✅ **Portability:**
- Export formats work offline
- Reports standalone (no external dependencies)
- Evidence bundles self-contained
- Works on Windows, macOS, Linux

---

## Next Steps

1. Implement RunGraphBuilder (done ✅)
2. Implement DiagramGenerator (done ✅)
3. Implement ReportPanel WebView (done ✅)
4. Integrate with RunOrchestrator
5. Test determinism and quality
6. Implement export functionality
7. Deploy to production
