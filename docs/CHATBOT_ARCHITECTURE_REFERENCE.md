# ChatBot Architecture Reference

Quick-reference guide for developers implementing ChatBot services.

---

## 1. Intent Classification Flowchart

```
User Input: "Generate tests for critical gaps"
  ↓
classifyIntentByPattern()
  ├─ Check: /generate.*test/i → MATCH
  ├─ Check: /critical/i → Extract severity=CRITICAL
  └─ Confidence: 0.92
  ↓
Intent:
{
  type: GENERATE,
  subtype: GENERATE_TESTS,
  target: undefined,
  parameters: { severity: 'CRITICAL' }
}
```

### Pattern Matching Rules

```typescript
ANALYZE patterns:
  - /explain.*gap/i
  - /why.*unused/i
  - /show.*impact/i
  - /what.*gaps/i
  - /identify.*priority/i
  - /assess.*criticality/i
  - /evaluate.*risk/i

DECIDE patterns:
  - /create.*plan/i
  - /suggest.*approach/i
  - /recommend.*order/i
  - /what.*first/i

GENERATE patterns:
  - /generate.*test/i
  - /create.*test/i
  - /suggest.*fix/i
  - /propose.*remediation/i

EXECUTE patterns:
  - /run.*test/i
  - /validate/i
  - /execute/i
  - /debug.*test/i
  - /rerun/i

REPORT patterns:
  - /generate.*report/i
  - /export.*evidence/i
  - /create.*summary/i
  - /show.*coverage/i
```

---

## 2. Action Planning Flowchart

```
ChatIntent:
  type: GENERATE
  subtype: GENERATE_TESTS
  ↓
planActions(intent)
  ├─ Match subtype → GENERATE_TESTS
  ├─ Build action sequence:
  │  1. { type: GENERATE_TEST_CANDIDATES, confirmationRequired: false }
  │  2. { type: SHOW_DIFF, confirmationRequired: false }
  │  3. { type: ASK_CONFIRMATION, confirmationRequired: true }
  │  4. { type: APPLY_ARTIFACTS, confirmationRequired: false }
  └─ Return: ChatAction[]
```

### Action Sequence Templates

**GENERATE_TESTS Sequence:**
```
1. GENERATE_TEST_CANDIDATES (severity, framework)
   ↓
2. SHOW_DIFF (automatic)
   ↓
3. ASK_CONFIRMATION ("Apply these tests?")
   ↓
4. APPLY_ARTIFACTS (if confirmed)
```

**RUN_TESTS Sequence:**
```
1. ASK_CONFIRMATION ("Ready to run tests?")
   ↓
2. EXECUTE_TESTS (scope, framework)
   ↓
3. STREAM_RESULTS (real-time progress)
   ↓
4. SHOW_RESULTS (final report)
```

**EXPORT_EVIDENCE Sequence:**
```
1. GATHER_ARTIFACTS (logs, screenshots, videos)
   ↓
2. GENERATE_REPORT (aggregate metrics)
   ↓
3. EXPORT (format, download)
```

---

## 3. Execution Flow Diagram

```
User Input
  ↓
ChatBotService.processUserInput()
  ├─ classifyIntent() → ChatIntent
  │  └─ Try patterns first (fast)
  │  └─ Fall back to NLP if low confidence
  │  └─ Ask clarification if <70%
  ↓
  ├─ planActions() → ChatAction[]
  │  └─ Build sequence based on intent + mode
  │  └─ Check safety tier
  │  └─ Decide if confirmation needed
  ↓
  ├─ executeActions() → ChatActionResult[]
  │  ├─ For each action:
  │  │  ├─ Check if confirmation required
  │  │  ├─ Ask user (if needed)
  │  │  ├─ Execute via tool (run, generate, etc.)
  │  │  ├─ Log to audit trail
  │  │  └─ Update context
  │  └─ Collect all results
  ↓
  └─ renderResponse() → ChatMessage
     ├─ Format results as HTML
     ├─ Add buttons/actions
     ├─ Include evidence links
     └─ Persist to conversation history
```

---

## 4. Safety Tier Decision Tree

```
Action Requested
  ↓
Is it read-only? (ANALYZE, DECIDE, REPORT export)
  ├─ YES → Tier 1 (SAFE)
  │   └─ NO confirmation needed
  │   └─ Execute immediately
  │   └─ Log for audit
  │
  └─ NO, does it modify files? (GENERATE, APPLY)
      ├─ YES → Tier 2 (MEDIUM)
      │   └─ Show diff first
      │   └─ Ask confirmation
      │   └─ Allow rollback
      │   └─ Log to audit
      │
      └─ NO, is it destructive? (DELETE, OVERWRITE)
          └─ YES → Tier 3 (HIGH)
              ├─ Show code + impact
              ├─ Ask confirmation
              ├─ Ask user to type confirmation text
              ├─ Make irreversible (log heavily)
              └─ Alert IT if needed
```

---

## 5. Mode-Specific Response Format

### EXPLAIN Mode Response

```json
{
  "mode": "EXPLAIN",
  "summary": "This endpoint is marked as unused...",
  "details": [
    { "label": "Last Used", "value": "30 days ago" },
    { "label": "Call Frequency", "value": "0 in 30d" },
    { "label": "Impact": "Low (1 reference)" }
  ],
  "evidence": [
    { "type": "timeline", "data": {...} },
    { "type": "codeSnippet", "file": "routes.ts", "line": 45 }
  ],
  "suggestions": [
    { "action": "REMOVE_ENDPOINT", "label": "Delete unused endpoint" },
    { "action": "GENERATE_TEST", "label": "Add test coverage" }
  ]
}
```

### EXECUTE Mode Response

```json
{
  "mode": "EXECUTE",
  "status": "RUNNING|COMPLETE|FAILED",
  "progress": {
    "passed": 32,
    "failed": 3,
    "total": 35,
    "percentage": 91
  },
  "realTimeLog": [
    "Running tests...",
    "✅ users.spec.ts (15 tests)",
    "✅ reports.spec.ts (12 tests)",
    "❌ legacy.spec.ts (8 tests, 3 failed)"
  ],
  "results": {
    "duration": "2m 15s",
    "framework": "Playwright",
    "failed": [
      {
        "test": "should delete legacy endpoint",
        "error": "AssertionError: expected 404, got 500"
      }
    ]
  },
  "evidence": {
    "logs": "logs/execution.txt",
    "screenshots": ["screenshot-1.png", "screenshot-2.png"],
    "videos": ["video-failed-test.mp4"]
  }
}
```

### AUDIT Mode Response

```json
{
  "mode": "AUDIT",
  "report": {
    "title": "UAT Report - 2026-01-21",
    "generated": "2026-01-21T15:45:00Z",
    "artifacts": {
      "gapAnalysis": {
        "total": 12,
        "critical": 3,
        "hash": "sha256:abc123..."
      },
      "testGeneration": {
        "total": 5,
        "confidence": 0.92
      },
      "execution": {
        "passed": 5,
        "failed": 0,
        "coverage": { "before": 0.72, "after": 0.87 }
      }
    }
  },
  "signature": {
    "algorithm": "sha256",
    "value": "...",
    "timestamp": "...",
    "signer": "system"
  },
  "downloadLink": ".reposense/runs/run-abc123/report.uat.zip"
}
```

---

## 6. Tool Integration Map

```
ChatBotService.executeAction()
  ├─ FETCH_GAP_DETAIL → AnalysisEngine.getGapDetail()
  ├─ FETCH_ALL_GAPS → AnalysisEngine.getAllGaps()
  ├─ SCORE_GAPS → AnalysisEngine.scoreGaps()
  ├─ GENERATE_TEST_CANDIDATES → TestGenerationService.generatePlans()
  ├─ APPLY_ARTIFACTS → ArtifactStore.apply() + workspace.edit()
  ├─ EXECUTE_TESTS → TestExecutor.runTests()
  ├─ STREAM_RESULTS → RunOrchestrator.onExecutionUpdate()
  ├─ GENERATE_REPORT → ReportGenerator.createUATReport()
  ├─ EXPORT_EVIDENCE → ArtifactStore.export()
  └─ SHOW_DIFF → GovernanceService.generateDiff()
```

---

## 7. Confirmation UI States

### State 1: Awaiting Confirmation

```
User sees:
┌──────────────────────────────────────────┐
│ I'll generate 3 Playwright test files    │
│ for these endpoints:                     │
│ • POST /api/users                        │
│ • GET /api/reports/:id                   │
│ • DELETE /admin/legacy                   │
│                                          │
│ Confidence: 92%                          │
│ Framework: Playwright                    │
│ Scenarios per endpoint: 3                │
│                                          │
│ [Show Full Diff] [Apply] [Cancel]       │
└──────────────────────────────────────────┘
```

### State 2: Diff Expanded

```
Side-by-side diff:

LEFT (BEFORE)                RIGHT (AFTER)
──────────────               ──────────────
(no file)                    tests/users.spec.ts
                             1  describe('POST /users', () => {
                             2    test('should create', () => {
                             3      // ...
                             ...
                             120 });
```

### State 3: Type Confirmation (Tier 3)

```
⚠️ This will DELETE code

File: src/routes.ts
Lines 45-67

Import confirmation text:
┌──────────────────────────────────────────┐
│ Type "DELETE /api/legacy" to confirm     │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ DELETE /api/legacy                   │ │
│ └──────────────────────────────────────┘ │
│                                          │
│                          [Delete] [Cancel]│
└──────────────────────────────────────────┘
```

---

## 8. Conversation State Persistence

```typescript
// Settings storage (VS Code workspace settings)
{
  "reposense.chatbot.defaultMode": "EXPLAIN",
  "reposense.chatbot.sessions": {
    "workspace-abc": {
      "current": "EXECUTE",
      "sessions": {
        "EXPLAIN": {
          "messages": [/* ... */],
          "context": {/* ... */}
        },
        "PLAN": {/* ... */},
        "GENERATE": {/* ... */},
        "EXECUTE": {/* ... */},
        "AUDIT": {/* ... */}
      }
    }
  }
}

// Runtime state (ChatBotService)
currentMode: ChatMode = ChatMode.EXPLAIN
conversations: Map<ChatMode, ChatMessage[]>
contexts: Map<ChatMode, ChatContext>
```

---

## 9. Audit Trail Entry Schema

```json
{
  "timestamp": "2026-01-21T15:30:45.123Z",
  "runId": "run-abc123",
  "sequenceNumber": 5,
  "action": "GENERATE_TESTS",
  "intent": {
    "type": "GENERATE",
    "subtype": "GENERATE_TESTS",
    "confidence": 0.95
  },
  "actor": {
    "type": "user",
    "id": "user@example.com"
  },
  "target": {
    "type": "gaps",
    "ids": ["gap-1", "gap-2", "gap-3"]
  },
  "scope": {
    "severity": "CRITICAL",
    "framework": "Playwright"
  },
  "safety": {
    "tier": 2,
    "confirmationRequired": true,
    "confirmed": true,
    "confirmationTime": "2026-01-21T15:30:50.000Z",
    "confirmationDuration": 4877
  },
  "execution": {
    "status": "SUCCESS",
    "duration": 12345,
    "startTime": "2026-01-21T15:30:50.000Z",
    "endTime": "2026-01-21T15:31:02.345Z"
  },
  "artifacts": {
    "created": [
      {
        "type": "TEST_FILE",
        "path": "tests/api/users.spec.ts",
        "size": 2048,
        "lines": 45
      }
    ],
    "modified": [],
    "deleted": []
  },
  "metadata": {
    "llmModel": "ollama:mistral",
    "confidenceScore": 0.92,
    "generatedTestCount": 3,
    "totalLinesAdded": 120
  }
}
```

---

## 10. Error Handling Matrix

| Error | Cause | Recovery |
|---|---|---|
| IntentClassificationFailed | NLP service error | Fall back to pattern match |
| ActionPlanningFailed | Incomplete context | Ask clarification |
| ExecutionFailed | Tool error | Log error, show to user |
| ConfirmationTimeout | User didn't respond | Cancel action, ask again |
| DiffGenerationFailed | File read error | Show error, offer skip |
| RollbackFailed | Git error | Manual undo guide |

---

## 11. Performance Targets

| Operation | Target | Actual (Estimate) |
|---|---|---|
| Intent classification | <200ms | 50ms (pattern), 500ms (NLP) |
| Action planning | <100ms | 80ms |
| Diff generation | <500ms | 300ms |
| Test generation (3 tests) | <3s | 2.5s (Ollama) |
| Test execution | 2m per suite | 1.5m (Playwright) |
| Report generation | <1s | 800ms |

---

## 12. Quick Implementation Checklist

**For each intent type (ANALYZE, DECIDE, GENERATE, EXECUTE, REPORT):**

```
□ Define patterns in IntentPatterns.ts
□ Implement planActions() method
□ Define action sequence
□ Implement tool integrations
□ Test with 5+ example inputs
□ Document in CHATBOT_INTENT_ROUTING.md
□ Add to demo scenarios

For each mode (EXPLAIN, PLAN, GENERATE, EXECUTE, AUDIT):

□ Define response template
□ Implement renderResponse() formatting
□ Test UI rendering
□ Verify mode switching works
□ Document in CHATBOT_CONVERSATION_MODES.md

For each channel (Right-click, TreeView, Palette, Chat, Auto):

□ Register invocation point
□ Wire to ChatBotService
□ Test invocation
□ Document in CHATBOT_INVOCATION_POINTS.md
```

---

## 13. Testing Strategy

### Unit Tests
```typescript
describe('ChatBotService', () => {
  test('classify ANALYZE intent', () => {...})
  test('extract severity parameter', () => {...})
  test('plan GENERATE actions', () => {...})
  test('execute FETCH_GAP_DETAIL action', () => {...})
  test('render EXPLAIN mode response', () => {...})
})
```

### Integration Tests
```typescript
describe('ChatBot Integration', () => {
  test('end-to-end: input → intent → plan → execute', () => {...})
  test('mode switching preserves conversation', () => {...})
  test('audit trail logs all actions', () => {...})
  test('diff confirmation flow', () => {...})
})
```

### E2E Tests
```typescript
describe('ChatBot E2E', () => {
  test('user can right-click gap and explain', () => {...})
  test('user can generate tests via chat UI', () => {...})
  test('user can run tests and see results', () => {...})
  test('user can export UAT report', () => {...})
})
```

---

## 14. Documentation Links

| Document | Purpose |
|---|---|
| [CHATBOT_PRODUCT_SPEC.md](CHATBOT_PRODUCT_SPEC.md) | Overview + vision |
| [CHATBOT_INTENT_ROUTING.md](CHATBOT_INTENT_ROUTING.md) | All intents + handlers |
| [CHATBOT_CONVERSATION_MODES.md](CHATBOT_CONVERSATION_MODES.md) | 5 modes + flows |
| [CHATBOT_INVOCATION_POINTS.md](CHATBOT_INVOCATION_POINTS.md) | 5 channels + examples |
| [CHATBOT_SAFETY_GOVERNANCE.md](CHATBOT_SAFETY_GOVERNANCE.md) | Confirmations + audit |
| [CHATBOT_IMPLEMENTATION_GUIDE.md](CHATBOT_IMPLEMENTATION_GUIDE.md) | Step-by-step phases |

---

**Version:** 1.0  
**Last Updated:** 2026-01-21  
**Status:** ✅ Ready for implementation
