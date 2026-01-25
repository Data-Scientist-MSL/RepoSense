# Sprint 9: UX Integrity Acceptance Checklist

**Objective**: Verify that all UI surfaces properly reference run artifacts and prevent direct recomputation.

**Date Verified**: January 21, 2026  
**Verification Status**: ✅ READY FOR UAT

---

## PART 1: UI Panel Display Requirements

### Dashboard Panel
Every dashboard surface must display:

- [ ] **Active runId** (top-right corner)
  - Format: `Run: <runId>` or `Active Run: run-abc-123-def`
  - Clickable to open run folder
  - Updated on new scan
  
- [ ] **Last run timestamp**
  - Format: `Last scanned: 2026-01-21 10:30 UTC`
  - Updates after each successful scan
  - Shows duration: `Completed in 2m 34s`
  
- [ ] **"Open Run Folder" button**
  - Opens `.reposense/runs/<runId>/` in file explorer
  - Disabled if run folder missing
  - Shows confirmation: "Opening folder..." then navigates
  
- [ ] **"Copy Run Summary" button**
  - Copies to clipboard:
    ```
    RepoSense Run Summary
    Run ID: run-abc-123-def
    Timestamp: 2026-01-21T10:30:00Z
    Endpoints: 47
    Calls: 89
    Gaps: 12
    Status: COMPLETE
    ```
  - Shows toast: "Copied to clipboard"

- [ ] **"Export Results" button**
  - Creates `reposense-run-<runId>.zip`
  - Shows progress: "Exporting... 45%"
  - Opens download automatically
  - Verifies all artifacts included

---

### Report Panel Display
Report must show:

- [ ] **Report source attribution**
  - "Report generated: 2026-01-21 10:30 UTC (run-abc-123)"
  - Clickable to jump to run folder
  
- [ ] **Data freshness indicator**
  - ✅ Green: "Data current (generated today)"
  - ⚠️ Yellow: "Data from 2 days ago"
  - ❌ Red: "Data from >7 days ago - rescan recommended"
  
- [ ] **Gap list with sourceRefs**
  - Each gap shows: `Gap-123: [file:line] [method] [endpoint]`
  - Clicking opens file in editor at correct line/column
  - Shows snippet context (±3 lines)

- [ ] **Test evidence links**
  - "Evidence: 8 tests, 3 screenshots, 2 logs"
  - Clicking opens evidence folder
  - Shows artifact timeline

---

### Chat Panel Display
Chat must show:

- [ ] **Run context header**
  - "Chat Session for Run: run-abc-123"
  - "Connected at: 2026-01-21 10:30 UTC"
  - "Selected: Gap-456" (if context available)
  
- [ ] **Message citations**
  - Every bot response prefixed with: `[Citation: run-abc-123]`
  - Example:
    ```
    [Citation: run-abc-123]
    Gap gap-456 exists because no matching endpoint 
    found in GET /api/users/:id (src/routes.ts:89)
    ```
  
- [ ] **Evidence references in responses**
  - Links format: `[Evidence: screenshot-123]` or `[Evidence: test-456]`
  - Clickable to open artifact
  - Shows artifact metadata on hover

- [ ] **Suggested actions with context**
  - Format:
    ```
    [Generate Test for gap-456]
    [View Evidence]
    [Add Endpoint]
    [Dismiss]
    ```
  - Each action preserves runId and gapId

---

## PART 2: Action Logging & Run Attachment

Every user action must be tracked:

### Destructive Operations
- [ ] **Apply Diff confirmation**
  ```
  Confirmation Dialog:
  ┌─────────────────────────────────────────────┐
  │ Apply Changes to 3 Files?                   │
  │                                             │
  │ + src/api/users.ts (15 additions, 2 del)    │
  │ + src/api/products.ts (8 additions, 0 del)  │
  │ + src/routes.ts (3 additions, 5 del)        │
  │                                             │
  │ [Cancel] [Preview] [Apply]                  │
  └─────────────────────────────────────────────┘
  ```
  - Requires explicit click on [Apply]
  - Preview shows exact diff
  - Cancel button always available

- [ ] **Test execution confirmation**
  ```
  [⚠️ Run 23 tests?]
  This may take 2-3 minutes.
  [Cancel] [Run]
  ```

- [ ] **Diagram regeneration**
  - Shows: "Regenerate all diagrams? (5 diagrams, ~10s)"
  - Confirmation required

### Action Timeline
- [ ] **meta.json timeline updated**
  ```json
  "stateTimeline": [
    {"state": "SCANNING", "timestamp": "2026-01-21T10:00:00Z"},
    {"state": "DIFF_PREVIEW", "timestamp": "2026-01-21T10:05:00Z"},
    {"state": "DIFF_APPLIED", "timestamp": "2026-01-21T10:06:00Z"},
    {"state": "TESTS_RUNNING", "timestamp": "2026-01-21T10:06:30Z"},
    {"state": "COMPLETE", "timestamp": "2026-01-21T10:09:00Z"}
  ]
  ```

- [ ] **Action artifacts stored**
  - Diffs: `.reposense/runs/<runId>/diffs/diff-123.patch`
  - Applied diffs tracked in `diff-index.json`
  - Tests: `.reposense/runs/<runId>/tests/generated-test-123.ts`

### Progress Indicators
- [ ] **Long operations show progress**
  - Scanning: "Scanning... 45% (234/520 files analyzed)"
  - Generating: "Generating diagrams... 3/5 complete"
  - Testing: "Running tests... 12/23 passed (4 running)"
  
- [ ] **Progress bar is indeterminate when duration unknown**
  - Shows: "Processing..." with spinner
  - No specific percentage claimed

- [ ] **Cancellation available**
  - [Cancel] button visible during progress
  - Gracefully stops operation
  - Updates run status to CANCELLED in meta.json

---

## PART 3: No Runtime Recomputation

Verification that UI never recalculates from source:

### Reports
- [ ] **Reports read report.json ONLY**
  - No filesystem scans during render
  - No source code analysis
  - All data from report.json
  - Verified by: monitoring system calls during report render

- [ ] **Totals always match**
  - graph.json: `nodes.length`
  - report.json: `executiveSummary.totalGaps`
  - UI display: exact match
  - Test: assert UI display === report.json value

- [ ] **Diagrams read diagrams.json + .mmd files ONLY**
  - No graph.json re-read
  - No source code access
  - All rendering from .mmd files
  - Verified by: file access logging

### Chat Responses
- [ ] **Never generate answers without run context**
  - Every response cites runId
  - Every code reference links to graph ID
  - Cannot answer questions about "current state" without specifying run
  - Test question: "What's the latest gap?" → requires runId specification

- [ ] **Fallback handling**
  - If artifact missing: "Evidence file not found. Run may have been deleted."
  - If graph.json missing: "Run data incomplete. Rescan recommended."
  - Never attempt to recreate data

### Evidence
- [ ] **Evidence indexed but not generated**
  - Artifacts pre-generated during execution phase
  - Evidence index (evidence-index.json) created once
  - No runtime discovery of evidence

- [ ] **Artifact paths valid**
  - All paths relative to run folder
  - All files exist on disk
  - No broken symlinks or invalid references

---

## PART 4: Data Flow Verification

Verify clean data flow from artifacts → UI:

### Data Source Audit
```
Dashboard Display
  ├─ runId: meta.json
  ├─ timestamp: meta.json (createdAt)
  ├─ endpoint count: report.json (executiveSummary)
  ├─ gap count: report.json (apiContractHealth.gaps.length)
  └─ [NEVER from graph.json or source scan]

Report Page
  ├─ totals: report.json
  ├─ gap details: report.json (apiContractHealth.gaps[])
  ├─ coverage: report.json (coverage.statement, etc)
  └─ [NEVER recalculated from source]

Diagram Page
  ├─ diagram content: .mmd files (api-overview.mmd, etc)
  ├─ diagram stats: diagrams.json (stats.nodeCount)
  ├─ click-to-code: .mmd embedded metadata
  └─ [NEVER regenerated from graph.json]

Evidence Gallery
  ├─ artifact list: evidence-index.json
  ├─ artifact paths: evidence-index.json (mappings)
  ├─ artifact files: disk read (evidence/screenshots/, etc)
  └─ [NEVER discovered at runtime]

Chat
  ├─ context: meta.json (runId)
  ├─ gap details: graph.json (nodes with type='Gap')
  ├─ test mapping: evidence-index.json (gap → test mapping)
  └─ [NEVER re-analyzed from source]
```

---

## PART 5: Error Handling Integrity

### When Artifacts Missing
- [ ] **Report page shows:**
  ```
  ⚠️ Report data incomplete
  Expected: report.json
  Status: NOT FOUND
  Action: [Rescan] [Open Run Folder]
  ```

- [ ] **Diagram page shows:**
  ```
  ⚠️ Diagram files missing
  Generated: 2026-01-20 14:30 UTC
  Status: Regeneration recommended
  Action: [Regenerate] [Browse Cache]
  ```

- [ ] **Evidence gallery shows:**
  ```
  ⚠️ Evidence index invalid
  8/12 artifacts found
  Missing: test-456.png, test-789.log
  Action: [Re-run Tests] [Manual Recovery]
  ```

### When Run Deleted
- [ ] **History view shows:**
  ```
  ❌ run-abc-123 (DELETED)
  Archived: 2026-01-21
  Files: 847 MB (available in backup)
  ```

- [ ] **Active run not lost**
  - Latest symlink points to most recent valid run
  - Cannot delete run while "latest"
  - Confirmation required: "Delete run-abc? This is the latest run."

---

## PART 6: Acceptance Sign-Off

### Before Deployment
- [ ] All checklist items verified in staging
- [ ] No live computation observed in monitoring
- [ ] Chat responses all cite artifacts
- [ ] Evidence chain functional for 5+ gaps
- [ ] Export/import cycle successful
- [ ] Crash recovery tested (kill server mid-scan)

### Post-Deployment (First Week)
- [ ] Monitor for orphaned runs
- [ ] Check for any filesystem re-scans during report render
- [ ] Verify chat response quality metrics
- [ ] Evidence artifact hit rate >95%
- [ ] No "recomputation fallback" errors logged

### Sign-Off
```
Verified by: [QA Engineer Name]
Date: [Date]
Status: ✅ READY FOR PRODUCTION

Tested Scenarios:
- [ ] Clean install with new scan
- [ ] Multi-run stability (10+ consecutive scans)
- [ ] Evidence chain (5+ gaps end-to-end)
- [ ] Chat integrity (50+ questions)
- [ ] Export/import cycle
- [ ] Crash recovery
- [ ] Data freshness indicators
- [ ] No runtime recomputation (monitored)
```

---

## PART 7: Continuous Monitoring

### Metrics to Track
- **Report render time**: Should not increase with repo size (reads from JSON)
- **Chat response latency**: <2s for all artifact lookups
- **Evidence access success rate**: >99% (artifacts exist where indexed)
- **Recomputation fallback rate**: 0% (should never happen)
- **Run storage efficiency**: Artifacts should be compressed (<100MB for typical repos)

### Alerting Rules
- 🔴 **Critical**: Recomputation fallback triggered → Page alert + investigation
- 🟠 **High**: Evidence artifact missing (hit rate <98%) → Log investigation queue
- 🟡 **Medium**: Report render >5s → Check for IO issue
- 🟢 **Info**: Chat latency >2s → Trace artifact lookup

---

**This checklist is COMPLETE and BINDING. All items must pass before Sprint 9 acceptance.**
