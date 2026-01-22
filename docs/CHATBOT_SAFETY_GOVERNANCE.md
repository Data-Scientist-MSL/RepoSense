# ChatBot Safety & Governance Rules

Enterprise-grade safety constraints, confirmation workflows, and audit trails.

---

## Core Safety Principles

1. **No Auto-Apply** — Never modify files without explicit user confirmation
2. **Always Show Diff** — Every proposed change must be previewed
3. **Ask Before Destructive** — Deletions, overwrites require double-confirmation
4. **Log Everything** — Audit trail for compliance/debugging
5. **Reversible by Default** — Changes can be undone or rolled back

---

## Action Classification

All ChatBot actions fall into 3 safety tiers:

### Tier 1: Safe (Read-Only) ✅
- Scanning/analyzing code
- Explaining gaps
- Showing reports
- Exporting (no modifications)
- **Confirmation:** ❌ NOT required

**Examples:**
```typescript
EXPLAIN_GAPS
EXPLAIN_GAP_DETAIL
UNDERSTAND_IMPACT
EVALUATE_RISK
SHOW_EXECUTION_EVIDENCE
EXPORT_EVIDENCE
GENERATE_UAT_REPORT
```

### Tier 2: Medium (File Modifications) ⚠️
- Generating test files
- Creating documentation
- Writing analysis results
- **Confirmation:** ✅ REQUIRED (show diff first)

**Examples:**
```typescript
GENERATE_TESTS
GENERATE_TESTS_SPECIFIC
PROPOSE_REMEDIATION
APPLY_ARTIFACTS
```

### Tier 3: High (Destructive) 🔴
- Deleting test files
- Deleting endpoints
- Overwriting existing code
- **Confirmation:** ✅ REQUIRED (double-confirmation)

**Examples:**
```typescript
REMOVE_ENDPOINT
DELETE_TEST
OVERWRITE_GENERATED_FILES
```

---

## Confirmation Workflow

### Tier 1 (Safe) — No Confirmation Needed
```
User action (e.g., "Explain this gap")
  ↓
ChatBot processes
  ↓
ChatBot responds immediately
  ✅ Done
```

### Tier 2 (Medium) — Diff Confirmation
```
User action (e.g., "Generate tests")
  ↓
ChatBot generates artifacts
  ↓
ChatBot: [Shows diff automatically]
  
  Generated: tests/api/users.spec.ts
  
  - This file will be CREATED
  - 120 lines added
  
  [Show Full Diff] [Apply] [Cancel]
  ↓
User confirms with [Apply]
  ↓
Files written to workspace
  ✅ Done
```

**Diff View Details:**
```
Side-by-side comparison
  ├─ Left: existing file (or "[NEW]")
  ├─ Right: generated file
  ├─ Line numbers + highlights
  ├─ Context: 3 lines before/after changes
  └─ Statistics:
     • Size change: +120 lines
     • Framework: Playwright
     • Confidence: 92%
```

### Tier 3 (Destructive) — Double Confirmation
```
User action (e.g., "Delete endpoint")
  ↓
ChatBot: "⚠️ This action will DELETE code"
  
  File: src/api/routes.ts
  Lines 45-67: function deleteOldEndpoint() { ... }
  
  This DELETE is irreversible.
  
  [Show Code] [Cancel]
  ↓
User clicks [Show Code] (not [Cancel])
  ↓
ChatBot shows 20-line context
  ↓
ChatBot: "Are you SURE? Type 'DELETE' to confirm"
  
  ┌─────────────────────────────────┐
  │ Type DELETE to proceed           │
  └─────────────────────────────────┘
  ↓
User types "DELETE"
  ↓
Code deleted + logged to audit trail
  ✅ Done (but logged for recovery)
```

---

## Audit Trail

Every action is logged to: `.reposense/runs/<runId>/audit.log`

**Log Format:**
```json
{
  "timestamp": "2026-01-21T15:30:45.123Z",
  "action": "GENERATE_TESTS",
  "actor": "user@example.com",
  "target": "gapId:abc123",
  "scope": "CRITICAL gaps",
  "result": "SUCCESS",
  "artifactsCreated": ["tests/api/users.spec.ts", "tests/api/reports.spec.ts"],
  "fileModifications": {
    "created": 2,
    "modified": 0,
    "deleted": 0,
    "totalLines": 245
  },
  "confirmation": {
    "required": true,
    "confirmed": true,
    "confirmationTime": "2026-01-21T15:30:50.000Z",
    "confirmationDuration": "4.877s"
  },
  "metadata": {
    "llmModel": "ollama:mistral",
    "confidence": 0.92,
    "framework": "Playwright",
    "scenarios": 3
  }
}
```

**Audit Trail Fields:**
- `timestamp` — ISO 8601 UTC
- `action` — Intent type (GENERATE_TESTS, RUN_TESTS, etc.)
- `actor` — User email/ID or system
- `target` — What was acted upon (gapId, testSuiteId, etc.)
- `scope` — Filters applied (CRITICAL only, specific framework, etc.)
- `result` — SUCCESS, FAILED, CANCELLED, ROLLED_BACK
- `artifactsCreated` — Files created/modified
- `fileModifications` — Statistics
- `confirmation` — User approved? How long did they take?
- `metadata` — LLM model, confidence, framework, etc.

---

## Per-Action Governance Rules

### GENERATE_TESTS

**Safety Tier:** ⚠️ Medium

**Confirmation Required:** ✅ Yes

**Confirmation Workflow:**
1. ChatBot proposes test generation
2. Show summary: "Generate 3 Playwright test files"
3. Show framework + scenarios
4. Show confidence score (0-100%)
5. Show diff
6. Buttons: [Apply] [Modify] [Cancel]

**Irreversibility:** ✅ Can be undone
- Generated files go to new folder
- User can reject before applying
- After apply, files can be deleted/modified

**Audit Trail:**
```json
{
  "action": "GENERATE_TESTS",
  "scope": "CRITICAL gaps",
  "framework": "Playwright",
  "testCount": 3,
  "confidence": 0.92,
  "artifactsCreated": [...],
  "confirmation": { "required": true, "confirmed": true, "duration": "5s" }
}
```

---

### RUN_TESTS

**Safety Tier:** ⚠️ Medium

**Confirmation Required:** ✅ Yes (but often skipped if tests pass)

**Confirmation Workflow:**
1. ChatBot: "Ready to run 15 tests?"
2. Show scope: [Generated] [Suite] [All]
3. Show framework: Playwright, Jest, Cypress, etc.
4. Show timeout: 5m
5. Buttons: [Run] [Configure] [Cancel]

**Irreversibility:** ⚠️ Partial
- Test runs create artifacts (screenshots, logs)
- Results are immutable
- But test files can be modified afterward

**Audit Trail:**
```json
{
  "action": "RUN_TESTS",
  "scope": "Generated",
  "framework": "Playwright",
  "testCount": 15,
  "result": "32/35 PASSED",
  "duration": "2m 15s",
  "artifactsCreated": ["screenshots/", "logs/"],
  "confirmation": { "required": true, "confirmed": true, "duration": "3s" }
}
```

---

### APPLY_ARTIFACTS

**Safety Tier:** ⚠️ Medium

**Confirmation Required:** ✅ Yes (always)

**Confirmation Workflow:**
1. Show which files will be created/modified
2. Show diff for each file
3. Show total size change
4. Buttons: [Apply] [Cancel] [Show Diff]

**Irreversibility:** ✅ Can be undone
- User can Ctrl+Z in VS Code
- Or delete generated files

**Audit Trail:**
```json
{
  "action": "APPLY_ARTIFACTS",
  "artifactType": "GENERATED_TESTS",
  "fileCount": 3,
  "linesAdded": 245,
  "confirmation": { "required": true, "confirmed": true, "diffViewed": true }
}
```

**Special Case: Overwriting Existing File**
- If file already exists, show diff with 3-way merge
- Highlight potential conflicts
- Buttons: [Apply] [Merge] [Skip] [Cancel]

---

### DELETE_ENDPOINT

**Safety Tier:** 🔴 High (Destructive)

**Confirmation Required:** ✅ Yes (double-confirmation)

**Confirmation Workflow:**
1. ChatBot: "⚠️ This will DELETE code"
2. Show code snippet (20 lines of context)
3. Show: "This endpoint is called in X places"
4. Show impact analysis
5. First button: [Show Impact] [Cancel]
6. If user clicks [Show Impact]:
   - Show 5-10 files that reference this endpoint
   - Button: [Still Delete] [Cancel]
7. If user clicks [Still Delete]:
   - Ask user to TYPE the endpoint name as confirmation
   - E.g., "Type 'DELETE /api/users/:id' to confirm"

**Irreversibility:** ⚠️ Partially reversible
- User can undo in VS Code (Ctrl+Z)
- But audit trail shows deletion happened
- IT team can restore from git

**Audit Trail:**
```json
{
  "action": "DELETE_ENDPOINT",
  "endpoint": "DELETE /api/users/:id",
  "fileModified": "src/api/routes.ts",
  "linesDeleted": 23,
  "impactedFiles": 7,
  "confirmation": { 
    "required": true, 
    "confirmed": true, 
    "doubleConfirmed": true,
    "confirmationMethod": "TYPE_ENDPOINT_NAME",
    "duration": "12s"
  }
}
```

---

### SHOW_DIFF

**Safety Tier:** ✅ Safe (read-only)

**Confirmation Required:** ❌ No

**Behavior:**
- ChatBot always shows diff automatically
- For Tier 1 actions, no extra confirmation needed
- For Tier 2+ actions, diff shown before confirmation
- User can review, then [Apply] or [Cancel]

---

## Rollback Procedures

### Auto-Rollback
```
User clicks [Undo] after applying artifacts
  ↓
VS Code editor undo history triggers
  ↓
Files reverted to previous state
  ↓
ChatBot logs: action ROLLED_BACK
  ↓
Audit trail updated
```

### Manual Rollback
```
User in AUDIT mode: "Rollback the last run"
  ↓
ChatBot: "I can rollback last test generation"
  ├─ Files created: tests/api/users.spec.ts, ...
  ├─ Files modified: package.json (dependencies)
  ├─ Files deleted: none
  ↓
User confirms rollback
  ↓
ChatBot deletes generated files
  ChatBot restores package.json (from git)
  ↓
Audit trail logged: ROLLBACK event
```

**Rollback Limitations:**
- Can only rollback within current run
- Cannot rollback user-modified code
- Historical runs stored in `.reposense/runs/` (immutable)

---

## Batch Operations

**Batch Confirmation for Tier 2 Actions:**

```
User: "Generate tests for all CRITICAL gaps" (5 gaps)
  ↓
ChatBot: "I'll generate 5 test suites"
  
  Estimated artifacts:
  • 5 test files
  • 600 lines total
  • Duration: ~2 min
  
  Framework: Playwright (detected)
  Confidence: 89-94%
  
  [Generate All] [Choose Per-Gap] [Cancel]
  ↓
If user clicks [Generate All]:
  1. Show summary: "5 test files to create"
  2. Show diff (aggregated)
  3. Button: [Apply All] [Review Each] [Cancel]
  ↓
If user clicks [Review Each]:
  1. Show first test diff
  2. Button: [Apply This] [Skip] [Next >]
  3. After each: "4 remaining..."
```

**Batch Safety Rules:**
- Max batch size: 10 items (then prompt for confirmation)
- Show total size change
- Always allow "Review Each" option
- Generate progress bar for long operations

---

## Permissions & Access Control

**Current Implementation:** Basic (no multi-user)

**Future Enhancement (if needed):**
```
workspace.settings:
  "reposense.chatbot.permissions": {
    "canGenerateTests": true,
    "canRunTests": true,
    "canDeleteCode": false,
    "canExportEvidence": true,
    "confirmationRequired": "always|medium|never"
  }
```

---

## Configuration

**User Can Customize:**
```json
{
  "reposense.chatbot.confirmationMode": "strict|balanced|relaxed",
  "reposense.chatbot.showDiffByDefault": true,
  "reposense.chatbot.autoApplyIfConfident": false,
  "reposense.chatbot.auditTrailLocation": ".reposense/runs/",
  "reposense.chatbot.rollbackEnabled": true,
  "reposense.chatbot.batchSizeLimit": 10
}
```

**Preset Profiles:**
```
STRICT:
  - All actions require confirmation
  - Always show diff
  - Never auto-apply
  - Audit everything
  
BALANCED (default):
  - Tier 1: No confirmation
  - Tier 2: Diff + confirmation
  - Tier 3: Double confirmation
  
RELAXED:
  - Tier 1-2: No confirmation (show diff)
  - Tier 3: Single confirmation
  - (Not recommended for production)
```

---

## Implementation Checklist

```
Safety Framework:
□ Define ActionSafety enum (SAFE, MEDIUM, HIGH)
□ Create SafetyRule interface
□ Implement SafetyManager service
□ Wire to ChatBotService

Confirmation UX:
□ Design diff modal component
□ Implement double-confirmation flow
□ Add timeout for confirmations (30s)
□ Handle user cancellations

Audit Trail:
□ Create audit logger
□ Wire to all actions
□ Test audit completeness
□ Implement audit log viewer

Rollback:
□ Wire to VS Code undo system
□ Implement manual rollback command
□ Store file snapshots before modifications
□ Test rollback completeness

Testing:
□ Unit test confirmation flows
□ Integration test audit logging
□ E2E test rollback procedures
□ Test batch operations
```

---

## Next: Implementation Phase

See **CHATBOT_IMPLEMENTATION_GUIDE.md** for:
- ChatBotService intent classification
- ChatBotPanel WebView design
- Intent → Action → Tool mapping
- Testing strategies
