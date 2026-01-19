import * as vscode from 'vscode';
import { GapItem } from '../models/types';

export class RepoSenseCodeActionProvider implements vscode.CodeActionProvider {
    private gaps: GapItem[] = [];

    public updateGaps(gaps: GapItem[]): void {
        this.gaps = gaps;
    }

    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.CodeAction[] | undefined {
        const codeActions: vscode.CodeAction[] = [];

        // Find gaps at this location
        const gapsAtLocation = this.gaps.filter(gap => 
            gap.file.toLowerCase() === document.uri.fsPath.toLowerCase() &&
            gap.line - 1 === range.start.line
        );

        for (const gap of gapsAtLocation) {
            // Add quick fix action if suggested fix is available
            if (gap.suggestedFix) {
                const fixAction = new vscode.CodeAction(
                    `💡 ${gap.suggestedFix}`,
                    vscode.CodeActionKind.QuickFix
                );
                fixAction.command = {
                    title: 'Apply RepoSense Fix',
                    command: 'reposense.fixGap',
                    arguments: [gap]
                };
                fixAction.diagnostics = context.diagnostics.filter(d => 
                    d.source === 'RepoSense' && d.code === gap.type
                );
                fixAction.isPreferred = gap.severity === 'CRITICAL';
                codeActions.push(fixAction);
            }

            // Add "Show in Report" action
            const showAction = new vscode.CodeAction(
                '📊 Show in RepoSense Report',
                vscode.CodeActionKind.RefactorInline
            );
            showAction.command = {
                title: 'Show Gap Details',
                command: 'reposense.showGapDetails',
                arguments: [gap]
            };
            codeActions.push(showAction);

            // Add ignore action
            const ignoreAction = new vscode.CodeAction(
                '🚫 Ignore This Gap',
                vscode.CodeActionKind.Empty
            );
            ignoreAction.command = {
                title: 'Ignore Gap',
                command: 'reposense.ignoreGap',
                arguments: [gap]
            };
            codeActions.push(ignoreAction);

            // Type-specific actions
            if (gap.type === 'orphaned_component') {
                const generateAction = new vscode.CodeAction(
                    '🔧 Generate Missing Endpoint',
                    vscode.CodeActionKind.RefactorExtract
                );
                generateAction.command = {
                    title: 'Generate Endpoint',
                    command: 'reposense.generateEndpoint',
                    arguments: [gap.message] // Extract endpoint from message
                };
                codeActions.push(generateAction);
            }

            if (gap.type === 'unused_endpoint') {
                const removeAction = new vscode.CodeAction(
                    '🗑️ Remove Unused Endpoint',
                    vscode.CodeActionKind.QuickFix
                );
                removeAction.command = {
                    title: 'Remove Endpoint',
                    command: 'reposense.removeUnusedEndpoint',
                    arguments: [gap]
                };
                codeActions.push(removeAction);

                const generateCallAction = new vscode.CodeAction(
                    '➕ Generate Frontend Call',
                    vscode.CodeActionKind.RefactorExtract
                );
                generateCallAction.command = {
                    title: 'Generate Call',
                    command: 'reposense.generateFrontendCall',
                    arguments: [gap]
                };
                codeActions.push(generateCallAction);
            }
        }

        return codeActions.length > 0 ? codeActions : undefined;
    }
}
