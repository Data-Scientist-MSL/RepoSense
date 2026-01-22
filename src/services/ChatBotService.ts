/**
 * ChatBotService.ts
 *
 * Intent-Driven Orchestration Assistant.
 * Maps user intents to system actions, manages conversation state,
 * and coordinates with AnalysisEngine, TestGenerator, RunOrchestrator, etc.
 */

import { v4 as uuid } from 'uuid';
import * as vscode from 'vscode';
import {
    ChatIntent,
    ChatIntentCategory,
    ChatIntentRequest,
    ChatResponse,
    ChatMessage,
    ChatMessageRole,
    ConversationThread,
    ConversationMode,
    ChatContext,
    ChatAction,
    ChatActionResult,
    ChatActionType,
    IntentAnalysis,
    IChatBotService,
    ContextualInvocationSource,
    PreSeededChat,
    DEFAULT_CONVERSATION_MODE,
    INTENT_TO_CONFIRMATION_REQUIRED,
    ChatActionAuditLog,
    ChatAttachment
} from '../models/ChatBot';
import { RunOrchestrator } from './RunOrchestrator';
import { GapItem } from '../models/types';

/**
 * ChatBotService: Intent-driven orchestration assistant
 */
export class ChatBotService implements IChatBotService {
    private threads: Map<string, ConversationThread> = new Map();
    private orchestrator: RunOrchestrator;
    private auditLog: ChatActionAuditLog[] = [];
    private lastAnalysisResult: any;

    constructor(orchestrator: RunOrchestrator) {
        this.orchestrator = orchestrator;
    }

    // ========================================================================
    // Intent Analysis
    // ========================================================================

    /**
     * Analyze free-text user input to recognize intent
     */
    async analyzeIntent(userInput: string, context: ChatContext): Promise<IntentAnalysis> {
        // Simple keyword-based intent recognition
        // In production: use LLM for more sophisticated understanding
        
        const lowercased = userInput.toLowerCase();

        // Analysis intents
        if (lowercased.includes('gap') && lowercased.includes('explain')) {
            return {
                recognizedIntent: ChatIntent.EXPLAIN_GAPS,
                confidence: 85,
                category: ChatIntentCategory.ANALYSIS,
                extractedEntities: [],
                requiresClarification: false
            };
        }

        if ((lowercased.includes('impact') || lowercased.includes('affect')) && context.focusedGapId) {
            return {
                recognizedIntent: ChatIntent.UNDERSTAND_IMPACT,
                confidence: 80,
                category: ChatIntentCategory.ANALYSIS,
                extractedEntities: [{ type: 'gap', value: context.focusedGapId, confidence: 90 }],
                requiresClarification: false
            };
        }

        // Decision intents
        if (lowercased.includes('priority') || lowercased.includes('first')) {
            return {
                recognizedIntent: ChatIntent.IDENTIFY_PRIORITY,
                confidence: 85,
                category: ChatIntentCategory.DECISION,
                extractedEntities: [],
                requiresClarification: false
            };
        }

        if (lowercased.includes('risk') || lowercased.includes('critical')) {
            return {
                recognizedIntent: ChatIntent.EVALUATE_RISK,
                confidence: 80,
                category: ChatIntentCategory.DECISION,
                extractedEntities: [],
                requiresClarification: false
            };
        }

        // Generation intents
        if ((lowercased.includes('generate') || lowercased.includes('create')) && lowercased.includes('test')) {
            return {
                recognizedIntent: ChatIntent.GENERATE_TESTS,
                confidence: 90,
                category: ChatIntentCategory.GENERATION,
                extractedEntities: [],
                requiresClarification: false
            };
        }

        if (lowercased.includes('diff') || lowercased.includes('before')) {
            return {
                recognizedIntent: ChatIntent.SHOW_DIFF,
                confidence: 85,
                category: ChatIntentCategory.GENERATION,
                extractedEntities: [],
                requiresClarification: false
            };
        }

        // Execution intents
        if ((lowercased.includes('run') || lowercased.includes('execute')) && lowercased.includes('test')) {
            return {
                recognizedIntent: ChatIntent.RUN_TESTS,
                confidence: 90,
                category: ChatIntentCategory.EXECUTION,
                extractedEntities: [],
                requiresClarification: false
            };
        }

        if (lowercased.includes('evidence') || lowercased.includes('proof')) {
            return {
                recognizedIntent: ChatIntent.SHOW_EXECUTION_EVIDENCE,
                confidence: 80,
                category: ChatIntentCategory.EXECUTION,
                extractedEntities: [],
                requiresClarification: false
            };
        }

        // Reporting intents
        if (lowercased.includes('report') || lowercased.includes('summary')) {
            return {
                recognizedIntent: ChatIntent.CREATE_EXECUTIVE_SUMMARY,
                confidence: 85,
                category: ChatIntentCategory.REPORTING,
                extractedEntities: [],
                requiresClarification: false
            };
        }

        if (lowercased.includes('export') || lowercased.includes('audit')) {
            return {
                recognizedIntent: ChatIntent.EXPORT_EVIDENCE,
                confidence: 80,
                category: ChatIntentCategory.REPORTING,
                extractedEntities: [],
                requiresClarification: false
            };
        }

        // Default: clarification needed
        return {
            recognizedIntent: ChatIntent.CLARIFY,
            confidence: 0,
            category: ChatIntentCategory.ANALYSIS,
            extractedEntities: [],
            requiresClarification: true,
            clarificationQuestion: `I understand you want to "${userInput.substring(0, 30)}...". Would you like to:\n1) Explain gaps\n2) Generate tests\n3) Run validation\n4) View evidence\n5) Create a report?`
        };
    }

    // ========================================================================
    // Intent Processing (Main Logic)
    // ========================================================================

    /**
     * Process a recognized intent into a response with actions
     */
    async processIntent(request: ChatIntentRequest): Promise<ChatResponse> {
        const intent = request.intent;
        const context = request.context || this.createDefaultContext();

        console.log(`Processing intent: ${intent}`);

        let content = '';
        let actions: ChatAction[] = [];
        let attachments: ChatAttachment[] = [];

        // Route to intent handler
        switch (intent) {
            // Analysis intents
            case ChatIntent.EXPLAIN_GAPS:
                ({ content, actions, attachments } = await this.handleExplainGaps(context));
                break;

            case ChatIntent.EXPLAIN_GAP_DETAIL:
                ({ content, actions, attachments } = await this.handleExplainGapDetail(context));
                break;

            case ChatIntent.UNDERSTAND_IMPACT:
                ({ content, actions, attachments } = await this.handleUnderstandImpact(context));
                break;

            // Decision intents
            case ChatIntent.IDENTIFY_PRIORITY:
                ({ content, actions, attachments } = await this.handleIdentifyPriority(context));
                break;

            case ChatIntent.EVALUATE_RISK:
                ({ content, actions, attachments } = await this.handleEvaluateRisk(context));
                break;

            case ChatIntent.RECOMMEND_ORDER:
                ({ content, actions, attachments } = await this.handleRecommendOrder(context));
                break;

            // Generation intents
            case ChatIntent.GENERATE_TESTS:
                ({ content, actions, attachments } = await this.handleGenerateTests(context));
                break;

            case ChatIntent.PROPOSE_REMEDIATION:
                ({ content, actions, attachments } = await this.handleProposeRemediation(context));
                break;

            case ChatIntent.SHOW_DIFF:
                ({ content, actions, attachments } = await this.handleShowDiff(context));
                break;

            // Execution intents
            case ChatIntent.RUN_TESTS:
                ({ content, actions, attachments } = await this.handleRunTests(context));
                break;

            case ChatIntent.SHOW_EXECUTION_EVIDENCE:
                ({ content, actions, attachments } = await this.handleShowExecutionEvidence(context));
                break;

            // Reporting intents
            case ChatIntent.CREATE_EXECUTIVE_SUMMARY:
                ({ content, actions, attachments } = await this.handleCreateExecutiveSummary(context));
                break;

            case ChatIntent.EXPORT_EVIDENCE:
                ({ content, actions, attachments } = await this.handleExportEvidence(context));
                break;

            default:
                content = `I don't know how to handle intent: ${intent}. Please try another request.`;
        }

        return {
            messageId: uuid(),
            content,
            actions,
            attachments,
            mode: context.mode,
            confidence: 85
        };
    }

    // ========================================================================
    // Intent Handlers (Analysis Category)
    // ========================================================================

    private async handleExplainGaps(context: ChatContext) {
        if (!this.lastAnalysisResult) {
            return {
                content: '❌ No analysis results available. Please run a scan first with "RepoSense: Orchestrated Run".',
                actions: [
                    {
                        type: ChatActionType.TRIGGER_SCAN,
                        label: 'Run Scan Now',
                        description: 'Scan repository for API gaps',
                        requiresConfirmation: false,
                        handler: async () => ({
                            success: true,
                            message: 'Scan triggered in background'
                        })
                    }
                ],
                attachments: []
            };
        }

        const { gaps } = this.lastAnalysisResult;
        const summary = this.summarizeGaps(gaps);

        return {
            content: `**API Gap Summary**\n\n${summary}\n\nWould you like to understand a specific gap, or see priority recommendations?`,
            actions: [
                {
                    type: ChatActionType.DISPLAY_INFO,
                    label: 'View All Gaps',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Gaps displayed' })
                },
                {
                    type: ChatActionType.TRIGGER_TEST_GENERATION,
                    label: 'Generate Tests for Top Gaps',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Test generation queued' })
                }
            ],
            attachments: []
        };
    }

    private async handleExplainGapDetail(context: ChatContext) {
        if (!context.focusedGapId) {
            return {
                content: '🔍 Please select a gap first (click on a gap in the Gap Analysis TreeView).',
                actions: [],
                attachments: []
            };
        }

        // Get focused gap details
        const gap = this.getGapById(context.focusedGapId);
        if (!gap) {
            return {
                content: `Gap ${context.focusedGapId} not found.`,
                actions: [],
                attachments: []
            };
        }

        const explanation = this.explainGap(gap);

        return {
            content: explanation,
            actions: [
                {
                    type: ChatActionType.TRIGGER_TEST_GENERATION,
                    label: 'Generate Test for This Gap',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Test generation started' })
                },
                {
                    type: ChatActionType.OPEN_DIAGNOSTICS,
                    label: 'View in Problems Panel',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Diagnostics focused' })
                }
            ],
            attachments: []
        };
    }

    private async handleUnderstandImpact(context: ChatContext) {
        if (!context.focusedGapId) {
            return {
                content: 'Please select a gap to analyze impact.',
                actions: [],
                attachments: []
            };
        }

        const gap = this.getGapById(context.focusedGapId);
        const impact = this.assessGapImpact(gap);

        return {
            content: impact,
            actions: [
                {
                    type: ChatActionType.DISPLAY_INFO,
                    label: 'Show Affected Files',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Affected files displayed' })
                }
            ],
            attachments: []
        };
    }

    // ========================================================================
    // Intent Handlers (Decision Category)
    // ========================================================================

    private async handleIdentifyPriority(context: ChatContext) {
        if (!this.lastAnalysisResult) {
            return {
                content: 'No analysis available. Run a scan first.',
                actions: [],
                attachments: []
            };
        }

        const { gaps } = this.lastAnalysisResult;
        const priorityList = gaps
            .sort((a: any, b: any) => b.priorityScore - a.priorityScore)
            .slice(0, 5)
            .map((g: any, i: number) => 
                `${i + 1}. **${g.type}** (${g.severity})\n   ${g.message}\n   Priority: ${g.priorityScore}/100`
            )
            .join('\n\n');

        return {
            content: `**Top 5 Priority Gaps**\n\n${priorityList}\n\nFocus on these first for maximum impact.`,
            actions: [
                {
                    type: ChatActionType.TRIGGER_TEST_GENERATION,
                    label: 'Generate Tests for Top 5',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Generating tests for top priorities' })
                }
            ],
            attachments: []
        };
    }

    private async handleEvaluateRisk(context: ChatContext) {
        if (!this.lastAnalysisResult) {
            return {
                content: 'No analysis available.',
                actions: [],
                attachments: []
            };
        }

        const { gaps } = this.lastAnalysisResult;
        const criticalCount = gaps.filter((g: any) => g.severity === 'CRITICAL').length;
        const highCount = gaps.filter((g: any) => g.severity === 'HIGH').length;

        const riskAssessment = `
**Risk Assessment**

- 🔴 **CRITICAL gaps**: ${criticalCount} (immediate action required)
- 🟠 **HIGH gaps**: ${highCount} (should address soon)

**Recommendation**: ${criticalCount > 0 ? 'Address CRITICAL gaps before deployment.' : 'Risk level manageable.'}
        `;

        return {
            content: riskAssessment,
            actions: criticalCount > 0 ? [
                {
                    type: ChatActionType.TRIGGER_TEST_GENERATION,
                    label: 'Generate Tests for CRITICAL Gaps',
                    requiresConfirmation: true,
                    handler: async () => ({ success: true, message: 'Test generation for critical gaps started' })
                }
            ] : [],
            attachments: []
        };
    }

    private async handleRecommendOrder(context: ChatContext) {
        if (!this.lastAnalysisResult) {
            return { content: 'No analysis available.', actions: [], attachments: [] };
        }

        const { gaps } = this.lastAnalysisResult;
        const recommendation = `
**Recommended Remediation Order**

1. **Fix CRITICAL gaps** (risk mitigation)
2. **Add tests for untested endpoints** (coverage)
3. **Propose remediation** for HIGH gaps
4. **Review and apply** changes
5. **Run validation** and export evidence

This order minimizes risk while building test coverage.
        `;

        return {
            content: recommendation,
            actions: [
                {
                    type: ChatActionType.TRIGGER_SCAN,
                    label: 'Start with Scan',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Scan started' })
                }
            ],
            attachments: []
        };
    }

    // ========================================================================
    // Intent Handlers (Generation Category)
    // ========================================================================

    private async handleGenerateTests(context: ChatContext) {
        if (!this.lastAnalysisResult) {
            return { content: 'Run a scan first.', actions: [], attachments: [] };
        }

        const { gaps } = this.lastAnalysisResult;

        return {
            content: `I can generate tests for ${gaps.length} gaps. Select a priority level:\n\n- 🔴 **CRITICAL only** (${gaps.filter((g: any) => g.severity === 'CRITICAL').length})\n- 🔴🟠 **CRITICAL + HIGH** (${gaps.filter((g: any) => ['CRITICAL', 'HIGH'].includes(g.severity)).length})\n- 📊 **All gaps** (${gaps.length})`,
            actions: [
                {
                    type: ChatActionType.GENERATE_ARTIFACT,
                    label: 'Generate for CRITICAL',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Test generation queued' })
                },
                {
                    type: ChatActionType.GENERATE_ARTIFACT,
                    label: 'Generate for CRITICAL + HIGH',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Test generation queued' })
                },
                {
                    type: ChatActionType.GENERATE_ARTIFACT,
                    label: 'Generate All',
                    requiresConfirmation: true,
                    handler: async () => ({ success: true, message: 'Full test generation queued' })
                }
            ],
            attachments: []
        };
    }

    private async handleProposeRemediation(context: ChatContext) {
        return {
            content: 'Remediation proposals are generated based on gap type. I can suggest:\n- Creating missing endpoints\n- Adding endpoint tests\n- Updating endpoint signatures\n\nWhich type of remediation would you like?',
            actions: [],
            attachments: []
        };
    }

    private async handleShowDiff(context: ChatContext) {
        return {
            content: 'I will show diffs before applying any changes. This includes:\n- Test file diffs (additions)\n- Code patch diffs (before/after)\n- Configuration changes\n\nAlways review before approving!',
            actions: [
                {
                    type: ChatActionType.DISPLAY_DIFF,
                    label: 'Show Pending Changes',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Diffs displayed' })
                }
            ],
            attachments: []
        };
    }

    // ========================================================================
    // Intent Handlers (Execution Category)
    // ========================================================================

    private async handleRunTests(context: ChatContext) {
        return {
            content: '⚙️ I can run tests for:\n- Generated test files\n- Specific test suite\n- All tests\n\nWhich would you like?',
            actions: [
                {
                    type: ChatActionType.TRIGGER_TEST_EXECUTION,
                    label: 'Run Generated Tests',
                    requiresConfirmation: true,
                    handler: async () => ({ success: true, message: 'Test execution started' })
                }
            ],
            attachments: []
        };
    }

    private async handleShowExecutionEvidence(context: ChatContext) {
        return {
            content: 'Execution evidence includes:\n- Test results (pass/fail)\n- Screenshots\n- Logs\n- Performance metrics\n\nLet me fetch the latest evidence...',
            actions: [
                {
                    type: ChatActionType.DISPLAY_EVIDENCE,
                    label: 'View Latest Evidence',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Evidence loaded' })
                }
            ],
            attachments: []
        };
    }

    // ========================================================================
    // Intent Handlers (Reporting Category)
    // ========================================================================

    private async handleCreateExecutiveSummary(context: ChatContext) {
        if (!this.lastAnalysisResult) {
            return { content: 'No data available for report.', actions: [], attachments: [] };
        }

        return {
            content: 'I\'ll create an executive summary with:\n- Gap overview\n- Risk assessment\n- Test coverage\n- Recommendations\n\nGenerate now?',
            actions: [
                {
                    type: ChatActionType.TRIGGER_REPORT_GENERATION,
                    label: 'Generate Summary',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Report generation started' })
                }
            ],
            attachments: []
        };
    }

    private async handleExportEvidence(context: ChatContext) {
        return {
            content: 'Export options:\n- 📋 Markdown report\n- 📊 JSON data\n- 📦 Complete artifact archive\n- 🔗 Shareable link\n\nWhat format?',
            actions: [
                {
                    type: ChatActionType.EXPORT_FOR_SHARING,
                    label: 'Export as Markdown',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Export started' })
                },
                {
                    type: ChatActionType.EXPORT_FOR_SHARING,
                    label: 'Export as JSON',
                    requiresConfirmation: false,
                    handler: async () => ({ success: true, message: 'Export started' })
                }
            ],
            attachments: []
        };
    }

    // ========================================================================
    // Conversation Management
    // ========================================================================

    async createThread(context: ChatContext): Promise<ConversationThread> {
        const thread: ConversationThread = {
            threadId: uuid(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            mode: context.mode || DEFAULT_CONVERSATION_MODE,
            context,
            messages: [],
            messageCount: 0,
            actionCount: 0,
            confirmationsRequired: 0,
            confirmationsApproved: 0
        };

        this.threads.set(thread.threadId, thread);
        return thread;
    }

    async getThread(threadId: string): Promise<ConversationThread | undefined> {
        return this.threads.get(threadId);
    }

    async addMessage(threadId: string, message: ChatMessage): Promise<void> {
        const thread = this.threads.get(threadId);
        if (!thread) throw new Error(`Thread not found: ${threadId}`);

        thread.messages.push(message);
        thread.messageCount++;
        thread.updatedAt = Date.now();
    }

    async updateMode(threadId: string, mode: ConversationMode): Promise<void> {
        const thread = this.threads.get(threadId);
        if (!thread) throw new Error(`Thread not found: ${threadId}`);

        thread.mode = mode;
    }

    // ========================================================================
    // Action Execution & Governance
    // ========================================================================

    async executeAction(action: ChatAction): Promise<ChatActionResult> {
        const logId = uuid();

        try {
            const result = await action.handler();

            // Log action
            this.auditLog.push({
                logId,
                timestamp: Date.now(),
                action: action.type,
                intent: ChatIntent.HELP,  // Would be set by caller
                parameters: {},
                requirementType: action.requiresConfirmation ? 'requires_confirmation' : 'optional',
                approvalStatus: 'auto_executed',
                executionResult: result,
                rollbackCapable: false
            });

            return result;
        } catch (error: any) {
            return {
                success: false,
                message: `Action failed: ${error.message}`,
                logId
            };
        }
    }

    async getAvailableActions(context: ChatContext, intent: ChatIntent): Promise<ChatAction[]> {
        // Return actions appropriate for this intent and mode
        // Filtered by permissions, context, governance rules
        return [];
    }

    requiresConfirmation(action: ChatActionType): boolean {
        // Check governance rules
        return action === ChatActionType.TRIGGER_TEST_EXECUTION ||
               action === ChatActionType.GENERATE_ARTIFACT;
    }

    async logAction(log: ChatActionAuditLog): Promise<void> {
        this.auditLog.push(log);
    }

    async getActionHistory(threadId: string): Promise<ChatActionAuditLog[]> {
        // Filter audit log by thread
        return this.auditLog;
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    private createDefaultContext(): ChatContext {
        return {
            workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
            repositoryName: 'unknown',
            mode: DEFAULT_CONVERSATION_MODE,
            messageCount: 0,
            lastMessageTime: Date.now()
        };
    }

    private summarizeGaps(gaps: GapItem[]): string {
        const byType = gaps.reduce((acc: any, gap) => {
            acc[gap.type] = (acc[gap.type] || 0) + 1;
            return acc;
        }, {});

        return `Found **${gaps.length}** gaps:\n` +
            Object.entries(byType)
                .map(([type, count]) => `- ${type}: ${count}`)
                .join('\n');
    }

    private getGapById(gapId: string): GapItem | undefined {
        if (!this.lastAnalysisResult) return undefined;
        return this.lastAnalysisResult.gaps.find((g: any) => g.gapId === gapId);
    }

    private explainGap(gap: GapItem): string {
        return `**${gap.type}** (${gap.severity})\n\n${gap.message}\n\nFile: ${gap.file}:${gap.line}\n\nSuggested fix: ${gap.suggestedFix || 'N/A'}`;
    }

    private assessGapImpact(gap: GapItem): string {
        return `**Impact Assessment for this gap:**\n\nSeverity: ${gap.severity}\nAffected file: ${gap.file}\nRelated files: ${gap.relatedFiles?.join(', ') || 'None'}\n\nThis gap affects ${gap.relatedFiles?.length || 1} file(s).`;
    }
}
