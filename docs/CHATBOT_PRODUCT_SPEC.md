# RepoSense ChatBot: Complete Product Specification

**Version:** 1.0  
**Status:** Ready for Implementation  
**Author:** Product Architecture Team  
**Date:** 2026-01-21

---

## Executive Summary

RepoSense ChatBot is an **Intent-Driven Orchestration Assistant** embedded in VS Code—not a generic copilot, but an enterprise-grade tool that understands repository state and executes complex testing workflows with explicit governance.

**Core Mission:** Transform ad-hoc testing activities into governed, audited, evidence-based processes through conversational orchestration.

**Key Differentiators:**
- ✅ Intent-driven (not free-form chat)
- ✅ Multi-modal (5 conversation modes)
- ✅ Multi-channel (right-click, TreeView, palette, chat, automatic)
- ✅ Safety-first (confirmations, diffs, audit trails)
- ✅ Evidence-rich (screenshots, logs, reports)
- ✅ Fully integrated (uses RunOrchestrator state machine)

---

## 1. Product Vision

### What It Is NOT
- ❌ A general-purpose chatbot ("Ask anything")
- ❌ A code copilot for writing code
- ❌ A documentation assistant
- ❌ A free-form conversation tool

### What It IS
- ✅ A test orchestration assistant for a repo owner
- ✅ An API governance expert embedded in VS Code
- ✅ A workflow executor (plan → generate → run → report)
- ✅ An evidence collector for compliance/audit

### Mental Model

```
User Intent
  ↓
ChatBot classifies intent (what does the user want?)
  ↓
ChatBot plans actions (what steps to take?)
  ↓
ChatBot shows diffs/previews (what will happen?)
  ↓
User approves
  ↓
ChatBot executes (coordinates services, captures evidence)
  ↓
ChatBot provides evidence (links to results, artifacts)
  ↓
User exports for compliance
```

---

## 2. Canonical Intent Categories

**All user inputs map to 5 intents:**

### A. ANALYZE Intent (Read-Only Questions)
**User wants to understand current state**

```
User: "Why is this endpoint unused?"
ChatBot: Explains gap, shows impact, suggests next steps
Services: AnalysisEngine (read-only)
Result: Explanation + evidence
```

**Subtypes:**
- EXPLAIN_GAPS — "What are all the gaps?"
- EXPLAIN_GAP_DETAIL — "Why is this gap?"
- UNDERSTAND_IMPACT — "What will break?"
- IDENTIFY_PRIORITY — "Which gaps are critical?"
- ASSESS_CRITICALITY — "Should we fix this?"
- EVALUATE_RISK — "What's the overall risk?"

**Safety Tier:** ✅ SAFE (no confirmation needed)

### B. DECIDE Intent (Planning & Strategy)
**User wants a roadmap**

```
User: "Help me create a remediation plan"
ChatBot: Suggests 3-step approach with effort estimates
Services: AnalysisEngine, PerformanceMonitor
Result: Structured plan with options
```

**Subtypes:**
- RECOMMEND_ORDER — "What should we do first?"
- (All planning questions)

**Safety Tier:** ✅ SAFE (read-only analysis)

### C. GENERATE Intent (Creating Artifacts)
**User wants tests/code generated**

```
User: "Generate tests for critical gaps"
ChatBot: Shows diff, asks confirmation, writes files
Services: TestGenerationService, ArtifactStore
Result: Generated files (pending apply)
```

**Subtypes:**
- GENERATE_TESTS — "Create tests for endpoints"
- GENERATE_TESTS_SPECIFIC — "Use Playwright only"
- PROPOSE_REMEDIATION — "Suggest a fix"

**Safety Tier:** ⚠️ MEDIUM (requires diff + confirmation)

### D. EXECUTE Intent (Running Tests)
**User wants to validate changes**

```
User: "Run the tests now"
ChatBot: Shows real-time progress, streams results
Services: TestExecutor, RunOrchestrator
Result: Test results + execution evidence
```

**Subtypes:**
- RUN_TESTS — "Execute all tests"
- RUN_VALIDATION — "Validate these changes"
- RERUN_WITH_DEBUG — "Why did this fail?"

**Safety Tier:** ⚠️ MEDIUM (requires confirmation)

### E. REPORT Intent (Documentation & Evidence)
**User wants compliance documentation**

```
User: "Generate a UAT report"
ChatBot: Creates signed, immutable report with evidence
Services: ReportGenerator, ArtifactStore
Result: PDF/MD report + evidence archive
```

**Subtypes:**
- GENERATE_UAT_REPORT — "Create formal report"
- EXPORT_EVIDENCE — "Package results"
- CREATE_EXECUTIVE_SUMMARY — "C-level summary"
- SHOW_COVERAGE_DELTA — "Before/after comparison"

**Safety Tier:** ✅ SAFE (read-only export)

---

## 3. Conversation Modes

**Mode = conversation context + response style + available actions**

| Mode | Purpose | Tone | Available Intents | Evidence Emphasis |
|---|---|---|---|---|
| **EXPLAIN** | Answer "why?" | Educational | ANALYZE | Show code + metrics |
| **PLAN** | Create strategy | Strategic | DECIDE | Show effort estimates |
| **GENERATE** | Create artifacts | Action-oriented | GENERATE | Show diffs |
| **EXECUTE** | Run & validate | Real-time | EXECUTE | Show logs + screenshots |
| **AUDIT** | Export evidence | Formal/legal | REPORT | Show signatures + hashes |

**Mode Switching:**
- User can switch anytime
- Conversation state persisted per mode
- Response format changes automatically

---

## 4. Invocation Channels

**5 ways users trigger the ChatBot:**

### 1. Contextual (Right-Click)
```
Right-click gap diagnostic
  → [Ask RepoSense]
    ├─ Explain This Gap
    ├─ Generate Test
    ├─ Suggest Fix
    └─ Show Impact
```

### 2. TreeView-Driven (Buttons)
```
Gap TreeView node
  → [💬] [🧪] [🛠] [▶]
    └─ Action buttons on each node
```

### 3. Command Palette
```
Ctrl+Shift+P
  → "RepoSense: Generate Tests"
  → "RepoSense: Explain Gaps"
  → "RepoSense: Run Validation"
```

### 4. Chat UI (Free-Form)
```
ChatBot WebView:
  Type: "Why is this endpoint unused?"
  → ChatBot classifies intent + responds
```

### 5. Automatic (System Events)
```
After gap analysis completes
  → ChatBot shows: "Found 12 gaps, 3 CRITICAL"
  → Offers [Generate Tests] button
```

---

## 5. Safety & Governance

### Action Classification

**Tier 1: Safe (Read-Only)** ✅
- No confirmation needed
- Examples: EXPLAIN, DECIDE, EXPORT
- Examples: "Explain gaps", "Show coverage"

**Tier 2: Medium (Modifications)** ⚠️
- Diff shown automatically
- User confirmation required
- Rollback possible
- Examples: GENERATE, APPLY_TESTS

**Tier 3: High (Destructive)** 🔴
- Double confirmation required
- User must type confirmation text
- Immutable audit trail
- Examples: DELETE_ENDPOINT

### Confirmation Flow

**Tier 2 Example: Generate Tests**
```
1. ChatBot generates candidates
2. Shows: "Create 3 test files" + [Show Diff]
3. User clicks [Show Diff]
4. ChatBot shows side-by-side comparison
5. User clicks [Apply]
6. Files written + logged
```

**Tier 3 Example: Delete Endpoint**
```
1. ChatBot: "⚠️ Delete code"
2. Shows impact: "Referenced in 7 files"
3. User clicks [Show Impact]
4. ChatBot shows affected code
5. User clicks [Still Delete]
6. ChatBot: "Type DELETE to confirm"
7. User types "DELETE"
8. Code deleted + audit logged
```

### Audit Trail

Every action logged to `.reposense/runs/<runId>/audit.log`:

```json
{
  "timestamp": "2026-01-21T15:30:45Z",
  "action": "GENERATE_TESTS",
  "actor": "user@example.com",
  "target": "gapId:abc123",
  "result": "SUCCESS",
  "artifactsCreated": 3,
  "confirmation": {
    "required": true,
    "confirmed": true,
    "duration": "4.877s"
  }
}
```

---

## 6. Guaranteed UX Patterns

**Pattern 1: Always Show Diff First**
```
BEFORE: Generic "Would you like to generate tests?"
AFTER: [Diff] → [Apply] → Files created

Result: User can see exact changes before applying
```

**Pattern 2: Never Auto-Apply**
```
BEFORE: "I'll fix this for you" → code modified
AFTER: "I'll suggest this fix" → [Show Diff] → [Apply]

Result: Full user control, no surprises
```

**Pattern 3: Evidence Everything**
```
BEFORE: "Tests ran successfully"
AFTER: "✅ 15/15 passed" + [View Logs] + [Screenshots] + [Video]

Result: Compliance-grade evidence chain
```

**Pattern 4: Conversational Continuity**
```
BEFORE: Separate commands (analyze, generate, run)
AFTER: One conversation spanning all steps

Result: Coherent workflow, clear evidence
```

---

## 7. Architecture Integration

### Where ChatBot Fits

```
VS Code Extension Host
  ├─ ChatBotPanel (WebView UI)
  ├─ ChatBotService (Intent routing + action planning)
  │   ├─ IntentClassifier (Pattern + NLP)
  │   ├─ ActionPlanner (Intent → Actions)
  │   └─ ActionExecutor (Actions → Tools)
  └─ RunOrchestrator (Executes actions)
      ├─ AnalysisEngine
      ├─ TestGenerationService
      ├─ TestExecutor
      └─ ReportGenerator
```

### Service Dependencies

```
ChatBotService
  └─ Depends on:
     ├─ RunOrchestrator
     ├─ TestGenerationService
     ├─ TestExecutor
     ├─ ReportGenerator
     ├─ OllamaService
     └─ GovernanceService (diffs, confirmations, audit)
```

### Data Flow

```
User Input
  ↓
ChatBotService.processUserInput()
  ├─ classifyIntent() → ChatIntent
  ├─ planActions() → ChatAction[]
  ├─ executeActions() → ChatActionResult[]
  └─ renderResponse() → ChatMessage
```

---

## 8. Implementation Roadmap

### Phase 1: Intent Classification (Week 1)
- [x] Define intent patterns
- [ ] Implement pattern-based classifier
- [ ] Add NLP classifier (Ollama)
- [ ] Test intent recognition

### Phase 2: Action Planning (Week 2)
- [ ] Implement planActions() for each intent
- [ ] Add action sequencing
- [ ] Test action ordering

### Phase 3: Tool Coordination (Week 2)
- [ ] Implement executeActions()
- [ ] Bridge to RunOrchestrator
- [ ] Add error handling

### Phase 4: WebView UI (Week 3)
- [ ] Design chat panel
- [ ] Implement message rendering
- [ ] Add mode selector
- [ ] Test interactivity

### Phase 5: Invocation Points (Week 3)
- [ ] Add right-click context menu
- [ ] Add TreeView buttons
- [ ] Add Command Palette commands

### Phase 6: Integration & Testing (Week 4)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] UAT with team

---

## 9. Success Criteria

**When is ChatBot "Done"?**

✅ **Functional**
- [ ] Classifies user input → ChatIntent
- [ ] Plans actions → ChatAction[]
- [ ] Executes actions → Results
- [ ] Renders responses → ChatMessage

✅ **Safe**
- [ ] Shows diff before apply
- [ ] Asks confirmation for modifications
- [ ] Never auto-applies
- [ ] Logs every action
- [ ] Supports rollback

✅ **Multi-Channel**
- [ ] Right-click context menu works
- [ ] TreeView buttons work
- [ ] Command Palette works
- [ ] Chat UI works
- [ ] Auto-notifications work

✅ **Multi-Modal**
- [ ] EXPLAIN mode works
- [ ] PLAN mode works
- [ ] GENERATE mode works
- [ ] EXECUTE mode works
- [ ] AUDIT mode works

✅ **Integrated**
- [ ] Coordinates with RunOrchestrator
- [ ] Uses existing services
- [ ] No circular dependencies
- [ ] Persists state correctly

✅ **Tested**
- [ ] Unit test coverage > 80%
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] UAT approved

---

## 10. Documentation Files

**All ChatBot specifications are documented in:**

1. **CHATBOT_INTENT_ROUTING.md** — Complete intent routing table (E-F analysis)
2. **CHATBOT_CONVERSATION_MODES.md** — 5 conversation modes + flow diagrams
3. **CHATBOT_INVOCATION_POINTS.md** — 5 invocation channels + examples
4. **CHATBOT_SAFETY_GOVERNANCE.md** — Confirmation flows + audit trails
5. **CHATBOT_IMPLEMENTATION_GUIDE.md** — Step-by-step implementation phases
6. **CHATBOT_PRODUCT_SPEC.md** — This document (overview)

---

## 11. Example End-to-End Scenario

**"I want to fix the critical API gaps and generate evidence"**

```
1. User opens RepoSense
   └─ Extension auto-runs analysis
   └─ ChatBot shows: "Found 12 gaps, 3 CRITICAL"

2. User right-clicks on CRITICAL gap
   └─ Context menu: [Explain This Gap]
   └─ ChatBot (EXPLAIN mode): "Missing endpoint called 47 times..."
   └─ Mode switches to EXPLAIN
   └─ Shows code location + test references

3. User clicks [TreeView: 🧪 Generate] on same gap
   └─ ChatBot (GENERATE mode): "I'll generate Playwright tests"
   └─ Switches to GENERATE mode
   └─ Shows diff: +120 lines, 3 test scenarios
   └─ User clicks [Apply]
   └─ Files written to workspace

4. User types: "Run the tests"
   └─ ChatBot classifies: EXECUTE intent
   └─ Switches to EXECUTE mode
   └─ Asks: "Ready to run 15 tests?"
   └─ User confirms
   └─ Real-time progress: "Running 15/15..."
   └─ Results: ✅ 15/15 PASSED

5. User clicks [TreeView: 📋 Evidence] on run result
   └─ ChatBot (AUDIT mode): Generates UAT report
   └─ Includes: test results, screenshots, execution log, hashes
   └─ User clicks [Export]
   └─ Archive ready: evidence-2026-01-21.zip

6. User attaches to ticket: "Gap fixed and validated"
```

**Total workflow: 5 minutes**
**Evidence collected: Screenshots, logs, test results, hashes**
**Audit trail: All actions logged**

---

## 12. Competitive Advantages

vs. Manual Testing:
- ✅ Faster (automates plan + generate + run)
- ✅ Safer (diffs + confirmations)
- ✅ More evidence (captures logs, screenshots, videos)

vs. Generic Copilot:
- ✅ Domain-specific (understands gaps, endpoints, tests)
- ✅ Governed (confirmations, audit trails)
- ✅ Evidence-rich (compliance-grade reporting)

vs. CI/CD Pipeline:
- ✅ Interactive (user-guided, not automated)
- ✅ Local (runs in dev environment)
- ✅ Flexible (user chooses what to validate)

---

## 13. Risk Mitigation

**Risk: User accidentally applies wrong fix**
- Mitigation: Always show diff + ask confirmation

**Risk: No audit trail for compliance**
- Mitigation: Log every action to `.reposense/runs/`

**Risk: User can't undo changes**
- Mitigation: Support Ctrl+Z + manual rollback

**Risk: ChatBot goes offline (Ollama crashes)**
- Mitigation: Fall back to pattern-based classification

**Risk: Too many confirmation prompts (friction)**
- Mitigation: 3 safety tiers; Tier 1 = no confirmation

---

## 14. Future Enhancements

**V2.0 Roadmap:**
- Multi-user support (permissions, team workflows)
- Chat history export (compliance reporting)
- Scheduled runs (nightly validation)
- Slack integration (post results to #qa channel)
- Advanced NLP (understands complex queries)
- Custom intents (extensible architecture)

---

## 15. Success Metrics

**When should we consider ChatBot successful?**

1. **Adoption:** 90% of team uses ChatBot weekly
2. **Productivity:** 50% reduction in manual test planning time
3. **Quality:** 100% of API changes covered by generated tests
4. **Compliance:** 0 audit findings related to test evidence
5. **Satisfaction:** NPS > 8.0 from team feedback

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **Intent** | User's goal (ANALYZE, DECIDE, GENERATE, EXECUTE, REPORT) |
| **Action** | Discrete system operation (FETCH_GAP, GENERATE_TESTS, RUN_TESTS) |
| **Mode** | Conversation context (EXPLAIN, PLAN, GENERATE, EXECUTE, AUDIT) |
| **Channel** | Invocation method (right-click, TreeView, palette, chat, auto) |
| **Artifact** | Generated file or result (test, screenshot, report, log) |
| **Evidence** | Audit-trail artifacts (logs, screenshots, videos, hashes) |
| **Diff** | Preview of changes before applying |
| **Confirmation** | User approval required (safety tier 2-3) |
| **Audit Trail** | Immutable log of all actions |
| **Rollback** | Undo applied changes |

---

**Status:** ✅ Ready for development team to implement

**Next Steps:**
1. Review this spec with team
2. Start Phase 1 (Intent Classification)
3. Create implementation tickets
4. Begin development (est. 4 weeks)

