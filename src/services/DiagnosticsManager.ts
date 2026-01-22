import * as vscode from 'vscode';
import { GapItem } from '../models/types';

export class DiagnosticsManager {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('reposense');
    }

    public updateDiagnostics(gaps: GapItem[]): void {
        // Clear existing diagnostics
        this.diagnosticCollection.clear();

        // Group gaps by file
        const fileGaps = new Map<string, GapItem[]>();
        for (const gap of gaps) {
            const existing = fileGaps.get(gap.file) || [];
            existing.push(gap);
            fileGaps.set(gap.file, existing);
        }

        // Create diagnostics for each file
        for (const [file, gapsInFile] of fileGaps) {
            const uri = vscode.Uri.file(file);
            const diagnostics: vscode.Diagnostic[] = [];

            for (const gap of gapsInFile) {
                const diagnostic = this.createDiagnostic(gap);
                diagnostics.push(diagnostic);
            }

            this.diagnosticCollection.set(uri, diagnostics);
        }
    }

    private createDiagnostic(gap: GapItem): vscode.Diagnostic {
        const line = Math.max(0, gap.line - 1);
        const range = new vscode.Range(line, 0, line, 1000);
        
        const diagnostic = new vscode.Diagnostic(
            range,
            gap.message,
            this.getSeverity(gap.severity)
        );

        diagnostic.code = gap.type;
        diagnostic.source = 'RepoSense';

        if (gap.suggestedFix) {
            diagnostic.relatedInformation = [
                new vscode.DiagnosticRelatedInformation(
                    new vscode.Location(vscode.Uri.file(gap.file), range),
                    `Suggested Fix: ${gap.suggestedFix}`
                )
            ];
        }

        return diagnostic;
    }

    private getSeverity(severity: string): vscode.DiagnosticSeverity {
        switch (severity) {
            case 'CRITICAL':
            case 'HIGH':
                return vscode.DiagnosticSeverity.Error;
            case 'MEDIUM':
                return vscode.DiagnosticSeverity.Warning;
            case 'LOW':
                return vscode.DiagnosticSeverity.Information;
            default:
                return vscode.DiagnosticSeverity.Hint;
        }
    }

    public clear(): void {
        this.diagnosticCollection.clear();
    }

    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
}
