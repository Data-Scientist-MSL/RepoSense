# ChatBot Implementation Guide

Complete step-by-step blueprint for implementing the Intent-Driven Orchestration Assistant.

---

## Phase Overview

```
Phase 1: Intent Classification ← YOU ARE HERE
Phase 2: Action Planning
Phase 3: Tool Coordination
Phase 4: WebView UI
Phase 5: Invocation Points
Phase 6: Integration & Testing
```

---

## Phase 1: Intent Classification

**Goal:** Transform natural language input into structured `ChatIntent` objects

**Files Affected:**
- `src/services/ChatBotService.ts` — intent classification logic

### Step 1.1: Pattern Matching Approach (Fast, Deterministic)

Create intent patterns file:

```typescript
// src/services/chatbot/IntentPatterns.ts

const INTENT_PATTERNS: Record<ChatIntentType, RegExp[]> = {
  [ChatIntentType.ANALYZE]: [
    /explain.*gap/i,
    /why.*unused/i,
    /show.*impact/i,
    /what.*gaps/i,
    /identify.*priority/i,
    /assess.*criticality/i,
    /evaluate.*risk/i,
    /analyze/i
  ],
  [ChatIntentType.DECIDE]: [
    /create.*plan/i,
    /suggest.*approach/i,
    /recommend.*order/i,
    /what.*first/i,
    /prioritize/i
  ],
  [ChatIntentType.GENERATE]: [
    /generate.*test/i,
    /create.*test/i,
    /suggest.*fix/i,
    /propose.*remediation/i,
    /fix.*endpoint/i
  ],
  [ChatIntentType.EXECUTE]: [
    /run.*test/i,
    /validate/i,
    /execute/i,
    /debug.*test/i,
    /rerun/i
  ],
  [ChatIntentType.REPORT]: [
    /generate.*report/i,
    /export.*evidence/i,
    /create.*summary/i,
    /show.*coverage/i,
    /uat.*report/i
  ]
};

export function classifyIntentByPattern(input: string): {
  type: ChatIntentType;
  confidence: number;
} {
  let bestMatch: { type: ChatIntentType; confidence: number } = {
    type: ChatIntentType.ANALYZE,
    confidence: 0
  };

  for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        return { type: intentType as ChatIntentType, confidence: 0.9 };
      }
    }
  }

  // Fallback: return HELP intent with low confidence
  return { type: ChatIntentType.ANALYZE, confidence: 0.3 };
}
```

### Step 1.2: NLP Enhancement (Optional, Higher Accuracy)

```typescript
// src/services/chatbot/NLPIntentClassifier.ts

export class NLPIntentClassifier {
  private ollamaService: OllamaService;

  constructor(ollamaService: OllamaService) {
    this.ollamaService = ollamaService;
  }

  async classifyIntentWithNLP(input: string): Promise<{
    type: ChatIntentType;
    subtype: string;
    confidence: number;
  }> {
    const prompt = `
Classify this user input into a RepoSense intent category.

Categories:
- ANALYZE: Questions about current state (explain, why, what gaps)
- DECIDE: Planning/strategy (create plan, recommend approach)
- GENERATE: Creating tests/code (generate tests, suggest fix)
- EXECUTE: Running/validating (run tests, debug)
- REPORT: Documentation/evidence (generate report, export)

User input: "${input}"

Respond in JSON format:
{
  "type": "ANALYZE|DECIDE|GENERATE|EXECUTE|REPORT",
  "subtype": "EXPLAIN_GAPS|EXPLAIN_GAP_DETAIL|...",
  "confidence": 0.0-1.0,
  "reasoning": "..."
}
    `;

    const response = await this.ollamaService.generate(prompt);
    return JSON.parse(response);
  }
}
```

### Step 1.3: Implement classifyIntent() in ChatBotService

```typescript
// src/services/ChatBotService.ts - EXTEND

private patternClassifier: IntentPatternClassifier;
private nlpClassifier: NLPIntentClassifier;

async classifyIntent(
  input: string,
  context: ChatContext
): Promise<ChatIntent> {
  // Step 1: Try fast pattern matching first
  const patternMatch = classifyIntentByPattern(input);
  
  if (patternMatch.confidence > 0.85) {
    // High confidence from pattern → use immediately
    return {
      type: patternMatch.type,
      subtype: this.refineSubtype(input, patternMatch.type),
      target: context.focusedGapId || undefined,
      parameters: this.extractParameters(input, patternMatch.type)
    };
  }

  // Step 2: If low confidence, use NLP for refinement
  if (patternMatch.confidence < 0.7) {
    try {
      const nlpMatch = await this.nlpClassifier.classifyIntentWithNLP(input);
      return {
        type: nlpMatch.type,
        subtype: nlpMatch.subtype,
        target: context.focusedGapId || undefined,
        parameters: this.extractParameters(input, nlpMatch.type)
      };
    } catch (error) {
      // If NLP fails, fall back to pattern match
      console.warn('NLP classification failed, using pattern match', error);
      return {
        type: patternMatch.type,
        subtype: 'HELP',
        target: undefined,
        parameters: {}
      };
    }
  }

  // Step 3: Medium confidence → ask for clarification
  return {
    type: ChatIntentType.ANALYZE,
    subtype: 'CLARIFY',
    target: undefined,
    parameters: {
      originalInput: input,
      candidates: [patternMatch.type, 'OTHER']
    }
  };
}

private refineSubtype(
  input: string,
  intentType: ChatIntentType
): string {
  // Map intentType + input words → specific subtype
  const subtypeMap: Record<ChatIntentType, Record<string, string>> = {
    [ChatIntentType.ANALYZE]: {
      'gap': 'EXPLAIN_GAP_DETAIL',
      'gaps': 'EXPLAIN_GAPS',
      'priority': 'IDENTIFY_PRIORITY',
      'risk': 'EVALUATE_RISK',
      'impact': 'UNDERSTAND_IMPACT',
      'criticality': 'ASSESS_CRITICALITY'
    },
    [ChatIntentType.DECIDE]: {
      'plan': 'RECOMMEND_ORDER',
      'order': 'RECOMMEND_ORDER',
      'approach': 'RECOMMEND_ORDER'
    },
    [ChatIntentType.GENERATE]: {
      'test': 'GENERATE_TESTS',
      'fix': 'PROPOSE_REMEDIATION',
      'remediation': 'PROPOSE_REMEDIATION'
    },
    [ChatIntentType.EXECUTE]: {
      'test': 'RUN_TESTS',
      'validation': 'RUN_VALIDATION',
      'debug': 'RERUN_WITH_DEBUG'
    },
    [ChatIntentType.REPORT]: {
      'report': 'GENERATE_UAT_REPORT',
      'evidence': 'EXPORT_EVIDENCE',
      'summary': 'CREATE_EXECUTIVE_SUMMARY'
    }
  };

  for (const [keyword, subtype] of Object.entries(
    subtypeMap[intentType] || {}
  )) {
    if (input.toLowerCase().includes(keyword)) {
      return subtype;
    }
  }

  return 'DEFAULT';
}

private extractParameters(
  input: string,
  intentType: ChatIntentType
): Record<string, any> {
  const params: Record<string, any> = {};

  // Extract severity level: CRITICAL, HIGH, ALL
  if (/critical/i.test(input)) params.severity = 'CRITICAL';
  else if (/high/i.test(input)) params.severity = 'HIGH';
  else if (/all/i.test(input)) params.severity = 'ALL';

  // Extract framework: Playwright, Cypress, Jest, etc.
  const frameworks = ['playwright', 'cypress', 'jest', 'mocha', 'vitest', 'pytest'];
  for (const framework of frameworks) {
    if (input.toLowerCase().includes(framework)) {
      params.framework = framework;
      break;
    }
  }

  // Extract scope: Generated, Suite, All
  if (/generated/i.test(input)) params.scope = 'GENERATED';
  else if (/suite/i.test(input)) params.scope = 'SUITE';
  else if (/all/i.test(input)) params.scope = 'ALL';

  return params;
}
```

### Step 1.4: Integrate into processUserInput()

```typescript
// src/services/ChatBotService.ts - EXTEND

async processUserInput(
  input: string,
  context: ChatContext
): Promise<ChatResponse> {
  try {
    // Step 1: Classify intent
    const intent = await this.classifyIntent(input, context);

    // Step 2: Handle clarification if needed
    if (intent.subtype === 'CLARIFY') {
      return {
        mode: this.currentMode,
        summary: 'I wasn\'t sure what you meant. Did you want to:',
        suggestions: [
          { action: 'EXPLAIN_GAPS', label: 'Explain gaps' },
          { action: 'GENERATE_TESTS', label: 'Generate tests' },
          { action: 'RUN_TESTS', label: 'Run tests' }
        ],
        actions: []
      };
    }

    // Step 3: Plan actions for this intent
    const actions = await this.planActions(intent, context);

    // Step 4: Render response
    return await this.renderResponse(intent, actions, context);
  } catch (error) {
    console.error('Error processing user input:', error);
    return {
      mode: this.currentMode,
      summary: 'Sorry, I had trouble understanding that. Can you rephrase?',
      actions: []
    };
  }
}
```

---

## Phase 2: Action Planning

**Goal:** Convert `ChatIntent` → `ChatAction[]` for execution

### Step 2.1: Implement planActions()

```typescript
// src/services/ChatBotService.ts - ADD

async planActions(
  intent: ChatIntent,
  context: ChatContext
): Promise<ChatAction[]> {
  const actions: ChatAction[] = [];

  switch (intent.type) {
    case ChatIntentType.ANALYZE:
      actions.push(...await this.planAnalysisActions(intent, context));
      break;
    case ChatIntentType.DECIDE:
      actions.push(...await this.planDecisionActions(intent, context));
      break;
    case ChatIntentType.GENERATE:
      actions.push(...await this.planGenerationActions(intent, context));
      break;
    case ChatIntentType.EXECUTE:
      actions.push(...await this.planExecutionActions(intent, context));
      break;
    case ChatIntentType.REPORT:
      actions.push(...await this.planReportingActions(intent, context));
      break;
  }

  return actions;
}

private async planAnalysisActions(
  intent: ChatIntent,
  context: ChatContext
): Promise<ChatAction[]> {
  const actions: ChatAction[] = [];

  switch (intent.subtype) {
    case 'EXPLAIN_GAP_DETAIL':
      actions.push({
        type: 'FETCH_GAP_DETAIL',
        params: { gapId: context.focusedGapId },
        confirmationRequired: false
      });
      break;

    case 'EXPLAIN_GAPS':
      actions.push({
        type: 'FETCH_ALL_GAPS',
        params: {},
        confirmationRequired: false
      });
      break;

    case 'IDENTIFY_PRIORITY':
      actions.push({
        type: 'SCORE_GAPS',
        params: { topN: 5 },
        confirmationRequired: false
      });
      break;

    case 'EVALUATE_RISK':
      actions.push({
        type: 'ANALYZE_RISK',
        params: {},
        confirmationRequired: false
      });
      break;
  }

  return actions;
}

private async planGenerationActions(
  intent: ChatIntent,
  context: ChatContext
): Promise<ChatAction[]> {
  const actions: ChatAction[] = [];

  switch (intent.subtype) {
    case 'GENERATE_TESTS':
      actions.push(
        {
          type: 'GENERATE_TEST_CANDIDATES',
          params: {
            severity: intent.parameters.severity || 'ALL',
            framework: intent.parameters.framework
          },
          confirmationRequired: false
        },
        {
          type: 'SHOW_DIFF',
          params: {},
          confirmationRequired: false
        },
        {
          type: 'ASK_CONFIRMATION',
          params: { message: 'Apply these tests?' },
          confirmationRequired: true
        },
        {
          type: 'APPLY_ARTIFACTS',
          params: {},
          confirmationRequired: false
        }
      );
      break;

    case 'PROPOSE_REMEDIATION':
      actions.push(
        {
          type: 'GENERATE_REMEDIATION',
          params: { gapId: context.focusedGapId },
          confirmationRequired: false
        },
        {
          type: 'SHOW_DIFF',
          params: {},
          confirmationRequired: false
        },
        {
          type: 'ASK_CONFIRMATION',
          params: { message: 'Apply this remediation?' },
          confirmationRequired: true
        }
      );
      break;
  }

  return actions;
}

private async planExecutionActions(
  intent: ChatIntent,
  context: ChatContext
): Promise<ChatAction[]> {
  const actions: ChatAction[] = [];

  switch (intent.subtype) {
    case 'RUN_TESTS':
      actions.push(
        {
          type: 'ASK_CONFIRMATION',
          params: {
            message: `Ready to run ${intent.parameters.scope || 'all'} tests?`,
            options: ['Run', 'Configure', 'Cancel']
          },
          confirmationRequired: true
        },
        {
          type: 'EXECUTE_TESTS',
          params: {
            scope: intent.parameters.scope || 'ALL',
            framework: intent.parameters.framework
          },
          confirmationRequired: false
        },
        {
          type: 'SHOW_RESULTS',
          params: {},
          confirmationRequired: false
        }
      );
      break;
  }

  return actions;
}

// Similar functions for planDecisionActions, planReportingActions...
```

---

## Phase 3: Tool Coordination

**Goal:** Execute `ChatAction[]` by delegating to RunOrchestrator services

### Step 3.1: Implement executeActions()

```typescript
// src/services/ChatBotService.ts - ADD

async executeActions(
  actions: ChatAction[],
  context: ChatContext
): Promise<ChatActionResult[]> {
  const results: ChatActionResult[] = [];

  for (const action of actions) {
    try {
      // Check if confirmation required
      if (action.confirmationRequired) {
        const confirmed = await this.requestConfirmation(action);
        if (!confirmed) {
          results.push({
            action,
            status: 'CANCELLED',
            result: null
          });
          continue;
        }
      }

      // Execute the action
      const result = await this.executeAction(action, context);
      results.push({
        action,
        status: 'SUCCESS',
        result
      });

      // Update context with result
      context = { ...context, lastActionResult: result };
    } catch (error) {
      console.error(`Error executing action ${action.type}:`, error);
      results.push({
        action,
        status: 'FAILED',
        error: String(error)
      });
    }
  }

  return results;
}

private async executeAction(
  action: ChatAction,
  context: ChatContext
): Promise<any> {
  switch (action.type) {
    case 'FETCH_GAP_DETAIL':
      return await this.toolFetchGapDetail(action.params.gapId);

    case 'FETCH_ALL_GAPS':
      return await this.toolFetchAllGaps();

    case 'GENERATE_TEST_CANDIDATES':
      return await this.toolGenerateTestCandidates(action.params);

    case 'SHOW_DIFF':
      return await this.toolShowDiff(context);

    case 'APPLY_ARTIFACTS':
      return await this.toolApplyArtifacts(context);

    case 'EXECUTE_TESTS':
      return await this.toolExecuteTests(action.params);

    case 'EXPORT_EVIDENCE':
      return await this.toolExportEvidence(action.params);

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

// Tool implementations
private async toolFetchGapDetail(gapId: string): Promise<GapDetail> {
  const analysis = await this.runOrchestrator.getLatestAnalysis();
  return analysis.gaps.find(g => g.id === gapId);
}

private async toolGenerateTestCandidates(params: any): Promise<TestCandidate[]> {
  await this.runOrchestrator.transitionTo(RunState.GENERATING);
  return await this.runOrchestrator.executeGenerate();
}

private async toolShowDiff(context: ChatContext): Promise<DiffView> {
  // Render side-by-side diff
  return this.governanceService.generateDiff(context.lastActionResult);
}

private async toolExecuteTests(params: any): Promise<ExecutionResult> {
  await this.runOrchestrator.transitionTo(RunState.EXECUTING);
  return await this.runOrchestrator.executeExecute();
}

// ... more tool implementations
```

---

## Phase 4: WebView UI

**Goal:** Build the visual ChatBot panel in VS Code

### Step 4.1: Create ChatBotPanel.ts

```typescript
// src/providers/ChatBotPanel.ts (NEW FILE)

import * as vscode from 'vscode';

export class ChatBotPanel {
  public static currentPanel: ChatBotPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _chatBotService: ChatBotService;

  public static createOrShow(
    extensionUri: vscode.Uri,
    chatBotService: ChatBotService
  ) {
    if (ChatBotPanel.currentPanel) {
      ChatBotPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'chatBot',
      'RepoSense ChatBot',
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    ChatBotPanel.currentPanel = new ChatBotPanel(
      panel,
      extensionUri,
      chatBotService
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    chatBotService: ChatBotService
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._chatBotService = chatBotService;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null);

    this._panel.webview.onDidReceiveMessage(
      async (message) => await this._handleMessage(message),
      null
    );
  }

  private async _handleMessage(message: any) {
    switch (message.command) {
      case 'sendMessage':
        await this._processChatMessage(message.text);
        break;
      case 'selectMode':
        this._chatBotService.setMode(message.mode);
        break;
      case 'confirmAction':
        // Handle action confirmation
        break;
    }
  }

  private async _processChatMessage(text: string) {
    // 1. Classify intent
    const intent = await this._chatBotService.classifyIntent(text, {});

    // 2. Plan actions
    const actions = await this._chatBotService.planActions(intent, {});

    // 3. Execute actions
    const results = await this._chatBotService.executeActions(actions, {});

    // 4. Render response
    this._panel.webview.postMessage({
      command: 'appendMessage',
      role: 'assistant',
      content: this._formatResponse(results)
    });
  }

  private _update() {
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: var(--vscode-font-family); }
          .container { display: flex; flex-direction: column; height: 100vh; }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid var(--vscode-border-color);
          }
          .mode-selector { padding: 8px 12px; }
          .conversation {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
          }
          .message {
            margin: 8px 0;
            padding: 8px 12px;
            border-radius: 4px;
          }
          .message.assistant {
            background-color: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-accent);
          }
          .message.user {
            background-color: var(--vscode-hover-background);
            margin-left: 40px;
          }
          .input-area {
            display: flex;
            padding: 12px;
            border-top: 1px solid var(--vscode-border-color);
          }
          .input-area input {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--vscode-border-color);
            border-radius: 4px;
          }
          .input-area button {
            margin-left: 8px;
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .actions {
            display: flex;
            gap: 8px;
            margin-top: 8px;
            flex-wrap: wrap;
          }
          .action-button {
            padding: 6px 12px;
            background-color: var(--vscode-commandPalette-background);
            border: 1px solid var(--vscode-border-color);
            border-radius: 4px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>RepoSense ChatBot</h2>
            <select class="mode-selector" id="modeSelector">
              <option value="EXPLAIN">💬 Explain</option>
              <option value="PLAN">📊 Plan</option>
              <option value="GENERATE">🧪 Generate</option>
              <option value="EXECUTE">▶ Execute</option>
              <option value="AUDIT">📋 Audit</option>
            </select>
          </div>

          <div class="conversation" id="conversation">
            <div class="message assistant">
              Welcome to RepoSense! How can I help?
            </div>
          </div>

          <div class="input-area">
            <input
              type="text"
              id="messageInput"
              placeholder="Ask me anything..."
              onkeypress="if(event.key==='Enter') sendMessage()"
            />
            <button onclick="sendMessage()">Send</button>
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();

          function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (!text) return;

            // Append user message
            const conv = document.getElementById('conversation');
            const userMsg = document.createElement('div');
            userMsg.className = 'message user';
            userMsg.textContent = text;
            conv.appendChild(userMsg);

            // Send to extension
            vscode.postMessage({
              command: 'sendMessage',
              text
            });

            input.value = '';
            conv.scrollTop = conv.scrollHeight;
          }

          document.getElementById('modeSelector').addEventListener('change', (e) => {
            vscode.postMessage({
              command: 'selectMode',
              mode: e.target.value
            });
          });

          // Handle messages from extension
          window.addEventListener('message', (e) => {
            const message = e.data;
            if (message.command === 'appendMessage') {
              const conv = document.getElementById('conversation');
              const msg = document.createElement('div');
              msg.className = 'message assistant';
              msg.innerHTML = message.content;
              conv.appendChild(msg);
              conv.scrollTop = conv.scrollHeight;
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  private _formatResponse(results: ChatActionResult[]): string {
    // Format results as HTML for display
    return results
      .map(r => `<p>${r.status}: ${JSON.stringify(r.result)}</p>`)
      .join('');
  }

  public dispose() {
    ChatBotPanel.currentPanel = undefined;
    this._panel.dispose();
  }
}
```

---

## Phase 5: Invocation Points

**Goal:** Wire ChatBot to UI trigger points

See **CHATBOT_INVOCATION_POINTS.md** for detailed implementation.

---

## Phase 6: Integration & Testing

### Step 6.1: Wire ChatBotService to Extension

```typescript
// src/extension.ts - EXTEND

let chatBotService: ChatBotService;

export async function activate(context: vscode.ExtensionContext) {
  // ... existing code ...

  // Initialize ChatBotService
  chatBotService = new ChatBotService(
    runOrchestrator,
    testGenerationService,
    testExecutor,
    reportGenerator,
    ollamaService
  );

  // Register ChatBot command
  context.subscriptions.push(
    vscode.commands.registerCommand('reposense.openChatBot', () => {
      ChatBotPanel.createOrShow(context.extensionUri, chatBotService);
    })
  );

  // Register intent commands
  context.subscriptions.push(
    vscode.commands.registerCommand('reposense.explainGaps', async () => {
      ChatBotPanel.createOrShow(context.extensionUri, chatBotService);
      await chatBotService.processUserInput('Explain the gaps', {});
    })
  );

  // ... more commands ...
}
```

### Step 6.2: Unit Tests

```typescript
// src/test/suite/services/ChatBotService.test.ts (NEW)

import * as assert from 'assert';
import { ChatBotService } from '../../../services/ChatBotService';

suite('ChatBotService', () => {
  let service: ChatBotService;

  setup(() => {
    // Initialize with mocks
    service = new ChatBotService(/* ... */);
  });

  test('should classify EXPLAIN intent', async () => {
    const intent = await service.classifyIntent(
      'Why is this endpoint unused?',
      {}
    );
    assert.strictEqual(intent.type, 'ANALYZE');
    assert.strictEqual(intent.subtype, 'EXPLAIN_GAP_DETAIL');
  });

  test('should classify GENERATE intent', async () => {
    const intent = await service.classifyIntent(
      'Generate tests for critical gaps',
      {}
    );
    assert.strictEqual(intent.type, 'GENERATE');
  });

  test('should extract framework parameter', async () => {
    const intent = await service.classifyIntent(
      'Generate Playwright tests',
      {}
    );
    assert.strictEqual(intent.parameters.framework, 'playwright');
  });

  test('should plan generation actions', async () => {
    const intent = {
      type: 'GENERATE',
      subtype: 'GENERATE_TESTS',
      parameters: {}
    };
    const actions = await service.planActions(intent, {});
    assert(actions.length > 0);
    assert.strictEqual(actions[0].type, 'GENERATE_TEST_CANDIDATES');
  });
});
```

---

## Deployment Checklist

```
Phase 1: Intent Classification
□ Implement pattern-based classification
□ Add NLP classifier (optional)
□ Test intent recognition
□ Add parameter extraction

Phase 2: Action Planning
□ Implement planActions() for each intent
□ Add action sequencing logic
□ Test action ordering

Phase 3: Tool Coordination
□ Implement executeActions()
□ Bridge to RunOrchestrator
□ Add error handling

Phase 4: WebView UI
□ Design HTML layout
□ Implement message rendering
□ Add mode selector
□ Test interactivity

Phase 5: Invocation Points
□ Add context menu integration
□ Add TreeView buttons
□ Add Command Palette commands
□ Add keyboard shortcuts

Phase 6: Testing
□ Unit tests for intent classification
□ Integration tests for action planning
□ E2E tests for full workflow
□ UAT with real users

Deployment
□ Code review
□ Performance testing
□ Security review
□ Documentation
```

---

## Next Steps

1. **NOW**: Implement Phase 1 (Intent Classification) ← Start here
2. **THEN**: Phases 2-3 (Action Planning + Tool Coordination)
3. **THEN**: Phase 4-5 (UI + Invocation)
4. **FINALLY**: Phase 6 (Testing + Deployment)

Each phase is independent and can be tested in isolation.
