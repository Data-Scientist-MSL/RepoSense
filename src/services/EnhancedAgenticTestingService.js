"use strict";
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
exports.EnhancedAgenticTestingService = void 0;
exports.registerEnhancedAgenticCommands = registerEnhancedAgenticCommands;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const LiveBrowserPreviewPanel_1 = require("../providers/LiveBrowserPreviewPanel");
const UIUXAnalyzer_1 = require("./UIUXAnalyzer");
const UIUXRecommendationPanel_1 = require("../providers/UIUXRecommendationPanel");
const ReportGenerator_1 = require("./ReportGenerator");
const AgentOrchestrator_1 = require("./agents/AgentOrchestrator");
const ConsultantAgent_1 = require("./agents/ConsultantAgent");
const RemediationAgent_1 = require("./agents/RemediationAgent");
const GraphEngine_1 = require("./analysis/GraphEngine");
const OllamaService_1 = require("./llm/OllamaService");
/**
 * Service to handle enhanced agentic browser testing with LIVE visualization.
 * This service coordinates between the Python agent and the LiveBrowserPreviewPanel.
 */
class EnhancedAgenticTestingService {
    constructor(context, outputChannel, artifactStore, evidenceSigner, orchestrator) {
        this.context = context;
        this.outputChannel = outputChannel;
        this.artifactStore = artifactStore;
        this.evidenceSigner = evidenceSigner;
        this.orchestrator = orchestrator;
        this.analyzer = new UIUXAnalyzer_1.UIUXAnalyzer(this.outputChannel);
        // Initialize consultant with shared services
        const ollama = new OllamaService_1.OllamaService();
        const graphEngine = new GraphEngine_1.GraphEngine();
        const remediation = new RemediationAgent_1.RemediationAgent(ollama, graphEngine);
        this.consultant = new ConsultantAgent_1.ConsultantAgent(ollama, this.orchestrator, this.analyzer, remediation, this.outputChannel);
    }
    /**
     * Executes an agentic test with a live preview for a given gap.
     */
    async testWithLivePreview(gap) {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('Please open a workspace before running tests.');
            return;
        }
        // Get current configuration
        const workspaceConfig = vscode.workspace.getConfiguration('reposense.browserTesting');
        const config = {
            baseUrl: workspaceConfig.get('baseUrl') || 'http://localhost:3000',
            llmProvider: workspaceConfig.get('llmProvider') || 'ollama',
            llmModel: workspaceConfig.get('llmModel') || 'deepseek-coder:6.7b',
            headed: true // Default to headed for live preview experience
        };
        // Formulate gap details for the panel
        const detectedGap = gap ? {
            id: 'gap-' + Date.now(),
            endpoint: gap.message || 'Unknown Endpoint',
            method: 'DETECTED',
            type: gap.type,
            severity: gap.severity
        } : {
            id: 'custom-' + Date.now(),
            endpoint: 'Ad-hoc Testing',
            method: 'MANUAL',
            type: 'manual',
            severity: 'LOW'
        };
        // Create the task description
        let taskDescription = '';
        if (gap) {
            taskDescription = `Test and verify the functionality for: ${gap.message}. 
Locate the relevant UI components on the page and perform a full end-to-end verification.
Context: File ${gap.file}, Line ${gap.line}. 
Goal: Ensure the frontend and backend are correctly integrated.`;
        }
        else {
            taskDescription = await vscode.window.showInputBox({
                prompt: 'What area of the application should the AI test?',
                placeHolder: 'e.g., Register a new user and verify the dashboard loads'
            }) || '';
        }
        if (!taskDescription)
            return;
        // 1. Show the Live Preview Panel
        const panel = LiveBrowserPreviewPanel_1.LiveBrowserPreviewPanel.createOrShow(this.context.extensionUri, detectedGap, config.baseUrl);
        panel.updateStatus('initializing');
        // 2. Prepare the execution environment
        const pythonPath = process.platform === 'win32'
            ? path.join(workspaceRoot, '.venv', 'Scripts', 'python.exe')
            : path.join(workspaceRoot, '.venv', 'bin', 'python');
        const bridgeScriptPath = path.join(workspaceRoot, 'src', 'services', 'agent_test_bridge.py');
        this.outputChannel.show();
        this.outputChannel.appendLine(`\n[Enhanced Agent] Starting live test for: ${detectedGap.endpoint}`);
        this.outputChannel.appendLine(`[Enhanced Agent] Task: ${taskDescription}`);
        // 3. Spawn the Python bridge process
        const capturedSteps = [];
        const startTime = Date.now();
        const agentProcess = (0, child_process_1.spawn)(pythonPath, [
            bridgeScriptPath,
            config.llmProvider,
            config.llmModel,
            config.baseUrl,
            taskDescription
        ]);
        // Register task with Orchestrator
        const agentTask = await this.orchestrator.createTask(AgentOrchestrator_1.AgentType.AUDIT, { taskDescription, baseUrl: config.baseUrl });
        this.orchestrator.runTask(agentTask.id, async () => {
            return new Promise((resolve) => {
                agentProcess.on('close', (code) => resolve({ code, steps: capturedSteps.length }));
            });
        });
        // 4. Handle process output & stream to UI
        agentProcess.stdout.on('data', (data) => {
            const output = data.toString();
            this.outputChannel.append(output);
            const lines = output.split('\n');
            for (const line of lines) {
                if (line.startsWith('EVENT_JSON:')) {
                    try {
                        const event = JSON.parse(line.substring('EVENT_JSON:'.length));
                        this.streamEventToPanel(event, panel);
                        if (event.type === 'step') {
                            capturedSteps.push({
                                stepNumber: event.data.stepNumber,
                                timestamp: Date.now(),
                                action: event.data.action,
                                goal: event.data.goal,
                                thinking: event.data.thinking,
                                result: event.data.result,
                                screenshot: event.data.screenshot,
                                details: event.data.details
                            });
                        }
                    }
                    catch (e) {
                        // Protocol error or malformed JSON
                    }
                }
            }
        });
        agentProcess.stderr.on('data', (data) => {
            const errorStr = data.toString();
            this.outputChannel.append(`[PROCESS ERROR]: ${errorStr}`);
            panel.setAgentThinking(`Error: ${errorStr}`);
        });
        agentProcess.on('close', (code) => {
            this.outputChannel.appendLine(`\n[Enhanced Agent] Process exited with code ${code}`);
            if (code === 0) {
                panel.updateStatus('completed');
                vscode.window.showInformationMessage('✅ Agentic test completed successfully!', 'Run UI/UX Analysis').then(async (selection) => {
                    if (selection === 'Run UI/UX Analysis') {
                        const testResult = {
                            testName: detectedGap.endpoint,
                            passed: true,
                            steps: capturedSteps,
                            startTime,
                            endTime: Date.now()
                        };
                        const pack = await this.analyzer.analyzeTestResults(testResult, detectedGap);
                        UIUXRecommendationPanel_1.UIUXRecommendationPanel.createOrShow(this.context.extensionUri, pack);
                        // Save UI/UX results as artifact
                        try {
                            const reportGen = new ReportGenerator_1.ReportGenerator({
                                runId: 'agentic-' + Date.now(),
                                nodes: [
                                    { id: detectedGap.id, type: 'GAP', metadata: { endpoint: detectedGap.endpoint, severity: detectedGap.severity, type: detectedGap.type } }
                                ]
                            });
                            const reportData = reportGen.generateReportData();
                            reportData.uiuxRecommendations = pack;
                            const reportArtifact = {
                                reportId: pack.id,
                                runId: reportData.runId,
                                generatedAt: Date.now(),
                                title: pack.name,
                                summary: `${pack.issues.length} UI/UX issues identified during agentic test.`,
                                uiuxRecommendations: pack,
                                markdownContent: reportGen.generateMarkdown(), // This will need updating if we want it to include the UI/UX MD
                                htmlContent: reportGen.generateHTML()
                            };
                            await this.artifactStore.initialize(reportData.runId);
                            await this.artifactStore.saveReport(reportArtifact);
                            this.outputChannel.appendLine(`✅ UI/UX Analysis Report saved as artifact: ${reportData.runId}`);
                        }
                        catch (err) {
                            this.outputChannel.appendLine(`⚠️ Failed to save report artifact: ${err}`);
                        }
                    }
                });
            }
            else {
                panel.updateStatus('failed');
                panel.setError(`Process exited with code ${code}. Check logs for details.`);
            }
        });
        // Inform user
        vscode.window.setStatusBarMessage('🤖 RepoSense: Running Live Test...', 5000);
    }
    /**
     * Bridges events from Python to the Webview panel
     */
    streamEventToPanel(event, panel) {
        const { type, data } = event;
        switch (type) {
            case 'info':
                panel.setAgentThinking(data);
                break;
            case 'step':
                panel.updateStatus('running');
                panel.addStep({
                    goal: data.goal,
                    action: data.action,
                    thinking: data.thinking,
                    result: data.result,
                    details: data.details
                });
                if (data.screenshot) {
                    panel.addScreenshot(data.screenshot);
                }
                panel.setAgentThinking(data.thinking || 'Thinking about next move...');
                break;
            case 'completed':
                panel.setAgentThinking(`Done! ${data.summary}`);
                break;
            case 'error':
                panel.setError(data);
                break;
        }
    }
}
exports.EnhancedAgenticTestingService = EnhancedAgenticTestingService;
/**
 * Entry point to register enhanced commands
 */
function registerEnhancedAgenticCommands(context, outputChannel, artifactStore, evidenceSigner, orchestrator) {
    const service = new EnhancedAgenticTestingService(context, outputChannel, artifactStore, evidenceSigner, orchestrator);
    // Register primary command
    const testWithLivePreview = vscode.commands.registerCommand('reposense.testWithLivePreview', async (arg) => {
        const gap = arg && arg.gap ? arg.gap : (arg && arg.type ? arg : undefined);
        await service.testWithLivePreview(gap);
    });
    // Register revealing command
    const openLivePreview = vscode.commands.registerCommand('reposense.openLivePreview', () => {
        LiveBrowserPreviewPanel_1.LiveBrowserPreviewPanel.createOrShow(context.extensionUri, { id: 'view-only', endpoint: 'Browser', method: 'VIEW', type: 'info', severity: 'LOW' }, 'about:blank');
    });
    const askConsultant = vscode.commands.registerCommand('reposense.askConsultant', async () => {
        vscode.window.showInformationMessage('🤖 RepoSense Consultant is analyzing the project...');
        const advice = await service['consultant'].consult({});
        const doc = await vscode.workspace.openTextDocument({
            content: advice,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    });
    context.subscriptions.push(testWithLivePreview, openLivePreview, askConsultant);
}
