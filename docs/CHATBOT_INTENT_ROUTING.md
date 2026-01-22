# ChatBot Intent Routing Map

Complete routing table: Intent → Handler → Services → Output

---

## A. ANALYSIS INTENTS

### `EXPLAIN_GAPS`

**User Trigger:**
- "What API gaps exist in this repo?"
- Button: [💬 Explain] on gap Analysis TreeView

**Flow:**
```
Intent: EXPLAIN_GAPS
  ↓
Handler: handleExplainGaps()
  ├─ Read: lastAnalysisResult.gaps
  ├─ Summarize by type & severity
  └─ Suggest next actions
  ↓
Output:
  - Summary: "Found 12 gaps..."
  - Actions: [View All], [Generate Tests]
  - Attachments: Gap breakdown
```

**Services Used:**
- `AnalysisEngine`: Gap data (read-only)
- `RunOrchestrator`: Get analysis result

**Confirmation:** ❌ Not required

---

### `EXPLAIN_GAP_DETAIL`

**User Trigger:**
- "Why is this endpoint marked as orphaned?"
- Click gap in TreeView → [💬 Explain] button
- Right-click on gap → "Ask RepoSense"

**Flow:**
```
Intent: EXPLAIN_GAP_DETAIL
  ↓
Precondition: focusedGapId must be set
  ↓
Handler: handleExplainGapDetail()
  ├─ Look up gap by gapId
  ├─ Retrieve gap metadata (severity, frequency, blast radius)
  ├─ Generate human-readable explanation
  └─ Suggest actions
  ↓
Output:
  - Explanation: "This endpoint is unused because..."
  - Priority score: 75/100
  - Actions: [Generate Test], [View in Problems Panel]
```

**Services Used:**
- `AnalysisEngine`: Gap details (read-only)
- `DiagnosticsManager`: Problem location

**Confirmation:** ❌ Not required

---

### `UNDERSTAND_IMPACT`

**User Trigger:**
- "What will break if we don't fix this?"
- Context: User has focused a gap

**Flow:**
```
Intent: UNDERSTAND_IMPACT
  ↓
Handler: handleUnderstandImpact()
  ├─ Analyze gap type (missing endpoint vs unused)
  ├─ Count affected files
  ├─ Assess downstream dependencies
  └─ Generate impact statement
  ↓
Output:
  - "This missing endpoint impacts 5 files, 3 components"
  - Risk: CRITICAL
  - Actions: [Show Affected Files]
```

**Services Used:**
- `AnalysisEngine`: Endpoint relationships
- `IncrementalAnalyzer`: Dependency graph

**Confirmation:** ❌ Not required

---

## B. DECISION INTENTS

### `IDENTIFY_PRIORITY`

**User Trigger:**
- "Which gaps are most critical?"
- Command palette: "RepoSense: Identify Priority Gaps"

**Flow:**
```
Intent: IDENTIFY_PRIORITY
  ↓
Handler: handleIdentifyPriority()
  ├─ Sort gaps by priorityScore (0-100)
  ├─ Take top 5
  ├─ Display with explanations
  └─ Suggest batch actions
  ↓
Output:
  - Ranked list of 5 gaps
  - "1. [GET /users/:id] - UNUSED - Priority: 92/100"
  - Actions: [Generate Tests for Top 5]
```

**Services Used:**
- `AnalysisEngine`: Gap scoring (already computed)
- `RunOrchestrator`: Get analysis result

**Confirmation:** ❌ Not required

---

### `ASSESS_CRITICALITY`

**User Trigger:**
- "Is this safe to ignore?"
- "What's the risk if we don't address this?"

**Flow:**
```
Intent: ASSESS_CRITICALITY
  ↓
Handler: handleAssessCriticality()
  ├─ Classify gap type (missing, unused, untested)
  ├─ Evaluate severity
  ├─ Count frequency
  └─ Produce risk statement
  ↓
Output:
  - "CRITICAL: Missing endpoint called 47 times"
  - Recommendation: "Fix immediately"
  - Actions: [Generate Test], [Plan Remediation]
```

**Services Used:**
- `AnalysisEngine`: Gap frequency data
- `RemediationEngine`: Risk assessment

**Confirmation:** ❌ Not required

---

### `EVALUATE_RISK`

**User Trigger:**
- "What's the overall risk level?"
- "Can we deploy with these gaps?"

**Flow:**
```
Intent: EVALUATE_RISK
  ↓
Handler: handleEvaluateRisk()
  ├─ Count CRITICAL gaps
  ├─ Count HIGH gaps
  ├─ Assess coverage %
  └─ Produce risk level
  ↓
Output:
  - "🔴 CRITICAL: 3 CRITICAL gaps found"
  - Recommendation: "Address before deployment"
  - Actions: [Generate Tests for CRITICAL]
```

**Services Used:**
- `AnalysisEngine`: Gap severity distribution
- `TestCoverageAnalyzer`: Coverage %

**Confirmation:** ❌ Not required (analysis only)

---

### `RECOMMEND_ORDER`

**User Trigger:**
- "What should we do first?"
- "Create a remediation plan"

**Flow:**
```
Intent: RECOMMEND_ORDER
  ↓
Handler: handleRecommendOrder()
  ├─ Order: CRITICAL → HIGH → untested → unused
  ├─ Suggest batch sizes
  ├─ Estimate effort
  └─ Generate step-by-step plan
  ↓
Output:
  - "Step 1: Fix 3 CRITICAL gaps (est. 4h)"
  - "Step 2: Generate tests for untested endpoints (est. 2h)"
  - "Step 3: Review and merge"
  - Actions: [Start Step 1], [Start Step 2]
```

**Services Used:**
- `AnalysisEngine`: Gap data
- `PerformanceMonitor`: Effort estimation

**Confirmation:** ❌ Not required

---

## C. GENERATION INTENTS

### `GENERATE_TESTS`

**User Trigger:**
- "Generate tests for missing endpoints"
- Button: [🧪 Generate Test] on gap
- Command palette: "RepoSense: Generate Tests"

**Flow:**
```
Intent: GENERATE_TESTS
  ↓
Handler: handleGenerateTests()
  ├─ Offer severity filter: CRITICAL / CRITICAL+HIGH / All
  ├─ Show test count per filter
  └─ Display options
  ↓
User selects level
  ↓
Action: GENERATE_ARTIFACT
  ├─ Call: TestGenerationService.generateTestPlans()
  ├─ Call: TestExecutor.prepareTestFiles()
  └─ Call: ArtifactStore.saveGeneratedTest()
  ↓
Output:
  - "Generated 3 test files"
  - Diffs shown automatically
  - Actions: [Review Diff], [Show Diff], [Apply]
```

**Services Used:**
- `TestGenerationService`: Test generation
- `ArtifactStore`: File persistence
- `ChatBotGovernance`: Confirmation check

**Confirmation:** ✅ Required for "Generate All"

---

### `GENERATE_TESTS_SPECIFIC`

**User Trigger:**
- "Generate tests for Playwright only"
- "Use Jest, not Cypress"

**Flow:**
```
Intent: GENERATE_TESTS_SPECIFIC
  ↓
Handler: handleGenerateTestsSpecific()
  ├─ Parse framework preference
  ├─ Filter gaps
  └─ Generate for selected framework
  ↓
Output:
  - "Generated 5 Playwright test files"
  - Actions: [Show Diff], [Apply]
```

**Services Used:**
- `TestGenerationService`: Framework-specific generation
- `ArtifactStore`: Save files

**Confirmation:** ✅ Required

---

### `PROPOSE_REMEDIATION`

**User Trigger:**
- "Suggest a fix for this endpoint"
- Button: [🛠 Suggest Fix]

**Flow:**
```
Intent: PROPOSE_REMEDIATION
  ↓
Handler: handleProposeRemediation()
  ├─ Analyze gap type
  ├─ Call: RemediationEngine.generateRemediationOptions()
  ├─ Present options (no auto-apply)
  └─ Wait for user approval
  ↓
Output:
  - "Option 1: Create endpoint /users/:id"
  - "Option 2: Add test coverage"
  - Actions: [View Code], [Show Diff], [Approve]
```

**Services Used:**
- `RemediationEngine`: Code suggestion
- `ChatBotGovernance`: Diff generation

**Confirmation:** ✅ Required before apply

---

### `SHOW_DIFF`

**User Trigger:**
- "Show me the diff"
- Automatic when artifacts are generated

**Flow:**
```
Intent: SHOW_DIFF
  ↓
Handler: handleShowDiff()
  ├─ Fetch pending artifacts
  ├─ Generate diffs (before/after)
  └─ Display side-by-side
  ↓
Output:
  - Side-by-side diff view
  - File size change: +45 lines
  - Actions: [Approve], [Reject], [Modify]
```

**Services Used:**
- `ArtifactStore`: Get artifacts
- `ChatBotGovernance`: Diff generation

**Confirmation:** ❌ Not required (display only)

---

## D. EXECUTION INTENTS

### `RUN_TESTS`

**User Trigger:**
- "Run the tests now"
- Button: [▶ Run Tests]
- Auto-triggered after applying changes

**Flow:**
```
Intent: RUN_TESTS
  ↓
Precondition: Tests must exist
  ↓
Handler: handleRunTests()
  ├─ Offer scope: Generated / Suite / All
  ├─ Show frameworks available
  └─ Display confirmation
  ↓
User confirms
  ↓
Action: TRIGGER_TEST_EXECUTION
  ├─ Call: RunOrchestrator.transitionTo(EXECUTING)
  ├─ Call: TestExecutor.executeTestsParallel()
  ├─ Stream results in real-time
  └─ Call: ArtifactStore.saveExecutionResults()
  ↓
Output:
  - "Running 15 tests..."
  - Live progress: "✅ 12/15 passed"
  - Actions: [View Logs], [View Evidence]
```

**Services Used:**
- `TestExecutor`: Test execution
- `RunOrchestrator`: State management
- `ArtifactStore`: Result persistence

**Confirmation:** ✅ Required

---

### `RUN_VALIDATION`

**User Trigger:**
- "Validate these changes"
- Button: [▶ Run Validation]

**Flow:**
```
Intent: RUN_VALIDATION
  ↓
Handler: handleRunValidation()
  ├─ Run tests for focused gap
  ├─ Analyze results
  ├─ Check coverage
  └─ Report validation status
  ↓
Output:
  - "✅ All tests pass"
  - "Coverage: 85%"
  - Actions: [Export Evidence], [Merge]
```

**Services Used:**
- `TestExecutor`: Validation execution
- `TestCoverageAnalyzer`: Coverage analysis

**Confirmation:** ✅ Required

---

### `RERUN_WITH_DEBUG`

**User Trigger:**
- "Why did this test fail?"
- "Rerun with debug logging"

**Flow:**
```
Intent: RERUN_WITH_DEBUG
  ↓
Handler: handleRerunWithDebug()
  ├─ Rerun failed tests with debug=true
  ├─ Capture verbose logs
  ├─ Screenshot on failure
  └─ Display debug output
  ↓
Output:
  - Verbose logs with timestamps
  - Error trace
  - Screenshot of failure
  - Actions: [Fix Test], [Show Error]
```

**Services Used:**
- `TestExecutor`: Debug execution
- `ArtifactStore`: Debug artifacts (screenshots, logs)

**Confirmation:** ✅ Required

---

### `SHOW_EXECUTION_EVIDENCE`

**User Trigger:**
- "Show me the test results"
- Button: [📋 View Evidence]

**Flow:**
```
Intent: SHOW_EXECUTION_EVIDENCE
  ↓
Handler: handleShowExecutionEvidence()
  ├─ Fetch latest ExecutionResult
  ├─ Load artifacts (screenshots, videos, logs)
  ├─ Aggregate metrics
  └─ Display timeline
  ↓
Output:
  - Test results: 15 passed, 2 failed
  - Screenshots/videos linked
  - Execution log
  - Actions: [Export], [Share]
```

**Services Used:**
- `RunOrchestrator`: Get latest run
- `ArtifactStore`: Load evidence artifacts

**Confirmation:** ❌ Not required (display only)

---

## E. REPORTING INTENTS

### `GENERATE_UAT_REPORT`

**User Trigger:**
- "Generate a UAT report"
- Command palette: "RepoSense: Generate UAT Report"

**Flow:**
```
Intent: GENERATE_UAT_REPORT
  ↓
Handler: handleGenerateUATReport()
  ├─ Gather analysis results
  ├─ Gather test execution evidence
  ├─ Call: ReportGenerator.generateUATReport()
  └─ Save: .reposense/runs/<runId>/report.uat.md
  ↓
Output:
  - "✅ UAT report generated"
  - Report includes:
    * Executive summary
    * Test results
    * Coverage %
    * Signed-off evidence
  - Actions: [Open Report], [Export], [Email]
```

**Services Used:**
- `ReportGenerator`: Report generation
- `ArtifactStore`: Save report
- `RunOrchestrator`: Get execution context

**Confirmation:** ❌ Not required

---

### `EXPORT_EVIDENCE`

**User Trigger:**
- "Export this for audit"
- "Share the evidence"

**Flow:**
```
Intent: EXPORT_EVIDENCE
  ↓
Handler: handleExportEvidence()
  ├─ Offer formats: Markdown / JSON / HTML / Archive
  ├─ Call: ArtifactStore.exportRun()
  └─ Generate download link
  ↓
Output:
  - "Export ready: report-2026-01-21.zip"
  - Includes: analysis, tests, execution, screenshots
  - Actions: [Download], [Share Link]
```

**Services Used:**
- `ArtifactStore`: Export logic
- `ChatBotGovernance`: Audit trail

**Confirmation:** ❌ Not required

---

### `CREATE_EXECUTIVE_SUMMARY`

**User Trigger:**
- "Create an executive summary"
- Auto-triggered at end of full run

**Flow:**
```
Intent: CREATE_EXECUTIVE_SUMMARY
  ↓
Handler: handleCreateExecutiveSummary()
  ├─ Summarize gaps by severity
  ├─ Coverage %
  ├─ Effort estimates
  ├─ Call: ReportGenerator.createExecutiveSummary()
  └─ Format for C-level audience
  ↓
Output:
  - 1-page summary
  - Key metrics highlighted
  - Risk assessment
  - Recommendations
  - Actions: [Export], [Email to Lead]
```

**Services Used:**
- `ReportGenerator`: Summary generation
- `AnalysisEngine`: Metrics

**Confirmation:** ❌ Not required

---

### `SHOW_COVERAGE_DELTA`

**User Trigger:**
- "Show coverage improvement"
- "Compare this run vs last run"

**Flow:**
```
Intent: SHOW_COVERAGE_DELTA
  ↓
Handler: handleShowCoverageDelta()
  ├─ Load: current run results
  ├─ Load: previous run results
  ├─ Compute delta
  └─ Display comparison
  ↓
Output:
  - "Coverage improved: 68% → 85% (+17%)"
  - Gaps fixed: 5
  - Gaps added: 2
  - Actions: [View Details], [Merge]
```

**Services Used:**
- `RunOrchestrator`: Get multiple runs
- `ArtifactStore`: Load historical results

**Confirmation:** ❌ Not required

---

## F. META INTENTS

### `HELP`

List available commands and shortcuts.

### `CLARIFY`

When intent recognition is <70% confidence, ask for clarification.

---

## Governance Rules

| Intent Category | Requires Confirmation | Auto-Logs | Rollback Capable |
|---|---|---|---|
| Analysis | ❌ No | ✅ Yes | ✅ N/A (read-only) |
| Decision | ❌ No | ✅ Yes | ✅ N/A (read-only) |
| Generation | ✅ Yes (artifacts) | ✅ Yes | ✅ Yes (restore) |
| Execution | ✅ Yes | ✅ Yes | ⚠️ Partial |
| Reporting | ❌ No | ✅ Yes | ✅ N/A (export) |

---

## Intent Selection Flow Chart

```
User Input (free text or button)
  ↓
analyzeIntent() → IntentAnalysis
  ├─ confidence > 80% → proceed
  ├─ 50-80% → offer alternatives
  └─ < 50% → ask clarification
  ↓
processIntent(intent) → ChatResponse
  ├─ (actions + attachments)
  └─ [User selects action]
  ↓
executeAction() → ChatActionResult
  ├─ Requires confirmation? → ask
  ├─ Log to audit trail
  └─ Update conversation state
```

---

This routing map is the **central nervous system** of the ChatBot. Every user intent flows through this table.
