/**
 * ChatBot.ts
 *
 * Type contracts for the Intent-Driven Orchestration Assistant.
 * Defines the conversation engine's core data structures.
 */

// ============================================================================
// Intent System (First-class intents, not free text)
// ============================================================================

export enum ChatIntentCategory {
    ANALYSIS = 'analysis',           // Understanding repo state & gaps
    DECISION = 'decision',           // Planning & prioritization
    GENERATION = 'generation',       // Test/remediation creation
    EXECUTION = 'execution',         // Task running & validation
    REPORTING = 'reporting'          // Evidence & compliance
}

export enum ChatIntent {
    // Analysis
    EXPLAIN_GAPS = 'explain_gaps',
    EXPLAIN_GAP_DETAIL = 'explain_gap_detail',
    EXPLAIN_ENDPOINT_USAGE = 'explain_endpoint_usage',
    UNDERSTAND_IMPACT = 'understand_impact',

    // Decision
    IDENTIFY_PRIORITY = 'identify_priority',
    ASSESS_CRITICALITY = 'assess_criticality',
    EVALUATE_RISK = 'evaluate_risk',
    RECOMMEND_ORDER = 'recommend_order',

    // Generation
    GENERATE_TESTS = 'generate_tests',
    GENERATE_TESTS_SPECIFIC = 'generate_tests_specific',
    PROPOSE_REMEDIATION = 'propose_remediation',
    SHOW_DIFF = 'show_diff',

    // Execution
    RUN_TESTS = 'run_tests',
    RUN_VALIDATION = 'run_validation',
    RERUN_WITH_DEBUG = 'rerun_with_debug',
    SHOW_EXECUTION_EVIDENCE = 'show_execution_evidence',

    // Reporting
    GENERATE_UAT_REPORT = 'generate_uat_report',
    EXPORT_EVIDENCE = 'export_evidence',
    CREATE_EXECUTIVE_SUMMARY = 'create_executive_summary',
    SHOW_COVERAGE_DELTA = 'show_coverage_delta',

    // Meta
    HELP = 'help',
    CLARIFY = 'clarify'
}

export interface ChatIntentRequest {
    intent: ChatIntent;
    context?: ChatContext;
    parameters?: Record<string, any>;
    confirmationRequired?: boolean;
}

// ============================================================================
// Conversation Modes (Explicit behavior switching)
// ============================================================================

export enum ConversationMode {
    EXPLAIN = 'explain',             // Read-only, narrative
    PLAN = 'plan',                   // Propose steps, ask confirmation
    GENERATE = 'generate',           // Create artifacts
    EXECUTE = 'execute',             // Run tasks
    AUDIT = 'audit'                  // Compliance & evidence
}

export interface ConversationModeConfig {
    mode: ConversationMode;
    allowActions: boolean;
    requireConfirmation: boolean;
    logLevel: 'debug' | 'info' | 'warn';
    constraints: Record<string, any>;
}

// ============================================================================
// Chat Context (What the chatbot knows about current state)
// ============================================================================

export interface ChatContext {
    // Repo state
    workspaceRoot: string;
    repositoryName: string;

    // Analysis state
    lastScanTime?: number;
    lastAnalysisResult?: any;           // AnalysisArtifact
    lastRunId?: string;

    // Selected/focused entity
    focusedGapId?: string;              // If user clicked a gap
    focusedEndpointId?: string;
    focusedFile?: string;
    focusedLine?: number;

    // User context
    userRole?: 'developer' | 'qa' | 'lead' | 'architect';
    mode: ConversationMode;

    // Conversation history
    messageCount: number;
    lastMessageTime: number;
}

// ============================================================================
// Chat Actions (What the chatbot can do)
// ============================================================================

export enum ChatActionType {
    // Read-only
    DISPLAY_INFO = 'display_info',
    DISPLAY_DIFF = 'display_diff',
    DISPLAY_EVIDENCE = 'display_evidence',

    // Generation
    GENERATE_ARTIFACT = 'generate_artifact',
    SHOW_DIFF_BEFORE_APPLY = 'show_diff_before_apply',

    // Execution
    TRIGGER_SCAN = 'trigger_scan',
    TRIGGER_TEST_GENERATION = 'trigger_test_generation',
    TRIGGER_TEST_EXECUTION = 'trigger_test_execution',
    TRIGGER_REPORT_GENERATION = 'trigger_report_generation',

    // Navigation
    OPEN_FILE = 'open_file',
    OPEN_DIAGNOSTICS = 'open_diagnostics',
    OPEN_TREEVIEW = 'open_treeview',

    // Collaboration
    EXPORT_FOR_SHARING = 'export_for_sharing',
    GENERATE_TICKET = 'generate_ticket'
}

export interface ChatAction {
    type: ChatActionType;
    label: string;
    description?: string;
    icon?: string;
    requiresConfirmation: boolean;
    handler: () => Promise<ChatActionResult>;
    disabled?: boolean;
    disabledReason?: string;
}

export interface ChatActionResult {
    success: boolean;
    data?: any;
    message: string;
    evidence?: string;  // Artifact path or URL
    logId?: string;     // For audit trail
}

// ============================================================================
// Chat Message Structure
// ============================================================================

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system'
}

export interface ChatMessage {
    messageId: string;
    role: ChatMessageRole;
    timestamp: number;
    content: string;

    // Metadata
    intent?: ChatIntent;
    context?: Partial<ChatContext>;
    mode?: ConversationMode;

    // Associated actions
    actions?: ChatAction[];
    attachments?: ChatAttachment[];

    // Execution tracking
    executedActions?: {
        actionType: ChatActionType;
        result: ChatActionResult;
        timestamp: number;
    }[];
}

export interface ChatAttachment {
    type: 'code' | 'diff' | 'report' | 'log' | 'screenshot';
    content: string;
    language?: string;
    path?: string;
    size?: number;
}

// ============================================================================
// Conversation Thread
// ============================================================================

export interface ConversationThread {
    threadId: string;
    createdAt: number;
    updatedAt: number;
    mode: ConversationMode;
    context: ChatContext;
    messages: ChatMessage[];
    title?: string;
    summary?: string;

    // Stats
    messageCount: number;
    actionCount: number;
    confirmationsRequired: number;
    confirmationsApproved: number;
}

// ============================================================================
// Intent Analysis (How the system understands user input)
// ============================================================================

export interface IntentAnalysis {
    recognizedIntent: ChatIntent;
    confidence: number;              // 0-100
    category: ChatIntentCategory;
    alternatives?: {
        intent: ChatIntent;
        confidence: number;
    }[];
    extractedEntities?: {
        type: 'gap' | 'endpoint' | 'file' | 'framework';
        value: string;
        confidence: number;
    }[];
    requiresClarification: boolean;
    clarificationQuestion?: string;
}

// ============================================================================
// Response Builder (What the assistant generates)
// ============================================================================

export interface ChatResponse {
    messageId: string;
    content: string;
    actions: ChatAction[];
    attachments?: ChatAttachment[];
    mode: ConversationMode;
    suggestedNextIntent?: ChatIntent;
    confidence: number;              // 0-100 how confident in this response
}

// ============================================================================
// Governance & Audit
// ============================================================================

export interface ChatActionAuditLog {
    logId: string;
    timestamp: number;
    userId?: string;
    action: ChatActionType;
    intent: ChatIntent;
    parameters: Record<string, any>;
    requirementType: 'optional' | 'requires_confirmation' | 'requires_review';
    approvalStatus: 'pending' | 'approved' | 'rejected' | 'auto_executed';
    executionResult?: ChatActionResult;
    rollbackCapable: boolean;
    evidence?: string;               // Path to artifacts
}

export interface ConversationGovernance {
    allowedIntents: ChatIntent[];
    allowedModes: ConversationMode[];
    requireConfirmationFor: ChatActionType[];
    auditAllActions: boolean;
    logRetentionDays: number;
    maxConcurrentActions: number;
}

// ============================================================================
// ChatBot Service Interface
// ============================================================================

export interface IChatBotService {
    // Intent processing
    analyzeIntent(userInput: string, context: ChatContext): Promise<IntentAnalysis>;
    processIntent(request: ChatIntentRequest): Promise<ChatResponse>;

    // Conversation management
    createThread(context: ChatContext): Promise<ConversationThread>;
    getThread(threadId: string): Promise<ConversationThread | undefined>;
    addMessage(threadId: string, message: ChatMessage): Promise<void>;
    updateMode(threadId: string, mode: ConversationMode): Promise<void>;

    // Action execution
    executeAction(action: ChatAction): Promise<ChatActionResult>;
    getAvailableActions(context: ChatContext, intent: ChatIntent): Promise<ChatAction[]>;

    // Governance
    requiresConfirmation(action: ChatActionType): boolean;
    logAction(log: ChatActionAuditLog): Promise<void>;
    getActionHistory(threadId: string): Promise<ChatActionAuditLog[]>;
}

// ============================================================================
// Contextual Invocation
// ============================================================================

export interface ContextualInvocationSource {
    type: 'right_click' | 'tree_button' | 'command_palette' | 'inline_action' | 'status_bar';
    selectedText?: string;
    focusedElement?: {
        type: 'gap' | 'endpoint' | 'file' | 'diagnostic';
        id: string;
        data: any;
    };
}

export interface PreSeededChat {
    initialMessage: string;
    suggestedIntent: ChatIntent;
    context: Partial<ChatContext>;
    prefilledActions?: ChatAction[];
}

// ============================================================================
// Defaults & Constants
// ============================================================================

export const DEFAULT_CONVERSATION_MODE = ConversationMode.PLAN;

export const INTENT_TO_CONFIRMATION_REQUIRED: Record<ChatIntent, boolean> = {
    [ChatIntent.EXPLAIN_GAPS]: false,
    [ChatIntent.EXPLAIN_GAP_DETAIL]: false,
    [ChatIntent.EXPLAIN_ENDPOINT_USAGE]: false,
    [ChatIntent.UNDERSTAND_IMPACT]: false,

    [ChatIntent.IDENTIFY_PRIORITY]: false,
    [ChatIntent.ASSESS_CRITICALITY]: false,
    [ChatIntent.EVALUATE_RISK]: false,
    [ChatIntent.RECOMMEND_ORDER]: false,

    [ChatIntent.GENERATE_TESTS]: false,
    [ChatIntent.GENERATE_TESTS_SPECIFIC]: false,
    [ChatIntent.PROPOSE_REMEDIATION]: false,
    [ChatIntent.SHOW_DIFF]: false,

    [ChatIntent.RUN_TESTS]: true,
    [ChatIntent.RUN_VALIDATION]: true,
    [ChatIntent.RERUN_WITH_DEBUG]: true,
    [ChatIntent.SHOW_EXECUTION_EVIDENCE]: false,

    [ChatIntent.GENERATE_UAT_REPORT]: false,
    [ChatIntent.EXPORT_EVIDENCE]: false,
    [ChatIntent.CREATE_EXECUTIVE_SUMMARY]: false,
    [ChatIntent.SHOW_COVERAGE_DELTA]: false,

    [ChatIntent.HELP]: false,
    [ChatIntent.CLARIFY]: false
};
