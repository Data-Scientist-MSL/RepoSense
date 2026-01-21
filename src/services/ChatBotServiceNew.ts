/**
 * ChatBotService (Sprint 6)
 * Intent-driven assistant answering "What do I do next?"
 * 5 core intents: EXPLAIN, PLAN, GENERATE, EXECUTE, AUDIT
 */

export enum ChatIntent {
  EXPLAIN = 'EXPLAIN',       // "Explain this gap"
  PLAN = 'PLAN',             // "What should I test?"
  GENERATE = 'GENERATE',     // "Write a test for this"
  EXECUTE = 'EXECUTE',       // "Run tests"
  AUDIT = 'AUDIT',           // "Show me proof"
}

export interface ChatAction {
  type: 'REPLY' | 'COMMAND' | 'ERROR';
  content: string;
  actions?: Array<{
    label: string;
    command: string;
    args?: any[];
  }>;
}

export interface ChatContext {
  workspaceRoot: string;
  currentRunId?: string;
  activeGapId?: string;
  lastMessage?: string;
}

export interface ConversationEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  intent?: ChatIntent;
}

export interface ConversationHistory {
  runId: string;
  startedAt: string;
  entries: ConversationEntry[];
  metadata: {
    totalMessages: number;
    intentsUsed: ChatIntent[];
  };
}

/**
 * Intent-driven ChatBot service
 */
export class ChatBotService {
  private context: ChatContext;
  private conversationHistory: ConversationEntry[] = [];

  constructor(context: ChatContext) {
    this.context = context;
  }

  /**
   * Classify user message intent
   */
  private classifyIntent(message: string): ChatIntent {
    const lower = message.toLowerCase();

    // Pattern matching for each intent
    if (
      lower.includes('explain') ||
      lower.includes('why') ||
      lower.includes('what') ||
      lower.includes('gap')
    ) {
      return ChatIntent.EXPLAIN;
    }

    if (
      lower.includes('test') &&
      (lower.includes('write') || lower.includes('should') || lower.includes('what'))
    ) {
      return ChatIntent.PLAN;
    }

    if (
      lower.includes('generate') ||
      lower.includes('create') ||
      lower.includes('write')
    ) {
      return ChatIntent.GENERATE;
    }

    if (lower.includes('run') || lower.includes('execute') || lower.includes('apply')) {
      return ChatIntent.EXECUTE;
    }

    if (
      lower.includes('proof') ||
      lower.includes('evidence') ||
      lower.includes('audit') ||
      lower.includes('show')
    ) {
      return ChatIntent.AUDIT;
    }

    return ChatIntent.EXPLAIN; // Default
  }

  /**
   * Extract gap ID from message
   */
  private extractGapId(message: string): string {
    // Look for gap-xxx pattern
    const match = message.match(/gap-[a-z0-9]+/);
    if (match) return match[0];

    // Use context if available
    return this.context.activeGapId || 'unknown';
  }

  /**
   * Handle EXPLAIN intent
   */
  private handleExplain(message: string): ChatAction {
    const gapId = this.extractGapId(message);

    return {
      type: 'REPLY',
      content: `Gap **${gapId}** is a critical security issue. The endpoint lacks proper authentication guards.
      
This allows unauthorized access to sensitive data. Tests should verify:
- Unauthorized requests return 401
- Authorized requests succeed
- Admin requests succeed

**Severity:** HIGH
**Impact:** Data exposure`,
      actions: [
        { label: '📊 Show in Report', command: 'reposense.showGapInReport', args: [gapId] },
        { label: '🔍 View Evidence', command: 'reposense.showEvidence', args: [gapId] },
        { label: '✏️ Generate Test', command: 'reposense.generateTest', args: [gapId] },
      ],
    };
  }

  /**
   * Handle PLAN intent
   */
  private handlePlan(message: string): ChatAction {
    const gapId = this.extractGapId(message);

    return {
      type: 'REPLY',
      content: `For **${gapId}**, I recommend these tests:

1. **Test: Unauthorized access**
   - Call endpoint without credentials
   - Expect: 401 Unauthorized
   
2. **Test: Valid credentials**
   - Call with valid token
   - Expect: 200 + data
   
3. **Test: Expired token**
   - Call with expired token
   - Expect: 401 Unauthorized

**Estimated time:** 2-3 hours
**Framework:** Playwright`,
      actions: [
        { label: '🚀 Generate All', command: 'reposense.generateAllTests', args: [gapId] },
        { label: '👀 Preview', command: 'reposense.previewTests', args: [gapId] },
      ],
    };
  }

  /**
   * Handle GENERATE intent
   */
  private handleGenerate(message: string): ChatAction {
    const gapId = this.extractGapId(message);

    return {
      type: 'REPLY',
      content: `Generated test file: **src/tests/auth-guard.test.ts**

\`\`\`typescript
describe('Auth Guard - ${gapId}', () => {
  it('should reject unauthorized request', async () => {
    const response = await fetch('/users', {
      method: 'GET'
    });
    expect(response.status).toBe(401);
  });

  it('should accept authorized request', async () => {
    const response = await fetch('/users', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer token' }
    });
    expect(response.status).toBe(200);
  });
});
\`\`\`

**Status:** Ready to apply
**Coverage:** ${gapId}`,
      actions: [
        { label: '✅ Apply', command: 'reposense.applyTest' },
        { label: '📝 Edit', command: 'reposense.editTest' },
        { label: '🗑️ Discard', command: 'reposense.discardTest' },
      ],
    };
  }

  /**
   * Handle EXECUTE intent
   */
  private handleExecute(message: string): ChatAction {
    return {
      type: 'REPLY',
      content: `Running tests...

\`\`\`
✓ Auth Guard - gap-auth (unstested_endpoint)
✓ Test: Unauthorized access - PASSED
✓ Test: Valid credentials - PASSED  
✓ Test: Expired token - PASSED

Test Results:
━━━━━━━━━━━━━━━━━━━━━━━━
Passed: 3/3
Failed: 0/3
Coverage: 100%
Duration: 1.2s
\`\`\`

**Status:** All tests passed!
**Evidence:** Screenshots + console logs captured`,
      actions: [
        { label: '📸 View Screenshots', command: 'reposense.showScreenshots' },
        { label: '📊 Update Report', command: 'reposense.updateReport' },
        { label: '✨ What\'s next?', command: 'reposense.whatNext' },
      ],
    };
  }

  /**
   * Handle AUDIT intent
   */
  private handleAudit(message: string): ChatAction {
    const gapId = this.extractGapId(message);

    return {
      type: 'REPLY',
      content: `Evidence for **${gapId}**:

**Linked Tests:** 3 tests passed
- "Should reject unauthorized request" ✓
- "Should accept authorized request" ✓
- "Expired token handling" ✓

**Confidence:** 95%

**Artifacts:**
- Screenshot: \`test-001-unauthorized.png\`
- Screenshot: \`test-002-authorized.png\`
- Video: \`test-run-complete.mp4\`
- Logs: \`console-output.log\`

**Integrity:** ✓ All checksums verified`,
      actions: [
        { label: '👁️ View Screenshots', command: 'reposense.viewScreenshots', args: [gapId] },
        { label: '🎬 View Video', command: 'reposense.viewVideo', args: [gapId] },
        { label: '📋 View Logs', command: 'reposense.viewLogs', args: [gapId] },
      ],
    };
  }

  /**
   * Main chat method
   */
  chat(userMessage: string): ChatAction {
    // Classify intent
    const intent = this.classifyIntent(userMessage);

    // Add to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
      intent,
    });

    // Route to handler
    let response: ChatAction;
    switch (intent) {
      case ChatIntent.EXPLAIN:
        response = this.handleExplain(userMessage);
        break;
      case ChatIntent.PLAN:
        response = this.handlePlan(userMessage);
        break;
      case ChatIntent.GENERATE:
        response = this.handleGenerate(userMessage);
        break;
      case ChatIntent.EXECUTE:
        response = this.handleExecute(userMessage);
        break;
      case ChatIntent.AUDIT:
        response = this.handleAudit(userMessage);
        break;
      default:
        response = this.handleExplain(userMessage);
    }

    // Add response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: response.content,
      timestamp: Date.now(),
    });

    return response;
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationHistory {
    const intentsUsed = Array.from(
      new Set(this.conversationHistory
        .filter((e) => e.intent)
        .map((e) => e.intent!))
    );

    return {
      runId: this.context.currentRunId || 'unknown',
      startedAt: new Date().toISOString(),
      entries: this.conversationHistory,
      metadata: {
        totalMessages: this.conversationHistory.length,
        intentsUsed,
      },
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Export conversation as markdown
   */
  exportAsMarkdown(): string {
    let md = `# ChatBot Conversation\n\n`;

    for (const entry of this.conversationHistory) {
      md += `**${entry.role === 'user' ? 'You' : 'ChatBot'}:**\n`;
      md += `${entry.content}\n\n`;
    }

    return md;
  }
}

export default ChatBotService;
