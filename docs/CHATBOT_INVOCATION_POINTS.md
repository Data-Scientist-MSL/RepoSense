# ChatBot Invocation Points

5 distinct ways users interact with the ChatBot, matching different workflows.

---

## Overview

**Invocation Channels:**
1. **Contextual** — Right-click on code, gap, endpoint, file
2. **TreeView-Driven** — Buttons on gap/test/result nodes
3. **Command Palette** — Typed commands
4. **Chat UI** — Message input in WebView
5. **Automatic** — Triggered by system events

---

## 1. CONTEXTUAL (Right-Click Menu)

**Trigger:** Right-click on code → "Ask RepoSense"

**Available On:**
- Gap in editor (marked with diagnostic)
- Endpoint function (hover shows endpoint, right-click)
- Test file (right-click test case)
- Endpoint in code (method call)

**UI:**
```
[Right-click on gap diagnostic]
┌─────────────────────────────┐
│ Copy                        │ (VSCode default)
├─────────────────────────────┤
│ Ask RepoSense →             │
│  ├─ Explain This Gap        │ (EXPLAIN_GAP_DETAIL)
│  ├─ Generate Test           │ (GENERATE_TESTS_SPECIFIC)
│  ├─ Suggest Fix             │ (PROPOSE_REMEDIATION)
│  └─ Show Impact             │ (UNDERSTAND_IMPACT)
├─────────────────────────────┤
│ Code Actions ▼              │ (existing)
```

**Flow:**
```
User: Right-click on gap diagnostic
  ↓
Menu appears
  ↓
User selects: "Explain This Gap"
  ↓
ChatBotPanel opens (if closed)
  ↓
ChatBotService receives: ChatContextualAction
  {
    type: "CONTEXTUAL",
    target: gapId,
    action: "EXPLAIN_GAP_DETAIL",
    location: { file, line, column }
  }
  ↓
ChatBot responds in EXPLAIN mode:
  "This endpoint is marked as unused..."
```

**Implementation:**
- File: `src/providers/RepoSenseCodeActionProvider.ts` (EXTEND)
- Add right-click provider for gaps
- Use `vscode.CodeAction` with "Ask RepoSense" submenu
- On selection, call: `ChatBotService.handleContextualAction()`

---

## 2. TREEVIEW-DRIVEN (Buttons on Nodes)

**Trigger:** Click action button on gap/test/result node in TreeView

**Available Nodes:**

### A. Gap Node (in Analysis TreeView)
```
Gap [GET /api/users/:id] 🔴 CRITICAL
├─ Severity: CRITICAL
├─ Priority: 92/100
├─ Last seen: 30 days ago
└─ [💬] [🧪] [🛠] [▶]
   └─ Explain | Generate | Fix | Execute
```

**Buttons:**
- **[💬] Explain** → Opens ChatBot with `EXPLAIN_GAP_DETAIL` intent
- **[🧪] Generate** → Opens ChatBot with `GENERATE_TESTS_SPECIFIC` intent
- **[🛠] Fix** → Opens ChatBot with `PROPOSE_REMEDIATION` intent
- **[▶] Execute** → Opens ChatBot with `RUN_VALIDATION` intent

### B. Test Node (in Test Coverage TreeView)
```
Test Suite [users.spec.ts]
├─ Test [should create user] ✅
│  └─ [📋] [▶] [🔄]
│     └─ View | Run | Debug
├─ Test [should fail on duplicate] ✅
│  └─ [📋] [▶] [🔄]
└─ Test [should timeout gracefully] ❌
   └─ [📋] [▶] [🔄]
```

**Buttons:**
- **[📋] View** → Show test code + coverage
- **[▶] Run** → Execute this test only
- **[🔄] Debug** → Rerun with debug logging

### C. Execution Result Node (in Run History TreeView)
```
Run [2026-01-21 15:00]
├─ Status: ✅ PASSED (32/35)
├─ Duration: 2m 15s
└─ [📊] [📋] [📤]
   └─ Report | Evidence | Export
```

**Buttons:**
- **[📊] Report** → Show UAT report
- **[📋] Evidence** → Show execution evidence (logs, screenshots)
- **[📤] Export** → Export as archive or PDF

**Flow:**
```
User clicks [🧪 Generate] on gap node
  ↓
TreeView calls: ChatBotService.onGapActionClicked({ gapId, action: 'GENERATE' })
  ↓
ChatBotService:
  1. Fetch gap details
  2. Set mode = GENERATE
  3. Create ChatIntent: GENERATE_TESTS_SPECIFIC
  4. Show ChatBotPanel
  5. Process intent (show diff, ask confirmation)
  ↓
ChatBot response:
  "I'll generate tests for [GET /api/users/:id]"
  [Shows frameworks, scenarios, diff]
  [Apply] [Cancel]
```

**Implementation:**
- File: `src/providers/GapAnalysisProvider.ts` (EXTEND - already exists)
- Add action command per button
- Command format: `reposense.gap.action.{action}`
- On click, call: `ChatBotService.handleTreeViewAction()`
- File: `src/providers/RepoSenseCodeLensProvider.ts` (EXTEND)
- Add inline action buttons to test nodes

---

## 3. COMMAND PALETTE

**Trigger:** Ctrl+Shift+P → "RepoSense: ..."

**Available Commands:**

### Analysis Commands
```
• RepoSense: Analyze Now
• RepoSense: Explain Current Gaps
• RepoSense: Identify Priority Gaps
• RepoSense: Evaluate Risk Level
```

### Planning Commands
```
• RepoSense: Create Remediation Plan
• RepoSense: Assess Gap Criticality
• RepoSense: Show Impact Analysis
```

### Generation Commands
```
• RepoSense: Generate Tests (All)
• RepoSense: Generate Tests (CRITICAL only)
• RepoSense: Generate Tests (Playwright)
• RepoSense: Generate Tests (Cypress)
• RepoSense: Generate Tests (Jest)
• RepoSense: Suggest Remediation
```

### Execution Commands
```
• RepoSense: Run All Tests
• RepoSense: Run Generated Tests
• RepoSense: Run Validation
• RepoSense: Rerun Failed Tests (Debug)
```

### Reporting Commands
```
• RepoSense: Generate UAT Report
• RepoSense: Show Coverage Delta
• RepoSense: Create Executive Summary
• RepoSense: Export Evidence
```

### Mode Commands
```
• RepoSense: Enter Explain Mode
• RepoSense: Enter Plan Mode
• RepoSense: Enter Generate Mode
• RepoSense: Enter Execute Mode
• RepoSense: Enter Audit Mode
```

### ChatBot Commands
```
• RepoSense: Open ChatBot
• RepoSense: Clear ChatBot History
```

**Flow:**
```
User: Ctrl+Shift+P
  ↓
Types: "RepoSense: Gen"
  ↓
Filtered list shows:
  • RepoSense: Generate Tests (All)
  • RepoSense: Generate Tests (CRITICAL only)
  • RepoSense: Generate Tests (Playwright)
  ↓
User selects: "Generate Tests (All)"
  ↓
Command handler:
  1. Show ChatBotPanel
  2. Set mode = GENERATE
  3. Call ChatBotService.processCommand('GENERATE_TESTS', { severity: 'ALL' })
  4. ChatBot renders response with options
```

**Implementation:**
- File: `src/extension.ts` (EXTEND)
- Register 40+ commands via `vscode.commands.registerCommand()`
- Each command calls: `ChatBotService.handleCommandPaletteCommand()`
- Commands persist to recently-used history

---

## 4. CHAT UI (WebView Message Input)

**Trigger:** Type in ChatBot WebView text input

**WebView Layout:**
```
┌─────────────────────────────────────────────┐
│ RepoSense ChatBot                           │
├─────────────────────────────────────────────┤
│ Mode: [EXPLAIN ▼]  📊 History  ⚙ Settings  │
├─────────────────────────────────────────────┤
│                                             │
│ ChatBot: What would you like to do?        │
│ [💬 Explain] [📊 Analyze] [🧪 Generate]   │
│ [▶ Execute] [📋 Report] [🆘 Help]         │
│                                             │
├─────────────────────────────────────────────┤
│ Context: 12 gaps found                     │
│ Gap: GET /api/users/:id (CRITICAL)         │
├─────────────────────────────────────────────┤
│ Type message or choose action...            │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Why is this endpoint unused?            │ │ ← User types
│ └─────────────────────────────────────────┘ │
│                               [Send] [+]    │
│                                             │
└─────────────────────────────────────────────┘
```

**Flow:**
```
User types: "Why is this endpoint unused?"
  ↓
ChatBotService.processUserInput(input, context)
  ↓
analyzeIntent(): IntentAnalysis
  {
    type: EXPLAIN,
    subtype: EXPLAIN_GAP_DETAIL,
    target: gapId,
    confidence: 0.95
  }
  ↓
ChatBotService.planActions(intent, context) → [Action]
  [{ type: EXPLAIN_GAP_DETAIL, params: { gapId, verbose: true } }]
  ↓
Render ChatMessage:
  {
    role: "assistant",
    type: "text",
    content: "This endpoint has been unused for 30 days..."
  }
  ↓
User sees: Assistant response + evidence + buttons
```

**User Input Patterns:**

| Pattern | Intent | Example |
|---|---|---|
| "Why is ..." | EXPLAIN_GAP_DETAIL | "Why is this endpoint unused?" |
| "What gaps ..." | EXPLAIN_GAPS | "What gaps exist?" |
| "Generate ..." | GENERATE_TESTS | "Generate tests for critical gaps" |
| "Run ..." | RUN_TESTS | "Run all tests" |
| "Show ..." | SHOW_* | "Show me the diff" |
| "Create ..." | RECOMMEND_ORDER | "Create a plan" |
| "Fix ..." | PROPOSE_REMEDIATION | "Fix this endpoint" |

**Implementation:**
- File: `src/providers/ChatBotPanel.ts` (NEW WebView provider)
- Render HTML5 chat interface
- Listen for `webviewMessage` events
- Integrate with ChatBotService.processUserInput()
- Show message history + actions

---

## 5. AUTOMATIC (System-Triggered)

**Trigger:** System events, no user interaction

### A. After Gap Analysis
```
AnalysisEngine detects gaps
  ↓
RunOrchestrator emits: 'analysis:complete'
  ↓
ChatBotService.onAnalysisComplete(analysisResult)
  ↓
Automatic behavior:
  ✅ Show summary in ChatBot
  ✅ Update gap count in status bar
  ❌ NOT auto-generate tests (ask first)
  ❌ NOT auto-run anything
```

### B. After Test Generation
```
TestGenerationService generates tests
  ↓
RunOrchestrator emits: 'generation:complete'
  ↓
ChatBotService.onGenerationComplete(generationResult)
  ↓
Automatic behavior:
  ✅ Show diff automatically
  ✅ Offer [Apply] [Cancel] buttons
  ⚠️ Require user confirmation to apply
```

### C. After Test Execution
```
TestExecutor completes test run
  ↓
RunOrchestrator emits: 'execution:complete'
  ↓
ChatBotService.onExecutionComplete(executionResult)
  ↓
Automatic behavior:
  ✅ Show results summary
  ✅ Link to execution evidence
  ✅ Highlight failures
  ⚠️ Suggest next steps (debug, export)
```

### D. After Workspace Modification
```
User modifies test file externally
  ↓
VSCode FileSystemWatcher detects change
  ↓
ChatBotService.onWorkspaceFileChanged(file)
  ↓
Automatic behavior:
  ⚠️ Ask: "Test file modified. Re-analyze?"
  ⚠️ Offer [Re-analyze], [Ignore], [Configure]
```

---

## Invocation Priority Matrix

**When user invokes the same action via different channels:**

| Action | Priority 1 | Priority 2 | Priority 3 | Priority 4 |
|---|---|---|---|---|
| Generate Tests | TreeView [🧪] | Right-click | Cmd Palette | Chat input |
| Explain Gap | Chat input (free-form) | Right-click | TreeView [💬] | Cmd Palette |
| Run Tests | Chat input | Cmd Palette | TreeView [▶] | (N/A - no right-click) |
| Export Evidence | TreeView [📤] | Cmd Palette | Chat input | (N/A) |

**Result:** TreeView/contextual actions are fastest; Chat input is most flexible

---

## Safety Constraints by Channel

| Channel | Allows Auto-Apply | Requires Confirmation | Allows Batch |
|---|---|---|---|
| Right-click | ❌ No | ✅ Yes | ❌ No |
| TreeView | ❌ No | ✅ Yes | ⚠️ Ask first |
| Cmd Palette | ❌ No | ✅ Yes | ⚠️ Ask first |
| Chat UI | ❌ No | ✅ Yes | ✅ Yes |
| Automatic | ❌ No | ✅ Yes | ❌ No |

---

## Implementation Checklist

```
Contextual (Right-Click):
□ Extend RepoSenseCodeActionProvider
□ Register gap context menu
□ Register endpoint context menu
□ Register test context menu

TreeView-Driven:
□ Extend GapAnalysisProvider (add action buttons)
□ Extend RepoSenseCodeLensProvider (add test buttons)
□ Create new RunHistoryProvider (execution results)
□ Wire buttons to ChatBotService

Command Palette:
□ Register 40+ commands in extension.ts
□ Group by category (Analysis, Planning, etc.)
□ Add quick shortcuts (e.g., Cmd+Alt+G for "Generate Tests")
□ Persist command history

Chat UI:
□ Create ChatBotPanel.ts (new WebView provider)
□ Design HTML/CSS layout
□ Implement message rendering
□ Implement intent recognition (NLP/regex)
□ Wire to ChatBotService

Automatic:
□ Wire RunOrchestrator events → ChatBotService
□ Implement auto-notification logic
□ Show non-intrusive alerts (status bar, notification)
```

---

## User Experience Flow

**Complete end-to-end example:**

```
1. User opens project, extension activates
   ↓
2. Automatic analysis runs
   → ChatBot shows: "Found 12 gaps, 3 CRITICAL"
   ↓
3. User right-clicks on gap diagnostic
   → Context menu: "Explain This Gap"
   ↓
4. ChatBotPanel opens
   → ChatBot explains: "Missing endpoint..."
   ↓
5. User clicks [TreeView: 🧪 Generate] on same gap
   → ChatBot switches to GENERATE mode
   → Shows test preview + diff
   ↓
6. User confirms [Apply]
   → Tests written to workspace
   ↓
7. User types in chat: "Run the tests"
   → ChatBot switches to EXECUTE mode
   → Runs tests with real-time progress
   ↓
8. Tests pass
   → ChatBot shows: "✅ All tests pass"
   ↓
9. User clicks [TreeView: 📤 Export] on run result
   → ChatBot switches to AUDIT mode
   → Generates UAT report with evidence
   ↓
10. User downloads report
    → Complete evidence chain saved
```

This flow showcases all 5 invocation channels working together seamlessly.
