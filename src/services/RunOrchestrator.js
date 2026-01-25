"use strict";
/**
 * RunOrchestrator.ts (Implementation)
 *
 * Core state machine that governs the entire RepoSense execution lifecycle.
 * Manages transitions, event emission, artifact persistence, and error recovery.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunOrchestrator = void 0;
exports.getOrchestrator = getOrchestrator;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const events_1 = require("events");
const uuid_1 = require("uuid");
const RunOrchestrator_1 = require("../models/RunOrchestrator");
const ArtifactWriter_1 = require("./run/ArtifactWriter");
const VALID_TRANSITIONS = {
    [RunOrchestrator_1.RunState.IDLE]: [RunOrchestrator_1.RunState.SCANNING, RunOrchestrator_1.RunState.CANCELLED],
    [RunOrchestrator_1.RunState.SCANNING]: [RunOrchestrator_1.RunState.PLANNING, RunOrchestrator_1.RunState.FAILED, RunOrchestrator_1.RunState.CANCELLED],
    [RunOrchestrator_1.RunState.PLANNING]: [RunOrchestrator_1.RunState.GENERATING, RunOrchestrator_1.RunState.FAILED, RunOrchestrator_1.RunState.CANCELLED],
    [RunOrchestrator_1.RunState.GENERATING]: [RunOrchestrator_1.RunState.APPLYING, RunOrchestrator_1.RunState.FAILED, RunOrchestrator_1.RunState.CANCELLED],
    [RunOrchestrator_1.RunState.APPLYING]: [RunOrchestrator_1.RunState.EXECUTING, RunOrchestrator_1.RunState.FAILED, RunOrchestrator_1.RunState.CANCELLED],
    [RunOrchestrator_1.RunState.EXECUTING]: [RunOrchestrator_1.RunState.REPORTING, RunOrchestrator_1.RunState.FAILED, RunOrchestrator_1.RunState.CANCELLED],
    [RunOrchestrator_1.RunState.REPORTING]: [RunOrchestrator_1.RunState.DONE, RunOrchestrator_1.RunState.FAILED, RunOrchestrator_1.RunState.CANCELLED],
    [RunOrchestrator_1.RunState.DONE]: [],
    [RunOrchestrator_1.RunState.FAILED]: [RunOrchestrator_1.RunState.SCANNING], // allow retry from IDLE
    [RunOrchestrator_1.RunState.CANCELLED]: [RunOrchestrator_1.RunState.SCANNING] // allow retry from IDLE
};
/**
 * Central event bus for run lifecycle events
 */
class SimpleEventBus {
    constructor() {
        this.emitter = new events_1.EventEmitter();
    }
    on(event, handler) {
        this.emitter.on(event, handler);
    }
    off(event, handler) {
        this.emitter.off(event, handler);
    }
    emit(type, runId, data) {
        const event = {
            eventId: (0, uuid_1.v4)(),
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
class RunOrchestrator {
    constructor(artifactRoot = '.reposense') {
        this.runs = new Map();
        this.eventBus = new SimpleEventBus();
        this.artifactRoot = artifactRoot;
    }
    // ========================================================================
    // Lifecycle Management
    // ========================================================================
    async createRun(workspaceRoot, config) {
        const runId = (0, uuid_1.v4)();
        const now = Date.now();
        const runContext = {
            runId,
            workspaceRoot,
            state: RunOrchestrator_1.RunState.IDLE,
            startTime: now,
            config,
            stateHistory: [
                {
                    from: RunOrchestrator_1.RunState.IDLE,
                    to: RunOrchestrator_1.RunState.IDLE,
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
    getRun(runId) {
        return this.runs.get(runId);
    }
    // ========================================================================
    // State Management
    // ========================================================================
    async transitionTo(runId, newState) {
        const run = this.getRun(runId);
        if (!run) {
            throw new Error(`Run not found: ${runId}`);
        }
        const currentState = run.state;
        const allowedNextStates = VALID_TRANSITIONS[currentState];
        if (!allowedNextStates.includes(newState)) {
            throw new Error(`Invalid state transition: ${currentState} → ${newState}. Allowed: ${allowedNextStates.join(', ')}`);
        }
        const transition = {
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
    getCurrentState(runId) {
        return this.getRun(runId)?.state ?? RunOrchestrator_1.RunState.IDLE;
    }
    // ========================================================================
    // Execution
    // ========================================================================
    async executeRun(runId) {
        const run = this.getRun(runId);
        if (!run) {
            throw new Error(`Run not found: ${runId}`);
        }
        try {
            // Begin scan → analyze repository
            await this.transitionTo(runId, RunOrchestrator_1.RunState.SCANNING);
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
            await this.transitionTo(runId, RunOrchestrator_1.RunState.DONE);
            run.endTime = Date.now();
            run.duration = run.endTime - run.startTime;
            this.eventBus.emit('run:complete', runId, {
                duration: run.duration,
                timestamp: run.endTime
            });
            return run;
        }
        catch (error) {
            await this.handleRunError(runId, RunOrchestrator_1.RunState.FAILED, error);
            throw error;
        }
    }
    async cancelRun(runId) {
        const run = this.getRun(runId);
        if (run && run.state !== RunOrchestrator_1.RunState.DONE && run.state !== RunOrchestrator_1.RunState.FAILED) {
            await this.transitionTo(runId, RunOrchestrator_1.RunState.CANCELLED);
        }
    }
    // ========================================================================
    // Error Handling
    // ========================================================================
    async handleRunError(runId, failureState, error) {
        const run = this.getRun(runId);
        if (!run)
            return;
        const runError = {
            errorId: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            severity: failureState === RunOrchestrator_1.RunState.FAILED ? 'FATAL' : 'ERROR',
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
    recordError(runId, message, severity = 'ERROR', context) {
        const run = this.getRun(runId);
        if (!run)
            return;
        const error = {
            errorId: (0, uuid_1.v4)(),
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
    async saveAnalysis(runId, artifact) {
        const run = this.getRun(runId);
        if (!run)
            throw new Error(`Run not found: ${runId}`);
        run.analysisResult = artifact;
        const filePath = path.join(this.artifactRoot, 'runs', runId, 'scan.json');
        await this.ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2));
    }
    /**
     * Persist all Sprint 10 artifacts (graph, report, diagrams) from AnalysisResult.
     * This is the unified integration point for Sprint 10 persistence.
     */
    async persistArtifacts(runId, analysisResult) {
        const run = this.getRun(runId);
        if (!run)
            throw new Error(`Run not found: ${runId}`);
        try {
            const writer = new ArtifactWriter_1.ArtifactWriter(run.workspaceRoot);
            await writer.writeAllArtifacts(runId, analysisResult);
            this.eventBus.emit('scan:complete', runId, {
                timestamp: Date.now(),
                artifacts: ['scan.json', 'graph.json', 'report.json', 'diagrams']
            });
        }
        catch (error) {
            this.recordError(runId, `Failed to persist artifacts: ${error.message}`, 'ERROR');
            throw error;
        }
    }
    async savePlans(runId, plans) {
        const run = this.getRun(runId);
        if (!run)
            throw new Error(`Run not found: ${runId}`);
        run.generatedTestPlans = plans;
        const filePath = path.join(this.artifactRoot, 'runs', runId, 'plan.json');
        await this.ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(plans, null, 2));
    }
    async savePatchApplications(runId, applications) {
        const run = this.getRun(runId);
        if (!run)
            throw new Error(`Run not found: ${runId}`);
        run.appliedPatches = applications;
        const filePath = path.join(this.artifactRoot, 'runs', runId, 'applied-patches.json');
        await this.ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(applications, null, 2));
    }
    async saveExecutionResults(runId, results) {
        const run = this.getRun(runId);
        if (!run)
            throw new Error(`Run not found: ${runId}`);
        run.executionResults = results;
        const filePath = path.join(this.artifactRoot, 'runs', runId, 'execution-results.json');
        await this.ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
    }
    async saveReport(runId, report) {
        const run = this.getRun(runId);
        if (!run)
            throw new Error(`Run not found: ${runId}`);
        run.reportArtifact = report;
        const runDir = path.join(this.artifactRoot, 'runs', runId);
        await this.ensureDir(runDir);
        // Save all formats
        fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report.jsonContent ?? report, null, 2));
        if (report.markdownContent) {
            fs.writeFileSync(path.join(runDir, 'report.md'), report.markdownContent);
        }
        if (report.htmlContent) {
            fs.writeFileSync(path.join(runDir, 'report.html'), report.htmlContent);
        }
    }
    async saveScreenshot(runId, executionId, buffer) {
        const screenshotsDir = path.join(this.artifactRoot, 'runs', runId, 'screenshots');
        await this.ensureDir(screenshotsDir);
        const fileName = `${executionId}-${Date.now()}.png`;
        const filePath = path.join(screenshotsDir, fileName);
        fs.writeFileSync(filePath, buffer);
        return filePath;
    }
    async saveVideo(runId, executionId, sourceFilePath) {
        const videosDir = path.join(this.artifactRoot, 'runs', runId, 'videos');
        await this.ensureDir(videosDir);
        const fileName = `${executionId}-${Date.now()}.webm`;
        const destPath = path.join(videosDir, fileName);
        fs.copyFileSync(sourceFilePath, destPath);
        return destPath;
    }
    async saveLog(runId, executionId, content) {
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
    async getRunResults(runId) {
        const run = this.getRun(runId);
        if (!run) {
            // Try to load from disk
            const scanPath = path.join(this.artifactRoot, 'runs', runId, 'scan.json');
            if (fs.existsSync(scanPath)) {
                const context = {
                    runId,
                    workspaceRoot: '',
                    state: RunOrchestrator_1.RunState.DONE,
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
    async getRunReport(runId) {
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
    on(event, handler) {
        this.eventBus.on(event, handler);
    }
    off(event, handler) {
        this.eventBus.off(event, handler);
    }
    // ========================================================================
    // Helpers
    // ========================================================================
    async ensureArtifactDirectory(runId) {
        const runDir = path.join(this.artifactRoot, 'runs', runId);
        const subDirs = ['generated-tests', 'screenshots', 'videos', 'logs'];
        await this.ensureDir(runDir);
        for (const subDir of subDirs) {
            await this.ensureDir(path.join(runDir, subDir));
        }
    }
    async ensureDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    /**
     * Get all runs
     */
    getAllRuns() {
        return Array.from(this.runs.values());
    }
    /**
     * Clear run from memory (careful - will not persist)
     */
    deleteRun(runId) {
        return this.runs.delete(runId);
    }
}
exports.RunOrchestrator = RunOrchestrator;
// Singleton export
let orchestratorInstance = null;
function getOrchestrator(artifactRoot) {
    if (!orchestratorInstance) {
        orchestratorInstance = new RunOrchestrator(artifactRoot);
    }
    return orchestratorInstance;
}
