import * as vscode from 'vscode';
import * as path from 'path';
import { spawn } from 'child_process';
import { GapItem } from '../models/types';
import { LiveBrowserPreviewPanel, DetectedGap } from '../providers/LiveBrowserPreviewPanel';

/**
 * Service to handle agentic browser testing using browser-use.
 */
export class AgenticBrowserTestingService {
    constructor(
        private context: vscode.ExtensionContext,
        private outputChannel: vscode.OutputChannel
    ) {}

    /**
     * Executes an agentic test for a given gap or a general task.
     * @param gap Optional GapItem to test against.
     */
    async testWithAgent(gap?: GapItem) {
        const config = vscode.workspace.getConfiguration('reposense.browserTesting');
        const baseUrl = config.get<string>('baseUrl') || 'http://localhost:3000';
        const llmProvider = config.get<string>('llmProvider') || 'ollama';
        const llmModel = config.get<string>('llmModel') || 'deepseek-coder:6.7b';

        let taskDescription = '';
        if (gap) {
            // Formulate a task based on the gap information
            taskDescription = `Test for potential issue: ${gap.message}. 
            The issue is located in ${gap.file} at line ${gap.line}. 
            Specifically, check if the frontend is correctly calling the expected backend endpoints and handles the response appropriately.`;
        } else {
            // Prompt user for a custom task
            taskDescription = await vscode.window.showInputBox({
                prompt: 'Enter the task for the AI agent',
                placeHolder: 'e.g., Test the user creation flow and verify the success message'
            }) || '';
        }

        if (!taskDescription) {
            return;
        }

        // Initialize Live Browser Preview Panel
        const detectedGap: DetectedGap = gap ? {
            id: 'gap-' + Date.now(),
            endpoint: gap.message.split(' ').pop() || 'unknown', // Simplistic extraction
            method: 'AUTO',
            type: gap.type,
            severity: gap.severity
        } : {
            id: 'custom-' + Date.now(),
            endpoint: 'Custom Task',
            method: 'N/A',
            type: 'manual',
            severity: 'LOW'
        };

        const panel = LiveBrowserPreviewPanel.createOrShow(
            this.context.extensionUri,
            detectedGap,
            baseUrl
        );
        panel.updateStatus('initializing');

        this.outputChannel.show();
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine('================================================================');
        this.outputChannel.appendLine(`[Agentic Testing] Starting agent at ${new Date().toLocaleTimeString()}`);
        this.outputChannel.appendLine(`[Agentic Testing] Task: ${taskDescription}`);
        this.outputChannel.appendLine(`[Agentic Testing] Config: ${llmProvider}/${llmModel} -> ${baseUrl}`);
        this.outputChannel.appendLine('================================================================');

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace root found');
            return;
        }

        // Determine Python path (assuming .venv exists in project root)
        const pythonPath = process.platform === 'win32' 
            ? path.join(workspaceRoot, '.venv', 'Scripts', 'python.exe')
            : path.join(workspaceRoot, '.venv', 'bin', 'python');
            
        const bridgeScriptPath = path.join(workspaceRoot, 'src', 'services', 'agent_test_bridge.py');

        const agentProcess = spawn(pythonPath, [
            bridgeScriptPath,
            llmProvider,
            llmModel,
            baseUrl,
            taskDescription
        ]);

        agentProcess.stdout.on('data', (data) => {
            const rawOutput = data.toString();
            this.outputChannel.append(rawOutput);

            // Parse for structured events
            const lines = rawOutput.split('\n');
            for (const line of lines) {
                if (line.startsWith('EVENT_JSON:')) {
                    try {
                        const event = JSON.parse(line.substring('EVENT_JSON:'.length));
                        this.handleAgentEvent(event, panel);
                    } catch (e) {
                        // Ignore parse errors for malformed lines
                    }
                }
            }
        });

        agentProcess.stderr.on('data', (data) => {
            const errorMsg = data.toString();
            this.outputChannel.append(`[PROCESS ERROR]: ${errorMsg}`);
            panel.setError(errorMsg);
            // If it's a known error like missing module, give a hint
            if (errorMsg.includes('ModuleNotFoundError')) {
                this.outputChannel.appendLine('\n[TIP] Make sure you have installed the Python dependencies with "pip install browser-use langchain-openai langchain-ollama"');
            }
        });

        agentProcess.on('error', (err) => {
            this.outputChannel.appendLine(`[LAUNCH ERROR]: Failed to start agent process: ${err.message}`);
            vscode.window.showErrorMessage(`Failed to start AI Agent: ${err.message}`);
        });

        agentProcess.on('close', (code) => {
            this.outputChannel.appendLine('\n================================================================');
            this.outputChannel.appendLine(`[Agentic Testing] Agent process finished with exit code ${code}`);
            this.outputChannel.appendLine('================================================================');
            
            if (code === 0) {
                panel.updateStatus('completed');
                vscode.window.showInformationMessage('Agentic browser testing completed! Check the RepoSense output channel for details.');
            } else {
                panel.updateStatus('failed');
                vscode.window.showErrorMessage(`Agentic test process failed (Exit code ${code}). Check output for errors.`);
            }
        });
    }

    /**
     * Handles structured events from the agent process to update the UI.
     */
    private handleAgentEvent(event: any, panel: LiveBrowserPreviewPanel) {
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
                panel.setAgentThinking(data.thinking || 'Executing action...');
                break;
            case 'completed':
                panel.setAgentThinking('Task completed: ' + data.summary);
                break;
            case 'error':
                panel.setError(data);
                break;
        }
    }
}

/**
 * Helper to register the agentic testing commands.
 */
export function registerAgenticTestingCommands(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    const service = new AgenticBrowserTestingService(context, outputChannel);

    const testCommand = vscode.commands.registerCommand('reposense.testWithAgent', async (arg?: any) => {
        // If arg has a gap property (likely from TreeView), use it
        const gap = arg && arg.gap ? arg.gap as GapItem : (arg as GapItem);
        await service.testWithAgent(gap);
    });

    context.subscriptions.push(testCommand);
}
