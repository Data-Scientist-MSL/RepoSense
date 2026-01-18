import * as vscode from 'vscode';
import { GapAnalysisProvider } from './providers/GapAnalysisProvider';
import { TestCaseProvider } from './providers/TestCaseProvider';
import { RemediationProvider } from './providers/RemediationProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('RepoSense extension is now active!');

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
            statusBarItem.text = '$(sync~spin) RepoSense: Scanning...';
            
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'RepoSense: Analyzing repository...',
                    cancellable: true
                },
                async (progress, token) => {
                    progress.report({ increment: 0, message: 'Initializing...' });
                    
                    // Simulate analysis (will be replaced with real analysis)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    progress.report({ increment: 50, message: 'Analyzing files...' });
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    progress.report({ increment: 100, message: 'Complete!' });
                    
                    if (token.isCancellationRequested) {
                        statusBarItem.text = '$(pulse) RepoSense Ready';
                        return;
                    }
                    
                    statusBarItem.text = '$(check) RepoSense: 0 gaps found';
                    vscode.window.showInformationMessage(
                        'RepoSense scan complete! No gaps detected.'
                    );
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

export function deactivate() {
    console.log('RepoSense extension is now deactivated');
}
