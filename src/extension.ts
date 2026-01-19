import * as vscode from 'vscode';
import * as path from 'path';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';
import { GapAnalysisProvider } from './providers/GapAnalysisProvider';
import { TestCaseProvider } from './providers/TestCaseProvider';
import { RemediationProvider } from './providers/RemediationProvider';
import { RepoSenseCodeLensProvider } from './providers/RepoSenseCodeLensProvider';
import { RepoSenseCodeActionProvider } from './providers/RepoSenseCodeActionProvider';
import { ReportPanel } from './providers/ReportPanel';
import { DiagnosticsManager } from './services/DiagnosticsManager';
import { GapItem } from './models/types';

let languageClient: LanguageClient;
let codeLensProvider: RepoSenseCodeLensProvider;
let codeActionProvider: RepoSenseCodeActionProvider;
let diagnosticsManager: DiagnosticsManager;
let lastAnalysisResult: { gaps: GapItem[], summary: any } | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('RepoSense extension is now active!');

    // Start Language Server
    languageClient = startLanguageServer(context);

    // Register TreeView Providers
    const gapAnalysisProvider = new GapAnalysisProvider();
    vscode.window.registerTreeDataProvider('reposense.gapAnalysis', gapAnalysisProvider);

    const testCaseProvider = new TestCaseProvider();
    vscode.window.registerTreeDataProvider('reposense.testCases', testCaseProvider);

    const remediationProvider = new RemediationProvider();
    vscode.window.registerTreeDataProvider('reposense.remediation', remediationProvider);

    // Register CodeLens Provider
    codeLensProvider = new RepoSenseCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            [
                { language: 'typescript', scheme: 'file' },
                { language: 'javascript', scheme: 'file' },
                { language: 'typescriptreact', scheme: 'file' },
                { language: 'javascriptreact', scheme: 'file' },
                { language: 'python', scheme: 'file' }
            ],
            codeLensProvider
        )
    );

    // Register CodeAction Provider for quick fixes
    codeActionProvider = new RepoSenseCodeActionProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            [
                { language: 'typescript', scheme: 'file' },
                { language: 'javascript', scheme: 'file' },
                { language: 'typescriptreact', scheme: 'file' },
                { language: 'javascriptreact', scheme: 'file' },
                { language: 'python', scheme: 'file' }
            ],
            codeActionProvider,
            {
                providedCodeActionKinds: [
                    vscode.CodeActionKind.QuickFix,
                    vscode.CodeActionKind.RefactorExtract,
                    vscode.CodeActionKind.RefactorInline
                ]
            }
        )
    );

    // Initialize Diagnostics Manager
    diagnosticsManager = new DiagnosticsManager();
    context.subscriptions.push(diagnosticsManager);

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    statusBarItem.text = '$(pulse) RepoSense Ready';
    statusBarItem.tooltip = 'Click to scan repository';
    statusBarItem.command = 'reposense.scanRepository';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register commands
    const scanCommand = vscode.commands.registerCommand(
        'reposense.scanRepository',
        async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            statusBarItem.text = '$(sync~spin) RepoSense: Scanning...';
            
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'RepoSense: Analyzing repository...',
                    cancellable: true
                },
                async (progress, token) => {
                    progress.report({ increment: 0, message: 'Initializing...' });
                    
                    try {
                        // Send analysis request to language server
                        const result = await languageClient.sendRequest('reposense/analyze', {
                            workspaceRoot: workspaceFolder.uri.fsPath
                        }) as any;
                        
                        progress.report({ increment: 50, message: 'Processing results...' });
                        
                        if (token.isCancellationRequested) {
                            statusBarItem.text = '$(pulse) RepoSense Ready';
                            return;
                        }
                        
                        // Update TreeViews with real data
                        gapAnalysisProvider.update(result.gaps);
                        
                        // Update CodeLens provider
                        codeLensProvider.updateGaps(result.gaps);
                        
                        // Update CodeAction provider
                        codeActionProvider.updateGaps(result.gaps);
                        
                        // Update Diagnostics (Problems Panel)
                        diagnosticsManager.updateDiagnostics(result.gaps);
                        
                        // Store result for report panel
                        lastAnalysisResult = {
                            gaps: result.gaps,
                            summary: result.summary
                        };
                        
                        const totalGaps = result.gaps.length;
                        statusBarItem.text = `$(${totalGaps > 0 ? 'warning' : 'check'}) RepoSense: ${totalGaps} gaps found`;
                        
                        progress.report({ increment: 100, message: 'Complete!' });
                        
                        vscode.window.showInformationMessage(
                            `RepoSense scan complete! Found ${totalGaps} gaps (${result.summary.critical} critical, ${result.summary.high} high)`
                        );
                    } catch (error) {
                        statusBarItem.text = '$(error) RepoSense: Scan failed';
                        vscode.window.showErrorMessage(`RepoSense scan failed: ${error}`);
                    }
                }
            );
        }
    );

    const generateTestsCommand = vscode.commands.registerCommand(
        'reposense.generateTests',
        () => {
            vscode.window.showInformationMessage(
                'Test generation will be implemented in Epic 4'
            );
        }
    );

    const showReportCommand = vscode.commands.registerCommand(
        'reposense.showReport',
        () => {
            if (!lastAnalysisResult) {
                vscode.window.showWarningMessage(
                    'No analysis data available. Please run a scan first.',
                    'Scan Now'
                ).then(action => {
                    if (action === 'Scan Now') {
                        vscode.commands.executeCommand('reposense.scanRepository');
                    }
                });
                return;
            }
            
            ReportPanel.createOrShow(
                context.extensionUri,
                lastAnalysisResult.gaps,
                lastAnalysisResult.summary
            );
        }
    );

    const fixGapCommand = vscode.commands.registerCommand(
        'reposense.fixGap',
        () => {
            vscode.window.showInformationMessage(
                'Gap remediation will be implemented in Epic 5'
            );
        }
    );

    // New commands for enhanced TreeView interactions
    const changeGroupingCommand = vscode.commands.registerCommand(
        'reposense.changeGrouping',
        async () => {
            const options = ['Severity', 'Type', 'File'];
            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select grouping mode'
            });
            
            if (selected) {
                const groupBy = selected.toLowerCase() as 'severity' | 'type' | 'file';
                gapAnalysisProvider.setGrouping(groupBy);
                vscode.window.showInformationMessage(`Grouped by ${selected}`);
            }
        }
    );

    const openInEditorCommand = vscode.commands.registerCommand(
        'reposense.openInEditor',
        (item: any) => {
            if (item?.gap?.file && item?.gap?.line) {
                const uri = vscode.Uri.file(item.gap.file);
                vscode.window.showTextDocument(uri, {
                    selection: new vscode.Range(item.gap.line - 1, 0, item.gap.line - 1, 0)
                });
            } else if (item?.remediation?.file && item?.remediation?.line) {
                const uri = vscode.Uri.file(item.remediation.file);
                vscode.window.showTextDocument(uri, {
                    selection: new vscode.Range(item.remediation.line - 1, 0, item.remediation.line - 1, 0)
                });
            } else if (item?.testCase?.file && item?.testCase?.line) {
                const uri = vscode.Uri.file(item.testCase.file);
                vscode.window.showTextDocument(uri, {
                    selection: new vscode.Range(item.testCase.line - 1, 0, item.testCase.line - 1, 0)
                });
            }
        }
    );

    const applyAutoFixCommand = vscode.commands.registerCommand(
        'reposense.applyAutoFix',
        (item: any) => {
            if (item?.remediation?.autoFixAvailable) {
                vscode.window.showInformationMessage(
                    `Auto-fix for "${item.remediation.title}" will be implemented in Epic 5`
                );
            } else {
                vscode.window.showWarningMessage('Auto-fix not available for this item');
            }
        }
    );

    const runTestCommand = vscode.commands.registerCommand(
        'reposense.runTest',
        (item: any) => {
            if (item?.testCase) {
                vscode.window.showInformationMessage(
                    `Running test "${item.testCase.name}" - Test execution will be implemented in Epic 5`
                );
            }
        }
    );

    const copyGapDetailsCommand = vscode.commands.registerCommand(
        'reposense.copyGapDetails',
        (item: any) => {
            if (item?.gap) {
                const details = `Gap: ${item.gap.message}\nFile: ${item.gap.file}:${item.gap.line}\nSeverity: ${item.gap.severity}\nSuggested Fix: ${item.gap.suggestedFix || 'N/A'}`;
                vscode.env.clipboard.writeText(details);
                vscode.window.showInformationMessage('Gap details copied to clipboard');
            }
        }
    );

    // CodeLens commands
    const showGapDetailsCommand = vscode.commands.registerCommand(
        'reposense.showGapDetails',
        (gap: any) => {
            const message = `**${gap.type.toUpperCase()}**\n\n${gap.message}\n\nSeverity: ${gap.severity}\n\n${gap.suggestedFix ? 'Suggested Fix: ' + gap.suggestedFix : ''}`;
            vscode.window.showInformationMessage(message, 'Fix Gap', 'Ignore').then(action => {
                if (action === 'Fix Gap') {
                    vscode.commands.executeCommand('reposense.fixGap', gap);
                }
            });
        }
    );

    const applyQuickFixCommand = vscode.commands.registerCommand(
        'reposense.applyQuickFix',
        (gap: any) => {
            vscode.window.showInformationMessage(
                `Quick fix: ${gap.suggestedFix}\n\nAuto-remediation will be implemented in Epic 5`,
                'Apply', 'Cancel'
            );
        }
    );

    const analyzeEndpointCommand = vscode.commands.registerCommand(
        'reposense.analyzeEndpoint',
        (endpoint: string, file: string, line: number) => {
            vscode.window.showInformationMessage(
                `Analyzing endpoint: ${endpoint}\n\nEndpoint coverage analysis will show which backends match this call.`,
                'View Backend', 'Generate Endpoint'
            );
        }
    );

    const generateEndpointCommand = vscode.commands.registerCommand(
        'reposense.generateEndpoint',
        (endpoint: string) => {
            vscode.window.showInformationMessage(
                `Generate backend endpoint: ${endpoint}\n\nEndpoint scaffolding will be implemented in Epic 5`,
                'Generate', 'Cancel'
            );
        }
    );

    const checkEndpointUsageCommand = vscode.commands.registerCommand(
        'reposense.checkEndpointUsage',
        (method: string, path: string, file: string, line: number) => {
            vscode.window.showInformationMessage(
                `Checking frontend usage for: ${method} ${path}\n\nUsage tracking will show all frontend calls to this endpoint.`,
                'View Callers'
            );
        }
    );

    const showUnusedEndpointCommand = vscode.commands.registerCommand(
        'reposense.showUnusedEndpoint',
        (method: string, path: string) => {
            vscode.window.showWarningMessage(
                `Unused endpoint detected: ${method} ${path}\n\nConsider removing this endpoint or adding frontend usage.`,
                'Remove Endpoint', 'Keep', 'Generate Frontend Call'
            );
        }
    );

    // Additional CodeAction commands
    const ignoreGapCommand = vscode.commands.registerCommand(
        'reposense.ignoreGap',
        (gap: any) => {
            vscode.window.showInformationMessage(
                `Gap ignored. Ignore functionality will be implemented in Epic 5.`,
                'Undo'
            );
        }
    );

    const removeUnusedEndpointCommand = vscode.commands.registerCommand(
        'reposense.removeUnusedEndpoint',
        (gap: any) => {
            vscode.window.showInformationMessage(
                `Remove endpoint: ${gap.message}\n\nCode removal will be implemented in Epic 5`,
                'Remove', 'Cancel'
            );
        }
    );

    const generateFrontendCallCommand = vscode.commands.registerCommand(
        'reposense.generateFrontendCall',
        (gap: any) => {
            vscode.window.showInformationMessage(
                `Generate frontend API call for: ${gap.message}\n\nCode generation will be implemented in Epic 5`,
                'Generate', 'Cancel'
            );
        }
    );

    context.subscriptions.push(
        scanCommand,
        generateTestsCommand,
        showReportCommand,
        fixGapCommand,
        changeGroupingCommand,
        openInEditorCommand,
        applyAutoFixCommand,
        runTestCommand,
        copyGapDetailsCommand,
        showGapDetailsCommand,
        applyQuickFixCommand,
        analyzeEndpointCommand,
        generateEndpointCommand,
        checkEndpointUsageCommand,
        showUnusedEndpointCommand,
        ignoreGapCommand,
        removeUnusedEndpointCommand,
        generateFrontendCallCommand
    );
}

export function deactivate(): Thenable<void> | undefined {
    console.log('RepoSense extension is now deactivated');
    if (!languageClient) {
        return undefined;
    }
    return languageClient.stop();
}

function startLanguageServer(context: vscode.ExtensionContext): LanguageClient {
    // Path to the server module
    const serverModule = context.asAbsolutePath(
        path.join('out', 'server', 'server.js')
    );

    // Server options: run the server in Node.js
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: { execArgv: ['--nolazy', '--inspect=6009'] }
        }
    };

    // Client options: define which documents to sync
    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'typescript' },
            { scheme: 'file', language: 'javascript' },
            { scheme: 'file', language: 'typescriptreact' },
            { scheme: 'file', language: 'javascriptreact' },
            { scheme: 'file', language: 'python' }
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{ts,js,tsx,jsx,py}')
        }
    };

    // Create and start the language client
    const client = new LanguageClient(
        'reposense',
        'RepoSense Language Server',
        serverOptions,
        clientOptions
    );

    client.start();

    return client;
}
