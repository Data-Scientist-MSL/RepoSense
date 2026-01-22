/**
 * RunOrchestrator.ts (Implementation)
 * 
 * Core state machine that governs the entire RepoSense execution lifecycle.
 * Manages transitions, event emission, artifact persistence, and error recovery.
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import {
    IRunOrchestrator,
    RunContext,
    RunState,
    RunStateTransition,
    RunConfig,
    RunEvent,
    RunEventType,
    EventBus,
    RunError,
    AnalysisArtifact,
    TestPlan,
    PatchApplication,
    ExecutionResult,
    ReportArtifact,
    GapItem
} from '../models/RunOrchestrator';
import { ArtifactWriter } from './run/ArtifactWriter';

const VALID_TRANSITIONS: Record<RunState, RunState[]> = {
    [RunState.IDLE]: [RunState.SCANNING, RunState.CANCELLED],
    [RunState.SCANNING]: [RunState.PLANNING, RunState.FAILED, RunState.CANCELLED],
    [RunState.PLANNING]: [RunState.GENERATING, RunState.FAILED, RunState.CANCELLED],
    [RunState.GENERATING]: [RunState.APPLYING, RunState.FAILED, RunState.CANCELLED],
    [RunState.APPLYING]: [RunState.EXECUTING, RunState.FAILED, RunState.CANCELLED],
    [RunState.EXECUTING]: [RunState.REPORTING, RunState.FAILED, RunState.CANCELLED],
    [RunState.REPORTING]: [RunState.DONE, RunState.FAILED, RunState.CANCELLED],
    [RunState.DONE]: [],
    [RunState.FAILED]: [RunState.SCANNING],  // allow retry from IDLE
    [RunState.CANCELLED]: [RunState.SCANNING]  // allow retry from IDLE
};

/**
 * Central event bus for run lifecycle events
 */
class SimpleEventBus implements EventBus {
    private emitter = new EventEmitter();

    on(event: RunEventType, handler: (evt: RunEvent) => void): void {
        this.emitter.on(event, handler);
    }

    off(event: RunEventType, handler: (evt: RunEvent) => void): void {
        this.emitter.off(event, handler);
    }

    emit(type: RunEventType, runId: string, data: any): void {
        const event: RunEvent = {
            eventId: uuid(),
            type,
            runId,
            timestamp: Date.now(),
            data
        };
        this.emitter.emit(type, event);
    }
}

/**
 * RunOrchestrator: manages complete execution lifecycle
 */
export class RunOrchestrator implements IRunOrchestrator {
    private runs: Map<string, RunContext> = new Map();
    private eventBus: SimpleEventBus = new SimpleEventBus();
    private artifactRoot: string;

    constructor(artifactRoot: string = '.reposense') {
        this.artifactRoot = artifactRoot;
    }

    // ========================================================================
    // Lifecycle Management
    // ========================================================================

    async createRun(workspaceRoot: string, config: RunConfig): Promise<RunContext> {
        const runId = uuid();
        const now = Date.now();

        const runContext: RunContext = {
            runId,
            workspaceRoot,
            state: RunState.IDLE,
            startTime: now,
            config,
            stateHistory: [
                {
                    from: RunState.IDLE,
                    to: RunState.IDLE,
                    timestamp: now
                }
            ],
            errors: []
        };

        this.runs.set(runId, runContext);
        await this.ensureArtifactDirectory(runId);

        this.eventBus.emit('run:created', runId, { runId, config });

        return runContext;
    }

    getRun(runId: string): RunContext | undefined {
        return this.runs.get(runId);
    }

    // ========================================================================
    // State Management
    // ========================================================================

    async transitionTo(runId: string, newState: RunState): Promise<void> {
        const run = this.getRun(runId);
        if (!run) {
            throw new Error(`Run not found: ${runId}`);
        }

        const currentState = run.state;
        const allowedNextStates = VALID_TRANSITIONS[currentState];

        if (!allowedNextStates.includes(newState)) {
            throw new Error(
                `Invalid state transition: ${currentState} → ${newState}. Allowed: ${allowedNextStates.join(', ')}`
            );
        }

        const transition: RunStateTransition = {
            from: currentState,
            to: newState,
            timestamp: Date.now()
        };

        run.state = newState;
        run.stateHistory.push(transition);

        this.eventBus.emit('run:state-changed', runId, {
            from: currentState,
            to: newState,
            timestamp: transition.timestamp
        });
    }

    getCurrentState(runId: string): RunState {
        return this.getRun(runId)?.state ?? RunState.IDLE;
    }

    // ========================================================================
    // Execution
    // ========================================================================

    async executeRun(runId: string): Promise<RunContext> {
        const run = this.getRun(runId);
        if (!run) {
            throw new Error(`Run not found: ${runId}`);
        }

        try {
            // Begin scan → analyze repository
            await this.transitionTo(runId, RunState.SCANNING);
            this.eventBus.emit('scan:started', runId, { timestamp: Date.now() });

            // Plan phase would be set by external system
            // (AnalysisEngine provides gaps, external code classifies them)

            // Generate phase would be set by external system
            // (LLM services generate tests/remediations)

            // Apply phase would be set by external system
            // (Patches written to workspace)

            // Execute phase would be set by external system
            // (TestExecutor runs tests)

            // Report phase would be set by external system
            // (ReportGenerator produces artifacts)

            // Mark complete
            await this.transitionTo(runId, RunState.DONE);
            run.endTime = Date.now();
            run.duration = run.endTime - run.startTime;

            this.eventBus.emit('run:complete', runId, {
                duration: run.duration,
                timestamp: run.endTime
            });

            return run;
        } catch (error: any) {
            await this.handleRunError(runId, RunState.FAILED, error);
            throw error;
        }
    }

    async cancelRun(runId: string): Promise<void> {
        const run = this.getRun(runId);
        if (run && run.state !== RunState.DONE && run.state !== RunState.FAILED) {
            await this.transitionTo(runId, RunState.CANCELLED);
        }
    }

    // ========================================================================
    // Error Handling
    // ========================================================================

    private async handleRunError(
        runId: string,
        failureState: RunState,
        error: any
    ): Promise<void> {
        const run = this.getRun(runId);
        if (!run) return;

        const runError: RunError = {
            errorId: uuid(),
            timestamp: Date.now(),
            severity: failureState === RunState.FAILED ? 'FATAL' : 'ERROR',
            stage: run.state,
            message: error?.message || String(error),
            stack: error?.stack
        };

        run.errors.push(runError);

        if (run.state !== failureState) {
            await this.transitionTo(runId, failureState);
        }

        this.eventBus.emit('run:error', runId, runError);
    }

    recordError(
        runId: string,
        message: string,
        severity: 'WARNING' | 'ERROR' | 'FATAL' = 'ERROR',
        context?: Record<string, any>
    ): void {
        const run = this.getRun(runId);
        if (!run) return;

        const error: RunError = {
            errorId: uuid(),
            timestamp: Date.now(),
            severity,
            stage: run.state,
            message,
            context
        };

        run.errors.push(error);
        this.eventBus.emit('run:error', runId, error);
    }

    // ========================================================================
    // Artifact Persistence
    // ========================================================================

    async saveAnalysis(runId: string, artifact: AnalysisArtifact): Promise<void> {
        const run = this.getRun(runId);
        if (!run) throw new Error(`Run not found: ${runId}`);

        run.analysisResult = artifact;

        const filePath = path.join(this.artifactRoot, 'runs', runId, 'scan.json');
        await this.ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2));
    }

    /**
     * Persist all Sprint 10 artifacts (graph, report, diagrams) from AnalysisResult.
     * This is the unified integration point for Sprint 10 persistence.
     */
    async persistArtifacts(runId: string, analysisResult: any): Promise<void> {
        const run = this.getRun(runId);
        if (!run) throw new Error(`Run not found: ${runId}`);

        try {
            const writer = new ArtifactWriter(
                run.workspaceRoot
            );

            await writer.writeAllArtifacts(runId, analysisResult);

            this.eventBus.emit('scan:complete', runId, {
                timestamp: Date.now(),
                artifacts: ['scan.json', 'graph.json', 'report.json', 'diagrams']
            });
        } catch (error: any) {
            this.recordError(
                runId,
                `Failed to persist artifacts: ${error.message}`,
                'ERROR'
            );
            throw error;
        }
    }

    async savePlans(runId: string, plans: (TestPlan | any)[]): Promise<void> {
        const run = this.getRun(runId);
        if (!run) throw new Error(`Run not found: ${runId}`);

        run.generatedTestPlans = plans as TestPlan[];

        const filePath = path.join(this.artifactRoot, 'runs', runId, 'plan.json');
        await this.ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(plans, null, 2));
    }

    async savePatchApplications(
        runId: string,
        applications: PatchApplication[]
    ): Promise<void> {
        const run = this.getRun(runId);
        if (!run) throw new Error(`Run not found: ${runId}`);

        run.appliedPatches = applications;

        const filePath = path.join(this.artifactRoot, 'runs', runId, 'applied-patches.json');
        await this.ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(applications, null, 2));
    }

    async saveExecutionResults(
        runId: string,
        results: ExecutionResult[]
    ): Promise<void> {
        const run = this.getRun(runId);
        if (!run) throw new Error(`Run not found: ${runId}`);

        run.executionResults = results;

        const filePath = path.join(this.artifactRoot, 'runs', runId, 'execution-results.json');
        await this.ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
    }

    async saveReport(runId: string, report: ReportArtifact): Promise<void> {
        const run = this.getRun(runId);
        if (!run) throw new Error(`Run not found: ${runId}`);

        run.reportArtifact = report;

        const runDir = path.join(this.artifactRoot, 'runs', runId);
        await this.ensureDir(runDir);

        // Save all formats
        fs.writeFileSync(
            path.join(runDir, 'report.json'),
            JSON.stringify(report.jsonContent ?? report, null, 2)
        );

        if (report.markdownContent) {
            fs.writeFileSync(path.join(runDir, 'report.md'), report.markdownContent);
        }

        if (report.htmlContent) {
            fs.writeFileSync(path.join(runDir, 'report.html'), report.htmlContent);
        }
    }

    async saveScreenshot(
        runId: string,
        executionId: string,
        buffer: Buffer
    ): Promise<string> {
        const screenshotsDir = path.join(
            this.artifactRoot,
            'runs',
            runId,
            'screenshots'
        );
        await this.ensureDir(screenshotsDir);

        const fileName = `${executionId}-${Date.now()}.png`;
        const filePath = path.join(screenshotsDir, fileName);
        fs.writeFileSync(filePath, buffer);

        return filePath;
    }

    async saveVideo(
        runId: string,
        executionId: string,
        sourceFilePath: string
    ): Promise<string> {
        const videosDir = path.join(this.artifactRoot, 'runs', runId, 'videos');
        await this.ensureDir(videosDir);

        const fileName = `${executionId}-${Date.now()}.webm`;
        const destPath = path.join(videosDir, fileName);
        fs.copyFileSync(sourceFilePath, destPath);

        return destPath;
    }

    async saveLog(runId: string, executionId: string, content: string): Promise<string> {
        const logsDir = path.join(this.artifactRoot, 'runs', runId, 'logs');
        await this.ensureDir(logsDir);

        const fileName = `execution-${executionId}.log`;
        const filePath = path.join(logsDir, fileName);
        fs.writeFileSync(filePath, content);

        return filePath;
    }

    // ========================================================================
    // Result Retrieval
    // ========================================================================

    async getRunResults(runId: string): Promise<RunContext | undefined> {
        const run = this.getRun(runId);

        if (!run) {
            // Try to load from disk
            const scanPath = path.join(this.artifactRoot, 'runs', runId, 'scan.json');
            if (fs.existsSync(scanPath)) {
                const context: RunContext = {
                    runId,
                    workspaceRoot: '',
                    state: RunState.DONE,
                    startTime: 0,
                    config: {
                        generateTests: false,
                        autoApply: false,
                        runTests: false,
                        captureScreenshots: false,
                        captureVideo: false,
                        frameworks: [],
                        timeoutMs: 60000
                    },
                    stateHistory: [],
                    errors: [],
                    analysisResult: JSON.parse(fs.readFileSync(scanPath, 'utf8'))
                };
                return context;
            }
        }

        return run;
    }

    async getRunReport(runId: string): Promise<ReportArtifact | undefined> {
        const run = this.getRun(runId);
        if (run?.reportArtifact) {
            return run.reportArtifact;
        }

        // Try to load from disk
        const reportPath = path.join(this.artifactRoot, 'runs', runId, 'report.json');
        if (fs.existsSync(reportPath)) {
            return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        }

        return undefined;
    }

    // ========================================================================
    // Event Bus
    // ========================================================================

    on(event: RunEventType, handler: (evt: RunEvent) => void): void {
        this.eventBus.on(event, handler);
    }

    off(event: RunEventType, handler: (evt: RunEvent) => void): void {
        this.eventBus.off(event, handler);
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    private async ensureArtifactDirectory(runId: string): Promise<void> {
        const runDir = path.join(this.artifactRoot, 'runs', runId);
        const subDirs = ['generated-tests', 'screenshots', 'videos', 'logs'];

        await this.ensureDir(runDir);
        for (const subDir of subDirs) {
            await this.ensureDir(path.join(runDir, subDir));
        }
    }

    private async ensureDir(dirPath: string): Promise<void> {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Get all runs
     */
    getAllRuns(): RunContext[] {
        return Array.from(this.runs.values());
    }

    /**
     * Clear run from memory (careful - will not persist)
     */
    deleteRun(runId: string): boolean {
        return this.runs.delete(runId);
    }
}

// Singleton export
let orchestratorInstance: RunOrchestrator | null = null;

export function getOrchestrator(artifactRoot?: string): RunOrchestrator {
    if (!orchestratorInstance) {
        orchestratorInstance = new RunOrchestrator(artifactRoot);
    }
    return orchestratorInstance;
}
