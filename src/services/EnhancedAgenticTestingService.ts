import * as vscode from 'vscode';
import * as path from 'path';
import { spawn } from 'child_process';
import { GapItem } from '../models/types';
import { LiveBrowserPreviewPanel, DetectedGap } from '../providers/LiveBrowserPreviewPanel';
import { UIUXAnalyzer, AgentStep, AgenticTestResult } from './UIUXAnalyzer';
import { UIUXRecommendationPanel } from '../providers/UIUXRecommendationPanel';
import { ArtifactStore } from './ArtifactStore';
import { EvidenceSigner } from './evidence/EvidenceSigner';
import { ReportGenerator, ReportFormat } from './ReportGenerator';
import { AgentOrchestrator, AgentType } from './agents/AgentOrchestrator';
import { ConsultantAgent } from './agents/ConsultantAgent';
import { RemediationAgent } from './agents/RemediationAgent';
import { GraphEngine } from './analysis/GraphEngine';
import { OllamaService } from './llm/OllamaService';

/**
 * Enhanced configuration for agentic testing
 */
export interface AgenticTestConfig {
    baseUrl: string;
    llmProvider: 'ollama' | 'openai' | 'browser-use-cloud';
    llmModel: string;
    headed: boolean;
}

/**
 * Service to handle enhanced agentic browser testing with LIVE visualization.
 * This service coordinates between the Python agent and the LiveBrowserPreviewPanel.
 */
export class EnhancedAgenticTestingService {
    private analyzer: UIUXAnalyzer;
    private consultant: ConsultantAgent;

    constructor(
        private context: vscode.ExtensionContext,
        private outputChannel: vscode.OutputChannel,
        private artifactStore: ArtifactStore,
        private evidenceSigner: EvidenceSigner,
        private orchestrator: AgentOrchestrator
    ) {
        this.analyzer = new UIUXAnalyzer(this.outputChannel);
        
        // Initialize consultant with shared services
        const ollama = new OllamaService();
        const graphEngine = new GraphEngine();
        const remediation = new RemediationAgent(ollama, graphEngine);
        this.consultant = new ConsultantAgent(ollama, this.orchestrator, this.analyzer, remediation, this.outputChannel);
    }

    /**
     * Executes an agentic test with a live preview for a given gap.
     */
    async testWithLivePreview(gap?: GapItem) {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('Please open a workspace before running tests.');
            return;
        }

        // Get current configuration
        const workspaceConfig = vscode.workspace.getConfiguration('reposense.browserTesting');
        const config: AgenticTestConfig = {
            baseUrl: workspaceConfig.get<string>('baseUrl') || 'http://localhost:3000',
            llmProvider: workspaceConfig.get<any>('llmProvider') || 'ollama',
            llmModel: workspaceConfig.get<string>('llmModel') || 'deepseek-coder:6.7b',
            headed: true // Default to headed for live preview experience
        };

        // Formulate gap details for the panel
        const detectedGap: DetectedGap = gap ? {
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
        } else {
            taskDescription = await vscode.window.showInputBox({
                prompt: 'What area of the application should the AI test?',
                placeHolder: 'e.g., Register a new user and verify the dashboard loads'
            }) || '';
        }

        if (!taskDescription) return;

        // 1. Show the Live Preview Panel
        const panel = LiveBrowserPreviewPanel.createOrShow(
            this.context.extensionUri,
            detectedGap,
            config.baseUrl
        );
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
        const capturedSteps: AgentStep[] = [];
        const startTime = Date.now();

        const agentProcess = spawn(pythonPath, [
            bridgeScriptPath,
            config.llmProvider,
            config.llmModel,
            config.baseUrl,
            taskDescription
        ]);

        // Register task with Orchestrator
        const agentTask = await this.orchestrator.createTask(AgentType.AUDIT, { taskDescription, baseUrl: config.baseUrl });
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
                    } catch (e) {
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
                vscode.window.showInformationMessage('✅ Agentic test completed successfully!', 'Run UI/UX Analysis').then(async selection => {
                    if (selection === 'Run UI/UX Analysis') {
                        const testResult: AgenticTestResult = {
                            testName: detectedGap.endpoint,
                            passed: true,
                            steps: capturedSteps,
                            startTime,
                            endTime: Date.now()
                        };
                        const pack = await this.analyzer.analyzeTestResults(testResult, detectedGap);
                        UIUXRecommendationPanel.createOrShow(this.context.extensionUri, pack);

                        // Save UI/UX results as artifact
                        try {
                            const reportGen = new ReportGenerator({
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
                            await this.artifactStore.saveReport(reportArtifact as any);
                            this.outputChannel.appendLine(`✅ UI/UX Analysis Report saved as artifact: ${reportData.runId}`);
                        } catch (err) {
                            this.outputChannel.appendLine(`⚠️ Failed to save report artifact: ${err}`);
                        }
                    }
                });
            } else {
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
    private streamEventToPanel(event: any, panel: LiveBrowserPreviewPanel) {
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
                    result: data.result as any,
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

/**
 * Entry point to register enhanced commands
 */
export function registerEnhancedAgenticCommands(
    context: vscode.ExtensionContext, 
    outputChannel: vscode.OutputChannel,
    artifactStore: ArtifactStore,
    evidenceSigner: EvidenceSigner,
    orchestrator: AgentOrchestrator
) {
    const service = new EnhancedAgenticTestingService(context, outputChannel, artifactStore, evidenceSigner, orchestrator);

    // Register primary command
    const testWithLivePreview = vscode.commands.registerCommand('reposense.testWithLivePreview', async (arg?: any) => {
        const gap = arg && arg.gap ? arg.gap as GapItem : (arg && arg.type ? arg as GapItem : undefined);
        await service.testWithLivePreview(gap);
    });

    // Register revealing command
    const openLivePreview = vscode.commands.registerCommand('reposense.openLivePreview', () => {
        LiveBrowserPreviewPanel.createOrShow(
            context.extensionUri,
            { id: 'view-only', endpoint: 'Browser', method: 'VIEW', type: 'info', severity: 'LOW' },
            'about:blank'
        );
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
