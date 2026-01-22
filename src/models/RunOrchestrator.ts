/**
 * RunOrchestrator.ts
 * 
 * Comprehensive type contracts for the unified RepoSense run lifecycle.
 * Bridges: scan → plan → generate → apply → execute → evidence → report
 */

// ============================================================================
// Run State Machine
// ============================================================================

export enum RunState {
    IDLE = 'IDLE',
    SCANNING = 'SCANNING',
    PLANNING = 'PLANNING',
    GENERATING = 'GENERATING',
    APPLYING = 'APPLYING',
    EXECUTING = 'EXECUTING',
    REPORTING = 'REPORTING',
    DONE = 'DONE',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

export interface RunStateTransition {
    from: RunState;
    to: RunState;
    timestamp: number;
    details?: Record<string, any>;
}

// ============================================================================
// Run Context & Execution
// ============================================================================

export interface RunContext {
    runId: string;  // stable UUID for entire execution
    workspaceRoot: string;
    state: RunState;
    startTime: number;
    endTime?: number;
    duration?: number;
    
    // Config
    config: RunConfig;
    
    // Tracking
    stateHistory: RunStateTransition[];
    errors: RunError[];
    
    // Results at each stage
    analysisResult?: AnalysisArtifact;
    generatedTestPlans?: TestPlan[];
    appliedPatches?: PatchApplication[];
    executionResults?: ExecutionResult[];
    reportArtifact?: ReportArtifact;
}

export interface RunConfig {
    generateTests: boolean;
    autoApply: boolean;
    runTests: boolean;
    captureScreenshots: boolean;
    captureVideo: boolean;
    frameworks: TestFramework[];
    timeoutMs: number;
}

// ============================================================================
// Gap & Priority Model
// ============================================================================

export enum GapType {
    MISSING_ENDPOINT = 'missing_endpoint',           // frontend calls, backend has no match
    UNUSED_ENDPOINT = 'unused_endpoint',             // backend defined, never called
    UNTESTED_ENDPOINT = 'untested_endpoint',         // endpoint exists, no test coverage
    TYPE_MISMATCH = 'type_mismatch',                 // endpoint signature doesn't match calls
    MISSING_CRUD = 'missing_crud',                   // CRUD pattern incomplete
    ORPHANED_COMPONENT = 'orphaned_component',       // component without matching endpoints
    SUGGESTION = 'suggestion'                        // generic suggestion
}

export enum GapSeverity {
    CRITICAL = 'CRITICAL',
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

export interface GapItem extends GapItemBase {
    // Added in RunOrchestrator phase:
    gapId: string;                                   // stable hash: hash(type + path + file + line + method)
    priorityScore: number;                           // 0-100: computed from severity + frequency + blastRadius
    blastRadius: number;                             // # of files affected
    frequency: number;                               // # of times this gap was detected / occurs
    lastDetected: number;                            // timestamp of last scan
    status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'GENERATED' | 'APPLIED' | 'FIXED' | 'IGNORED';
    assignedTo?: string;
    linkedTests?: string[];                          // test IDs generated for this gap
    linkedPatches?: string[];                        // patch IDs applied for this gap
    linkedExecutions?: string[];                     // execution IDs that validated this
}

export interface GapItemBase {
    type: GapType;
    severity: GapSeverity;
    message: string;
    file: string;
    line: number;
    suggestedFix?: string;
    relatedFiles?: string[];
}

// ============================================================================
// Analysis Artifact (post-detection)
// ============================================================================

export interface AnalysisArtifact {
    analysisId: string;                             // unique per scan
    timestamp: number;
    workspaceRoot: string;
    
    // Core analysis
    gaps: GapItem[];
    apiCalls: APICall[];
    endpoints: Endpoint[];
    
    // Coverage info (if available)
    testFiles?: TestFile[];
    coverageMatrix?: EndpointCoverageMatrix;
    
    // Summary stats
    summary: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        byType: Record<GapType, number>;
        coverage: {
            testedEndpoints: number;
            untestedEndpoints: number;
            coveragePercent: number;
        };
    };
}

export interface APICall {
    callId: string;                                  // stable hash
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
    file: string;
    line: number;
    component?: string;
    isNormalized: boolean;                          // true if path was normalized
    originalEndpoint?: string;
}

export interface Endpoint {
    endpointId: string;                             // stable hash
    path: string;
    method: string;
    file: string;
    line: number;
    handler: string;
    framework?: string;                             // NestJS, Express, FastAPI, etc.
    isNormalized: boolean;
    originalPath?: string;
}

export interface TestFile {
    testId: string;
    path: string;
    framework: TestFramework;
    testedEndpoints: string[];                      // list of endpoint paths/methods covered
    testCases: TestCase[];
}

export interface TestCase {
    caseId: string;
    name: string;
    endpoints: string[];                            // which endpoints does this test exercise
    assertions: number;
}

export interface EndpointCoverageMatrix {
    // Maps endpoint → test coverage info
    [endpointKey: string]: {
        tested: boolean;
        testIds: string[];
        coverage: number;  // 0-100
    };
}

// ============================================================================
// Generation Phase
// ============================================================================

export interface TestPlan {
    planId: string;
    gapId: string;
    gap: GapItem;
    endpoint: Endpoint;
    suggestedTestFramework: TestFramework;
    testCandidates: TestCandidate[];
    priority: number;
    estimatedCost: number;  // lines of code
}

export interface TestCandidate {
    candidateId: string;
    testCode: string;
    assertions: number;
    framework: TestFramework;
    suggestedPath: string;
    confidence: number;  // 0-100 from LLM
}

export interface RemediationPlan {
    remediationId: string;
    gapId: string;
    gap: GapItem;
    suggestedPatches: CodePatch[];
    priority: number;
}

export interface CodePatch {
    patchId: string;
    file: string;
    startLine: number;
    endLine: number;
    originalCode: string;
    suggestedCode: string;
    explanation: string;
    confidence: number;  // 0-100 from LLM
}

// ============================================================================
// Application Phase
// ============================================================================

export interface PatchApplication {
    applicationId: string;
    patchId: string;
    timestamp: number;
    status: 'PENDING' | 'APPLIED' | 'FAILED' | 'REVERTED';
    error?: string;
    affectedLines: {
        before: string[];
        after: string[];
    };
}

// ============================================================================
// Execution Phase
// ============================================================================

export enum TestFramework {
    PLAYWRIGHT = 'playwright',
    CYPRESS = 'cypress',
    JEST = 'jest',
    MOCHA = 'mocha',
    PYTEST = 'pytest',
    VITEST = 'vitest'
}

export interface ExecutionResult {
    executionId: string;
    timestamp: number;
    framework: TestFramework;
    
    // Command & environment
    command: string;
    workingDirectory: string;
    env: Record<string, string>;
    
    // Execution
    startTime: number;
    endTime: number;
    durationMs: number;
    exitCode: number;
    status: 'PASSED' | 'FAILED' | 'TIMEOUT' | 'ERROR';
    
    // Output capture
    stdout: string;
    stderr: string;
    
    // Results (parsed)
    results: {
        totalTests: number;
        passed: number;
        failed: number;
        skipped: number;
    };
    
    // Linked tests
    testRuns: TestRunResult[];
    
    // Artifacts
    artifacts: ExecutionArtifact[];
}

export interface TestRunResult {
    testName: string;
    status: 'PASSED' | 'FAILED' | 'SKIPPED';
    durationMs: number;
    error?: string;
    assertions?: {
        total: number;
        passed: number;
        failed: number;
    };
}

export interface ExecutionArtifact {
    type: 'screenshot' | 'video' | 'log' | 'report' | 'trace';
    path: string;                                   // relative to artifact store
    mimeType: string;
    sizeBytes: number;
    timestamp: number;
}

// ============================================================================
// Report Artifact
// ============================================================================

export interface ReportArtifact {
    reportId: string;
    runId: string;
    generatedAt: number;
    
    // Overview
    title: string;
    summary: string;
    
    // Linked artifacts
    analysis: AnalysisArtifact;
    testPlans: TestPlan[];
    patches: PatchApplication[];
    executions: ExecutionResult[];
    
    // Timeline
    timeline: ReportTimelineEntry[];
    
    // Metrics
    metrics: ReportMetrics;
    
    // Export formats
    markdownContent: string;
    htmlContent?: string;
    jsonContent: any;
}

export interface ReportTimelineEntry {
    timestamp: number;
    state: RunState;
    message: string;
    icon: string;
    details?: any;
}

export interface ReportMetrics {
    totalGapsDetected: number;
    gapsByCriticalityCount: Record<GapSeverity, number>;
    gapsByTypeCount: Record<GapType, number>;
    testsGenerated: number;
    testsApplied: number;
    patchesGenerated: number;
    patchesApplied: number;
    executionsPassed: number;
    executionsFailed: number;
    coverage: number;  // percent
    duration: number;  // ms
}

// ============================================================================
// Error Handling
// ============================================================================

export interface RunError {
    errorId: string;
    timestamp: number;
    severity: 'WARNING' | 'ERROR' | 'FATAL';
    stage: RunState;
    message: string;
    stack?: string;
    context?: Record<string, any>;
}

// ============================================================================
// Event Bus
// ============================================================================

export type RunEventType =
    | 'run:created'
    | 'run:state-changed'
    | 'run:error'
    | 'scan:started'
    | 'scan:complete'
    | 'planning:started'
    | 'planning:complete'
    | 'generation:started'
    | 'generation:progress'
    | 'generation:complete'
    | 'apply:started'
    | 'apply:progress'
    | 'apply:complete'
    | 'execution:started'
    | 'execution:progress'
    | 'execution:complete'
    | 'report:generated'
    | 'run:complete';

export interface RunEvent {
    eventId: string;
    type: RunEventType;
    runId: string;
    timestamp: number;
    data: any;
}

export interface EventBus {
    on(event: RunEventType, handler: (evt: RunEvent) => void): void;
    off(event: RunEventType, handler: (evt: RunEvent) => void): void;
    emit(type: RunEventType, runId: string, data: any): void;
}

// ============================================================================
// Artifact Store (file system contract)
// ============================================================================

export interface ArtifactStoreLayout {
    // .reposense/
    //   runs/
    //     <runId>/
    //       scan.json                 // AnalysisArtifact
    //       plan.json                 // TestPlan[], RemediationPlan[]
    //       applied-patches.json      // PatchApplication[]
    //       execution-results.json    // ExecutionResult[]
    //       report.md                 // markdown
    //       report.html               // html
    //       report.json               // json export
    //       generated-tests/
    //         <framework>/
    //           <testFile.ext>
    //       screenshots/
    //         <executionId>-<timestamp>.png
    //       videos/
    //         <executionId>-<timestamp>.webm
    //       logs/
    //         execution-<executionId>.log
    
    rootDir: string;  // .reposense
    runDir: string;   // .reposense/runs/<runId>
    generatedTestsDir: string;
    screenshotsDir: string;
    videosDir: string;
    logsDir: string;
}

export interface ArtifactStore {
    initialize(runId: string): Promise<void>;
    saveAnalysis(artifact: AnalysisArtifact): Promise<void>;
    savePlans(plans: (TestPlan | RemediationPlan)[]): Promise<void>;
    savePatchApplications(applications: PatchApplication[]): Promise<void>;
    saveExecutionResults(results: ExecutionResult[]): Promise<void>;
    saveReport(report: ReportArtifact): Promise<void>;
    saveScreenshot(executionId: string, buffer: Buffer): Promise<string>;
    saveVideo(executionId: string, filePath: string): Promise<string>;
    saveLog(executionId: string, content: string): Promise<string>;
    getRunArtifacts(): Promise<ArtifactStoreLayout>;
}

// ============================================================================
// Orchestrator Interface
// ============================================================================

export interface IRunOrchestrator {
    // Lifecycle
    createRun(workspaceRoot: string, config: RunConfig): Promise<RunContext>;
    getRun(runId: string): RunContext | undefined;
    
    // State transitions
    transitionTo(runId: string, newState: RunState): Promise<void>;
    getCurrentState(runId: string): RunState;
    
    // Execution
    executeRun(runId: string): Promise<RunContext>;
    cancelRun(runId: string): Promise<void>;
    
    // Events
    on(event: RunEventType, handler: (evt: RunEvent) => void): void;
    off(event: RunEventType, handler: (evt: RunEvent) => void): void;
    
    // Results
    getRunResults(runId: string): Promise<RunContext | undefined>;
    getRunReport(runId: string): Promise<ReportArtifact | undefined>;
}
