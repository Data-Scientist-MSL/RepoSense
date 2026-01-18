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

let languageClient: LanguageClient;

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
            vscode.window.showInformationMessage(
                'Detailed report will be implemented in Epic 3'
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

    context.subscriptions.push(
        scanCommand,
        generateTestsCommand,
        showReportCommand,
        fixGapCommand
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
