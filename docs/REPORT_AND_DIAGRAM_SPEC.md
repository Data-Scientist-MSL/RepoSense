# RepoSense: Elegant Reports + Architecture Diagramming Bridge

**Version:** 1.0  
**Status:** Architecture Complete, Ready for Implementation  
**Author:** Product Architecture Team  
**Date:** 2026-01-21

---

## Executive Summary

This document specifies how **Reports** and **Diagrams** unite around a **canonical Run Graph**—turning RepoSense from a "scanner + LLM features" system into an **executive-grade, audit-grade** reporting and diagramming platform.

**Core Innovation:** Everything (report, diagram, chatbot explanations) renders from the same `graph.json` source, ensuring consistency, traceability, and repeatability.

---

## 1. The Bridge Concept

### The Problem

Current state:
- Reports are generated independently
- Diagrams are ad-hoc visualizations
- ChatBot explanations don't link to evidence
- No single source of truth for "what happened in this run"

**Result:** Inconsistency, confusion, hard to audit

### The Solution: Run Graph

A deterministic, normalized graph that captures:
- **All code entities** discovered (frontend calls, endpoints, tests)
- **All relationships** (calls, coverage, remediation)
- **All evidence** (artifacts, logs, screenshots)
- **All metadata** (confidence, severity, timestamps)

Everything downstream (reports, diagrams, explanations) reads from this graph.

### Key Principle: Single Source of Truth

```
Run Graph (graph.json)
  ↓
  ├─→ Report Renderer → report.json → WebView / MD / HTML / PDF
  ├─→ Diagram Generator → diagrams/ (Mermaid MMD files)
  ├─→ ChatBot Explanations → "Here's why this gap exists..."
  └─→ Evidence Chains → "Gap → Test → Artifact"
```

---

## 2. The Run Graph (Canonical Data Model)

### Purpose

A normalized representation of a RepoSense analysis run that:
- Is **deterministic** (same input → same graph)
- Is **queryable** (efficient for reports/diagrams)
- Is **immutable** (once written, never changes)
- Is **linked** (every claim traceable to source)

### Structure

**Nodes:** Entities in the analysis
- `FRONTEND_CALL`: Code calling an API endpoint
- `BACKEND_ENDPOINT`: API route definition
- `TEST`: Test case
- `EVIDENCE`: Artifact (screenshot, log, video)
- `REMEDIATION`: Proposed fix
- `MODULE`: Package or folder

**Edges:** Relationships between entities
- `CALLS`: Frontend → Endpoint
- `ENDPOINT_TESTED_BY`: Endpoint → Test
- `TEST_PRODUCES`: Test → Evidence
- `GAP_FIXES`: Remediation → Gap (what it fixes)
- `FIX_VERIFIED_BY`: Remediation → Test run (that verified it)
- `DEPENDS_ON`: Module → Module
- `MENTIONED_IN`: Gap → File (where referenced)

### Example

```json
{
  "runId": "run-2026-01-21-abc123",
  "timestamp": "2026-01-21T15:30:00Z",
  "nodes": [
    {
      "id": "ep-users-get-id",
      "type": "BACKEND_ENDPOINT",
      "label": "GET /users/:id",
      "file": "src/controllers/UserController.ts",
      "line": 42,
      "endpoint": {
        "controller": "UserController",
        "method": "GET",
        "path": "/users/:id",
        "isUsed": true
      }
    },
    {
      "id": "test-users-get-id",
      "type": "TEST",
      "label": "User GET Test",
      "file": "tests/api/users.spec.ts",
      "test": {
        "framework": "Playwright",
        "testName": "should fetch user by ID"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "type": "ENDPOINT_TESTED_BY",
      "sourceNodeId": "ep-users-get-id",
      "targetNodeId": "test-users-get-id",
      "testCoverageDetails": {
        "passed": true,
        "confidence": 0.92
      }
    }
  ],
  "metadata": {
    "nodeCount": 127,
    "edgeCount": 156,
    "statistics": {
      "totalEndpoints": 42,
      "usedEndpoints": 38,
      "unusedEndpoints": 4,
      "untestedEndpoints": 8,
      "totalTests": 65,
      "totalGaps": 12,
      "endpointCoveragePercent": 81
    },
    "quality": {
      "astCoveragePercent": 92,
      "normalizationConfidence": 0.87,
      "notes": ["Dynamic URL builders not fully supported"]
    }
  }
}
```

---

## 3. Run Artifacts Layout (Immutable Contract)

Every run produces this directory structure:

```
.reposense/runs/<runId>/
├── scan.json                    # Raw extraction results
├── graph.json                   # Canonical Run Graph ⭐
├── plan.json                    # Prioritization + actions
├── diffs/
│   └── gap-{gapId}.patch        # Proposed remediation patches
├── tests/
│   ├── generated/
│   │   └── {framework}/
│   │       └── *.spec.ts        # Generated test files
│   └── mapping.json             # Test → Endpoint mapping
├── execution/
│   ├── results.json             # Pass/fail summary
│   ├── junit.xml                # JUnit format (optional)
│   └── logs.txt                 # Execution logs
├── evidence/
│   ├── screenshots/
│   │   └── *.png                # Test screenshots
│   └── videos/
│       └── *.webm               # Test recordings
├── report/
│   ├── report.json              # Structured report model ⭐
│   ├── report.md                # Markdown export
│   ├── report.html              # HTML export
│   └── report.pdf               # PDF export
├── diagrams/
│   ├── diagrams.json            # Diagram registry ⭐
│   ├── system-context.mmd       # Mermaid source
│   ├── api-flow.mmd
│   ├── coverage-map.mmd
│   ├── system-context.svg       # Rendered SVG
│   ├── api-flow.svg
│   └── coverage-map.svg
└── manifest.json                # Metadata: what was produced
```

**Key Files (the "⭐" artifacts):**
- `graph.json` — Canonical run graph (source of truth)
- `report.json` — Structured report model
- `diagrams.json` — Diagram registry with metadata

---

## 4. Elegant Report Model

### What It Is

Not a blob of markdown, but a **structured document model** that can render to multiple formats:
- **WebView** (interactive tabs, click-through)
- **Markdown** (git-friendly, portable)
- **HTML/PDF** (executive share)

### Report Structure

```json
{
  "runId": "run-abc123",
  "timestamp": "2026-01-21T15:30:00Z",
  "title": "RepoSense Analysis Report",
  "sections": [
    {
      "id": "exec-summary",
      "type": "EXECUTIVE_SUMMARY",
      "title": "Executive Summary",
      "content": [
        {
          "type": "TEXT",
          "text": {
            "body": "Analysis found **12 API gaps** across the codebase..."
          }
        },
        {
          "type": "METRIC_CARD",
          "metricCard": {
            "label": "API Gaps Found",
            "value": 12,
            "severity": "CRITICAL",
            "trend": {
              "direction": "UP",
              "percentChange": 20,
              "previousValue": 10
            }
          }
        },
        {
          "type": "LIST",
          "list": {
            "items": [
              {
                "title": "Missing: DELETE /users/:id",
                "severity": "CRITICAL",
                "linkedNodeId": "gap-users-delete"
              }
            ]
          }
        }
      ]
    },
    {
      "id": "api-health",
      "type": "API_HEALTH",
      "title": "API Contract Health",
      "content": [
        {
          "type": "TABLE",
          "table": {
            "headers": ["Endpoint", "Status", "Coverage", "Last Used"],
            "rows": [
              ["GET /users", "✅", "95%", "5 mins ago"],
              ["DELETE /users/:id", "❌ Missing", "0%", "Never"]
            ]
          }
        }
      ]
    },
    {
      "id": "diagrams",
      "type": "ARCHITECTURE_DIAGRAMS",
      "title": "Architecture Diagrams",
      "content": [
        {
          "type": "DIAGRAM",
          "diagram": {
            "diagramId": "api-flow",
            "title": "API Flow (Frontend → Backend)",
            "mermaidSource": "... (Mermaid source)"
          }
        }
      ]
    },
    {
      "id": "evidence",
      "type": "EVIDENCE_TRACEABILITY",
      "title": "Evidence & Traceability",
      "content": [
        {
          "type": "EVIDENCE_CHAIN",
          "evidenceChain": {
            "title": "DELETE /users/:id Coverage Chain",
            "chain": [
              { "label": "Gap ID", "nodeId": "gap-users-delete" },
              { "label": "Generated Test", "nodeId": "test-users-delete" },
              { "label": "Execution Result", "artifactPath": "execution/results.json" },
              { "label": "Screenshot", "artifactPath": "evidence/screenshots/delete-user.png" }
            ]
          }
        }
      ]
    }
  ]
}
```

### Report Sections

1. **Executive Summary**
   - Total gaps, risk score, top 5 issues
   - Recommended next actions (CTA buttons)

2. **API Contract Health**
   - Missing endpoints
   - Unused endpoints
   - Mismatch patterns
   - Impacted modules

3. **Test Coverage**
   - Endpoint coverage %
   - Top untested critical endpoints
   - Coverage delta vs previous run

4. **Evidence & Traceability**
   - Gap → Test → Execution → Artifact chains
   - Clickable links to evidence

5. **Remediation Plan**
   - Recommended fixes (with effort estimates)
   - Safe-apply vs manual-review
   - Priority ranking

6. **Architecture Diagrams**
   - System context diagram
   - API flow diagram
   - Coverage map diagram

---

## 5. Diagram Generation (Deterministic & Grounded)

### Why Mermaid

- Native in VS Code WebViews
- Easy to export (SVG, PNG, PDF)
- Readable in Git diffs
- Safe to generate and validate
- **Deterministic:** same graph → same diagram (bit-for-bit)

### Three Diagram Types

**1. System Context Diagram**
- Modules/packages as nodes
- API interactions as edges
- Shows gaps visually

**2. API Flow Diagram**
- Sequence: Frontend call → Backend endpoint → Test → Evidence
- Traces execution paths
- Shows coverage status

**3. Coverage Map Diagram**
- Endpoints grouped by path prefix
- Color-coded by coverage %:
  - Green (>80%), Yellow (20-80%), Red (<20%)

See **MERMAID_DIAGRAM_TEMPLATES.md** for complete templates.

### Diagram Registry

```json
{
  "runId": "run-abc123",
  "diagrams": [
    {
      "id": "api-flow",
      "title": "API Flow (Frontend → Backend)",
      "source": "diagrams/api-flow.mmd",
      "generatedAt": "2026-01-21T15:35:00Z",
      "confidence": 0.92,
      "quality": {
        "isComplete": true,
        "coverage": 98,
        "limitations": ["Dynamic URL builders not fully resolved"]
      },
      "interactive": {
        "clickableNodes": ["node-1", "node-2", ...],
        "linkedToEvidence": true
      }
    }
  ]
}
```

---

## 6. Interactive WebView Dashboard

### Layout

```
┌─────────────────────────────────────────────────────┐
│ RepoSense Run Report                                │
├─────────────────────────────────────────────────────┤
│ [Summary] [Gaps] [Coverage] [Evidence] [Diagrams] [Export]
├─────────────────────────────────────────────────────┤
│                                                       │
│ Executive Summary                                   │
│ ─────────────────                                   │
│ 12 gaps found (↑20% vs last run)                   │
│ Risk Score: 82/100 🔴 CRITICAL                    │
│                                                       │
│ Top 5 Issues:                                       │
│ 1. DELETE /users/:id — Missing endpoint ⭐⭐⭐      │
│    [Generate Test] [Propose Fix]                   │
│                                                       │
│ 2. GET /admin/legacy — Unused endpoint ⚠️         │
│    [Propose Deprecation]                            │
│                                                       │
│ ... (3 more)                                        │
│                                                       │
│ [Generate Tests for Top 5] [Export Report]        │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Interaction: Click-Through Navigation

```typescript
// User clicks on gap in report
handleGapClick(gapNodeId: string) {
  // 1. Highlight in diagram
  highlightInDiagram(gapNodeId);
  
  // 2. Show side panel with evidence
  showEvidencePanel({
    nodeId: gapNodeId,
    linkedTests: getTests(gapNodeId, graph),
    linkedEvidence: getEvidence(gapNodeId, graph)
  });
  
  // 3. Offer actions
  showActions([
    { label: 'Generate Test', action: GENERATE_TEST },
    { label: 'Propose Fix', action: PROPOSE_FIX },
    { label: 'See in Diagram', action: FOCUS_DIAGRAM }
  ]);
  
  // 4. Open file at location
  if (gap.file) openFileAtLocation(gap.file, gap.line);
}

// User clicks node in diagram
handleDiagramNodeClick(nodeId: string) {
  // 1. Open file
  const node = graph.nodes.find(n => n.id === nodeId);
  openFileAtLocation(node.file, node.line);
  
  // 2. Scroll report to matching gap
  scrollReportToNode(nodeId);
  
  // 3. Show evidence
  showEvidencePanel({
    nodeId,
    evidence: getEvidence(nodeId, graph)
  });
}
```

---

## 7. ChatBot Integration

The assistant speaks report + diagram naturally:

```
User: "Show me why /orders/:id is failing"

ChatBot:
1. Reads run graph: endpoint → tests → results
2. Opens diagram, focuses on that endpoint node
3. Shows evidence chain:
   - Endpoint definition
   - Linked tests
   - Test execution results
   - Screenshots
4. Offers actions:
   - [Rerun Test]
   - [Generate Better Assertion]
   - [Create Remediation PR]

Key: ChatBot doesn't describe—it *drives* the report and diagram.
```

---

## 8. Quality Indicators

### Confidence Scoring

Every artifact gets a confidence score (0-1):

- **0.95+**: High confidence (AST-based, well-structured code)
- **0.85-0.95**: Medium-high (pattern-matched, but validated)
- **0.70-0.85**: Medium (dynamic code, assumptions made)
- **<0.70**: Low confidence (report as limitations)

### Limitations & Notes

Transparency about what we *can't* know:

```
Diagram: "API Flow"
Limitations:
  - Dynamic URL builders (/routes/:id/:action) resolved via naming heuristics
  - Private test fixtures not analyzed
  - Async handlers may have hidden dependencies

Confidence: 0.87 (87% of detected calls verified via AST)
```

---

## 9. Export & Portability

### One-Click Exports

Users can export:

1. **Markdown** — Commit to repo, version-controlled
2. **HTML** — Stand-alone, shareable
3. **PDF** — Executive summary format
4. **Evidence Bundle** — ZIP with all artifacts

### Export Package Contents

```
report-2026-01-21.zip
├── report.md
├── report.html
├── report.pdf
├── diagrams/
│   ├── system-context.svg
│   ├── api-flow.svg
│   └── coverage-map.svg
├── evidence/
│   ├── screenshots/
│   ├── videos/
│   └── logs/
└── manifest.json
```

---

## 10. Implementation Roadmap

### Phase 1: Report Backbone (Week 1-2)

- [x] Define `graph.json` schema
- [ ] Implement `RunGraphBuilder` service
  - Aggregate AnalysisEngine + TestCoverageAnalyzer
  - Normalize nodes and edges
  - Persist to `.reposense/runs/<runId>/graph.json`
- [ ] Implement `ReportGenerator` (extend existing)
  - Generate `report.json` from `graph.json`
  - Render to Markdown
- [ ] Create `ReportPanel` WebView
  - Tab-based layout
  - JSON → HTML rendering

**Deliverable:** `.reposense/runs/<runId>/report.json` + WebView

### Phase 2: Diagram Generation (Week 2-3)

- [x] Define Mermaid templates
- [ ] Implement `DiagramGenerator` service
  - Generate 3 Mermaid files from `graph.json`
  - Validate Mermaid syntax
  - Create `diagrams.json` registry
- [ ] Implement Mermaid WebView
  - Render MMD files
  - Click-through node handling
- [ ] Add diagram tabs to Report WebView

**Deliverable:** `.reposense/runs/<runId>/diagrams/` + interactive viewer

### Phase 3: Evidence Chain UI (Week 3)

- [ ] Implement evidence side panel
  - Show artifacts for selected gap
  - Click to open screenshot/video/log
- [ ] Add traceability visualization
  - Gap → Test → Artifact chain
- [ ] Link report items to evidence

**Deliverable:** Clickable report with evidence links

### Phase 4: Delta & Trending (Week 4)

- [ ] Implement `RunDelta` comparison
  - Load previous `graph.json`
  - Calculate gap deltas, coverage changes
- [ ] Show trend indicators
  - ↑ Improving / ↓ Degrading / → Stable
- [ ] Add "previous run" comparison view

**Deliverable:** Coverage delta reporting

---

## 11. Success Criteria

✅ **Consistency**
- Report numbers match diagrams
- Diagrams match evidence
- Every claim links to source

✅ **Traceability**
- Gap → Test → Evidence chain clickable
- File locations accurate
- Artifacts captured and linked

✅ **Clarity**
- Executive summary is short and strong
- Diagrams are readable at a glance
- Confidence scores transparent

✅ **Repeatability**
- Rerun produces comparable results
- Deltas meaningful
- Results auditable

---

## 12. Example: Complete Flow

```
1. User runs RepoSense analysis
   ↓
2. AnalysisEngine scans frontend + backend
   ↓
3. RunGraphBuilder normalizes + creates graph.json
   ↓
4. ReportGenerator reads graph.json → generates report.json
   ↓
5. DiagramGenerator reads graph.json → generates 3 Mermaid diagrams
   ↓
6. ReportPanel WebView renders report.json as interactive dashboard
   ↓
7. User clicks gap in report
   ↓
8. Diagram highlights matching node
   Evidence panel shows: tests, screenshots, logs
   ↓
9. User clicks "Generate Test"
   ↓
10. ChatBot opens, suggests test generation
   ↓
11. Test generated, saved to workspace
   ↓
12. User clicks "Run Test"
   ↓
13. Test execution captured, evidence stored
   ↓
14. Report refreshed with new test results
   ↓
15. User exports report as PDF + evidence bundle
```

---

## 13. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ RepoSense Extension                                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  AnalysisEngine ──────────┐                             │
│  TestCoverageAnalyzer ────┤                             │
│                            ↓                             │
│                   RunGraphBuilder ←─────┐               │
│                            │             │               │
│                            ↓             │               │
│                      graph.json          │               │
│                   (Single Source)        │               │
│                       ↙    ↓    ↘       │               │
│                      /      │      \     │               │
│                     /       │       \    │               │
│            ReportGen   DiagramGen  ChatBot               │
│               ↓              ↓          │               │
│           report.json  diagrams.json    │               │
│               ↓              ↓          │               │
│            ReportPanel   DiagramPanel ◄─┘               │
│         (WebView Tabs)   (Mermaid UI)                   │
│                                                           │
│  User interactions:                                      │
│  - Click gap → open file + show evidence               │
│  - Click diagram node → scroll report + show evidence  │
│  - Export → Markdown + HTML + PDF                      │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 14. Next Documents

For implementation:

1. **RunGraphBuilder.ts** — Service to build graph.json
2. **DiagramGenerator.ts** — Service to generate Mermaid
3. **ReportPanel.ts** — WebView to render report.json + diagrams
4. **Integration** — Wire into RunOrchestrator + ChatBot

---

**Status:** ✅ Specification Complete, Ready for Implementation

