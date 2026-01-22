# ChatBot Conversation Modes

5 distinct conversation modes that change how the ChatBot responds, what actions are available, and what evidence is emphasized.

---

## Overview

**Mode Selection:**
```
1. Mode Menu in ChatBot panel header
2. Right-click on gap: "Ask RepoSense..." → mode selector
3. Command Palette: "RepoSense: Enter [Mode] Mode"
```

**State Tracking:**
```typescript
class ChatBotService {
  currentMode: ChatMode = ChatMode.EXPLAIN;  // persisted in settings
  modeContext: Record<ChatMode, any> = {};   // mode-specific state
}
```

---

## 1. EXPLAIN MODE

**Purpose:** Answer "why?" questions about the current state

**Tone:** Friendly, educational, detailed

**Available Intents:**
- EXPLAIN_GAPS
- EXPLAIN_GAP_DETAIL
- UNDERSTAND_IMPACT
- IDENTIFY_PRIORITY
- ASSESS_CRITICALITY
- EVALUATE_RISK
- HELP

**Conversation Flow:**
```
User: "Why is this endpoint unused?"
  ↓
ChatBot (EXPLAIN): "This endpoint [GET /api/v2/legacy] hasn't been called
                    in 30 days. It's listed as 'unused' in our analysis.
                    Last called: Jan 5, 2026"
  ↓
Evidence shown:
  • Last call timestamp
  • Call history graph
  • Code location
  • All tests that reference it (0)
  ↓
Suggested actions:
  [Remove Endpoint] [Keep & Add Tests] [Mark Deprecated]
```

**ChatResponse Format:**
```json
{
  "mode": "EXPLAIN",
  "summary": "Human-readable explanation",
  "details": [
    { "label": "Last Used", "value": "30 days ago" },
    { "label": "Call Frequency", "value": "0 times in 30 days" }
  ],
  "evidence": [
    { "type": "timeline", "data": callHistory },
    { "type": "codeSnippet", "data": endpointCode }
  ],
  "suggestions": [
    { "action": "REMOVE_ENDPOINT", "rationale": "..." },
    { "action": "ADD_TEST", "rationale": "..." }
  ]
}
```

**ChatBot Behavior:**
- ✅ Answer questions
- ✅ Show evidence (code, graphs, metrics)
- ✅ Suggest next steps
- ❌ NOT auto-apply changes
- ❌ NOT run tests automatically
- ✅ Link to details (code locations, test files)

---

## 2. PLAN MODE

**Purpose:** Work through a remediation strategy

**Tone:** Strategic, step-by-step, option-focused

**Available Intents:**
- RECOMMEND_ORDER
- IDENTIFY_PRIORITY
- ASSESS_CRITICALITY
- EVALUATE_RISK
- PROPOSE_REMEDIATION
- SHOW_DIFF
- HELP

**Conversation Flow:**
```
User: "Help me create a plan to fix these gaps"
  ↓
ChatBot (PLAN): "I recommend a 3-step approach:
                 Step 1: Fix 3 CRITICAL gaps (est. 4h)
                 Step 2: Add tests for 8 HIGH gaps (est. 3h)
                 Step 3: Review untested endpoints (est. 2h)"
  ↓
User: "Show me Step 1"
  ↓
ChatBot (PLAN): "Step 1 involves:
                 • Missing endpoint POST /api/users
                 • Missing endpoint GET /api/reports/:id
                 • Orphaned endpoint DELETE /admin/legacy
                 
                 Suggested fix for each:"
  ↓
User: "Generate tests for Step 1"
  ↓
ChatBot: [Shows diff, asks confirmation]
```

**ChatResponse Format:**
```json
{
  "mode": "PLAN",
  "plan": {
    "title": "3-Step Remediation Plan",
    "steps": [
      {
        "number": 1,
        "title": "Fix CRITICAL gaps",
        "gaps": [/* 3 gaps */],
        "effort": "4 hours",
        "actions": ["GENERATE_TESTS", "REVIEW_REMEDIATION"]
      },
      { "number": 2, "title": "...", ... },
      { "number": 3, "title": "...", ... }
    ]
  },
  "suggestion": "Start with Step 1: highest impact",
  "actions": [
    { "label": "Start Step 1", "intent": "GENERATE_TESTS", "params": { "step": 1 } },
    { "label": "Jump to Step 2", "intent": "...", "params": { "step": 2 } },
    { "label": "Custom Plan", "intent": "HELP", "params": {} }
  ]
}
```

**ChatBot Behavior:**
- ✅ Propose structured plans
- ✅ Break down complexity
- ✅ Show effort estimates
- ✅ Preview diffs for each step
- ⚠️ Ask confirmation before auto-applying
- ✅ Allow skip/customize steps
- ❌ NOT run tests without approval

---

## 3. GENERATE MODE

**Purpose:** Create tests and code artifacts

**Tone:** Action-oriented, technical, artifact-focused

**Available Intents:**
- GENERATE_TESTS
- GENERATE_TESTS_SPECIFIC
- PROPOSE_REMEDIATION
- SHOW_DIFF
- HELP

**Conversation Flow:**
```
User: "Generate tests for CRITICAL gaps"
  ↓
ChatBot (GENERATE): "I'll generate 3 test files for:
                     • POST /api/users
                     • GET /api/reports/:id
                     • DELETE /admin/legacy
                     
                     Framework: Playwright (detected)
                     Scenarios: Happy path + Error cases"
  ↓
[Diff shown automatically]
  ↓
User: "Looks good, apply these"
  ↓
ChatBot (GENERATE): "✅ Applied 3 test files
                     Artifacts saved to:
                     • tests/api/users.spec.ts
                     • tests/api/reports.spec.ts
                     • tests/admin/legacy.spec.ts"
  ↓
Suggested next: "Run tests now?"
```

**ChatResponse Format:**
```json
{
  "mode": "GENERATE",
  "artifacts": {
    "total": 3,
    "files": [
      {
        "path": "tests/api/users.spec.ts",
        "framework": "Playwright",
        "scenarios": 5,
        "lines": 120,
        "confidence": 0.92
      },
      ...
    ]
  },
  "diff": { /* side-by-side */ },
  "actions": [
    { "label": "Review Diff", "action": "SHOW_DIFF" },
    { "label": "Apply Now", "action": "APPLY_ARTIFACTS", "confirmationRequired": true },
    { "label": "Modify Before Applying", "action": "EDIT_ARTIFACTS" }
  ]
}
```

**ChatBot Behavior:**
- ✅ Generate tests/code
- ✅ Show diff automatically
- ✅ Save to workspace
- ⚠️ Require confirmation for "Apply"
- ✅ Show confidence score
- ✅ Link to generated files
- ✅ Suggest next: "Run tests?"

---

## 4. EXECUTE MODE

**Purpose:** Run tests and capture execution evidence

**Tone:** Real-time, status-driven, results-focused

**Available Intents:**
- RUN_TESTS
- RUN_VALIDATION
- RERUN_WITH_DEBUG
- SHOW_EXECUTION_EVIDENCE
- HELP

**Conversation Flow:**
```
User: "Run the tests now"
  ↓
ChatBot (EXECUTE): "🔄 Starting test execution..."
  ↓
[Real-time progress]
Running tests...
  ✅ tests/api/users.spec.ts (15 tests)
  ✅ tests/api/reports.spec.ts (12 tests)
  ⏳ tests/admin/legacy.spec.ts (8 tests)
  ↓
ChatBot (EXECUTE): "✅ Test execution complete
                     Results: 32/35 passed (91%)
                     Duration: 2m 15s"
  ↓
[Evidence shown]
  • Test logs (expandable)
  • Screenshots/videos
  • Failed test details
  ↓
User: "Why did this test fail?"
  ↓
ChatBot: "Test 'delete-legacy-endpoint' failed:
           AssertionError: expected 404, got 500
           Error: DELETE /admin/legacy → 500 Internal Server Error"
  ↓
Suggested: "Rerun with debug logging?"
```

**ChatResponse Format:**
```json
{
  "mode": "EXECUTE",
  "executionState": {
    "status": "RUNNING|COMPLETE|FAILED",
    "progress": { "passed": 32, "failed": 3, "total": 35 },
    "duration": "2m 15s",
    "timestamp": "2026-01-21T15:30:00Z"
  },
  "results": {
    "testSuites": [
      {
        "name": "users",
        "passed": 15,
        "failed": 0,
        "details": [
          { "name": "should create user", "status": "PASS" },
          ...
        ]
      }
    ]
  },
  "evidence": {
    "logs": { "url": ".reposense/runs/<runId>/logs.txt" },
    "screenshots": [{ "url": "...", "test": "..." }],
    "videos": [{ "url": "...", "test": "..." }]
  },
  "actions": [
    { "label": "View Logs", "action": "SHOW_LOGS" },
    { "label": "Rerun Failed", "action": "RERUN_WITH_DEBUG" },
    { "label": "Export Evidence", "action": "EXPORT_EVIDENCE" }
  ]
}
```

**ChatBot Behavior:**
- ✅ Stream execution progress in real-time
- ✅ Show pass/fail counts
- ✅ Link to evidence (logs, screenshots, videos)
- ✅ Offer "Rerun with debug"
- ✅ Suggest "Export evidence"
- ❌ NOT stop on first failure (run all)
- ✅ Suggest next: "Export for audit?"

---

## 5. AUDIT MODE

**Purpose:** Generate compliance-grade documentation and evidence chains

**Tone:** Formal, governance-focused, legally-sound

**Available Intents:**
- GENERATE_UAT_REPORT
- EXPORT_EVIDENCE
- CREATE_EXECUTIVE_SUMMARY
- SHOW_COVERAGE_DELTA
- SHOW_EXECUTION_EVIDENCE
- HELP

**Conversation Flow:**
```
User: "Generate audit-ready evidence"
  ↓
ChatBot (AUDIT): "📋 Generating UAT Report...
                  
                  Report will include:
                  • Gap analysis (signed with hash)
                  • Test generation log (with LLM model/prompt)
                  • Test execution evidence (screenshots, logs)
                  • Coverage metrics (before/after)
                  • Sign-off attestation
                  
                  Scope: CRITICAL + HIGH gaps only"
  ↓
[Report generated]
  ↓
ChatBot (AUDIT): "✅ UAT Report ready
                  
                  Included:
                  ✓ Gap scan (hash: abc123...)
                  ✓ Test generation (5 tests, confidence 92%)
                  ✓ Execution evidence (5/5 passed)
                  ✓ Coverage improvement: 72% → 87%
                  ✓ Sign-off ready
                  
                  Report location: .reposense/runs/<runId>/report.uat.md
                  Hash for immutability: sha256:..."
  ↓
Suggested actions:
  [Download PDF] [Email to Lead] [Export Archive] [View Signature]
```

**ChatResponse Format:**
```json
{
  "mode": "AUDIT",
  "report": {
    "title": "UAT Report - 2026-01-21",
    "generated": "2026-01-21T15:45:00Z",
    "scope": "CRITICAL + HIGH gaps",
    "artifacts": {
      "gapAnalysis": {
        "total": 12,
        "critical": 3,
        "high": 5,
        "hash": "sha256:..."
      },
      "testGeneration": {
        "total": 5,
        "confidence": 0.92,
        "prompt": "..."
      },
      "execution": {
        "passed": 5,
        "failed": 0,
        "coverage": { "before": 0.72, "after": 0.87 }
      }
    }
  },
  "evidence": [
    { "type": "attestation", "content": "All tests executed on verified hardware" },
    { "type": "signoff", "signer": "system", "timestamp": "..." },
    { "type": "hash", "algorithm": "sha256", "value": "..." }
  ],
  "actions": [
    { "label": "Download Report (MD)", "action": "EXPORT", "params": { "format": "md" } },
    { "label": "Export Archive", "action": "EXPORT", "params": { "format": "zip" } },
    { "label": "Sign & Attest", "action": "SIGN_REPORT" }
  ]
}
```

**ChatBot Behavior:**
- ✅ Generate compliance-grade reports
- ✅ Include evidence chains (hashes, timestamps, signatures)
- ✅ Show scope (which gaps included)
- ✅ Link to all artifacts
- ✅ Create immutable records
- ✅ Support sign-off workflows
- ✅ Format for legal/compliance teams
- ❌ NOT auto-share (user controls distribution)

---

## Mode Switching Behavior

**Switching from X to Y mode:**
```
1. Save current conversation state to "X-session"
2. Load or create "Y-session"
3. Available intents change
4. Response format changes
5. Evidence emphasis changes
```

**Example:**
```
User in EXPLAIN mode:
  "Now run the tests"
  ↓
ChatBot: "That's an execute action. 
          Would you like to switch to EXECUTE mode first?
          [Switch to Execute Mode] [Ask to Run Here]"
  ↓
If user clicks [Ask to Run Here]:
  ChatBot runs test but uses EXPLAIN-style responses
  ↓
If user clicks [Switch to Execute Mode]:
  Conversation state saved
  Mode switched to EXECUTE
  ChatBot provides EXECUTE-style real-time streaming
```

---

## Mode Persistence

**User Preference Storage:**
```json
{
  "reposense.chatbot.defaultMode": "EXPLAIN",
  "reposense.chatbot.sessionModes": {
    "workspace-id": {
      "current": "EXECUTE",
      "lastUsed": "2026-01-21T15:00:00Z",
      "sessions": {
        "EXPLAIN": { "history": [...] },
        "PLAN": { "history": [...] },
        "GENERATE": { "history": [...] },
        "EXECUTE": { "history": [...] },
        "AUDIT": { "history": [...] }
      }
    }
  }
}
```

---

## Implementation Checklist

```
□ Define ChatMode enum (already done in ChatBot.ts)
□ Add mode to ChatContext interface
□ Implement mode-aware intent routing
□ Build mode-specific ChatResponse formatting
□ Create mode switcher UI (header button)
□ Add mode persistence to workspace settings
□ Implement mode-aware action filtering
□ Test mode transitions
□ Document each mode for end-users
```

---

## Next: Invocation Points

See **CHATBOT_INVOCATION_POINTS.md** for how users trigger these modes:
- Right-click context menu
- TreeView gap actions
- Command Palette
- Chat UI buttons
- Conversation detection
