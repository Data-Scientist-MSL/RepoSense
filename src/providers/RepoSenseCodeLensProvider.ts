import * as vscode from 'vscode';
import { GapItem } from '../models/types';

export class RepoSenseCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    private gaps: GapItem[] = [];
    private apiCallPatterns = [
        /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /\$http\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /this\.http\.(get|post|put|delete|patch)<[^>]*>\s*\(\s*['"`]([^'"`]+)['"`]/g,
    ];

    constructor() {}

    public updateGaps(gaps: GapItem[]): void {
        this.gaps = gaps;
        this._onDidChangeCodeLenses.fire();
    }

    public provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];

        // Add CodeLens for gaps in this file
        const gapsInFile = this.gaps.filter(gap => 
            gap.file.toLowerCase() === document.uri.fsPath.toLowerCase()
        );

        for (const gap of gapsInFile) {
            const line = gap.line - 1;
            if (line >= 0 && line < document.lineCount) {
                const range = new vscode.Range(line, 0, line, 0);
                
                // Main gap CodeLens
                codeLenses.push(new vscode.CodeLens(range, {
                    title: this.getCodeLensTitle(gap),
                    tooltip: gap.message,
                    command: 'reposense.showGapDetails',
                    arguments: [gap]
                }));

                // Quick fix CodeLens if available
                if (gap.suggestedFix) {
                    codeLenses.push(new vscode.CodeLens(range, {
                        title: '💡 Quick Fix',
                        tooltip: gap.suggestedFix,
                        command: 'reposense.applyQuickFix',
                        arguments: [gap]
                    }));
                }
            }
        }

        // Add CodeLens for potential API calls in frontend files
        if (this.isFrontendFile(document)) {
            const apiCallLenses = this.detectAPICallsInDocument(document);
            codeLenses.push(...apiCallLenses);
        }

        // Add CodeLens for potential endpoints in backend files
        if (this.isBackendFile(document)) {
            const endpointLenses = this.detectEndpointsInDocument(document);
            codeLenses.push(...endpointLenses);
        }

        return codeLenses;
    }

    public resolveCodeLens(
        codeLens: vscode.CodeLens,
        token: vscode.CancellationToken
    ): vscode.CodeLens | Thenable<vscode.CodeLens> {
        return codeLens;
    }

    private getCodeLensTitle(gap: GapItem): string {
        const icon = this.getSeverityIcon(gap.severity);
        const type = gap.type.replace('_', ' ').toUpperCase();
        return `${icon} ${type}: ${gap.message.substring(0, 50)}...`;
    }

    private getSeverityIcon(severity: string): string {
        switch (severity) {
            case 'CRITICAL': return '🔴';
            case 'HIGH': return '🟠';
            case 'MEDIUM': return '🟡';
            case 'LOW': return '🟢';
            default: return '⚪';
        }
    }

    private isFrontendFile(document: vscode.TextDocument): boolean {
        const ext = document.fileName.toLowerCase();
        return ext.endsWith('.tsx') || 
               ext.endsWith('.jsx') || 
               ext.endsWith('.ts') && !ext.includes('controller') &&
               ext.endsWith('.js') && !ext.includes('controller') ||
               ext.endsWith('.vue');
    }

    private isBackendFile(document: vscode.TextDocument): boolean {
        const fileName = document.fileName.toLowerCase();
        return fileName.includes('controller') ||
               fileName.includes('route') ||
               fileName.includes('api') ||
               fileName.endsWith('.py');
    }

    private detectAPICallsInDocument(document: vscode.TextDocument): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for fetch calls
            const fetchMatch = line.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/);
            if (fetchMatch) {
                const endpoint = fetchMatch[1];
                const range = new vscode.Range(i, 0, i, 0);
                
                codeLenses.push(new vscode.CodeLens(range, {
                    title: `📡 API Call: ${endpoint}`,
                    tooltip: 'Click to analyze endpoint coverage',
                    command: 'reposense.analyzeEndpoint',
                    arguments: [endpoint, document.uri.fsPath, i + 1]
                }));

                // Check if this endpoint has a matching backend
                if (!this.hasMatchingEndpoint(endpoint)) {
                    codeLenses.push(new vscode.CodeLens(range, {
                        title: '⚠️ Missing Backend',
                        tooltip: 'No matching endpoint found in backend',
                        command: 'reposense.generateEndpoint',
                        arguments: [endpoint]
                    }));
                }
            }

            // Check for axios calls
            const axiosMatch = line.match(/axios\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
            if (axiosMatch) {
                const method = axiosMatch[1].toUpperCase();
                const endpoint = axiosMatch[2];
                const range = new vscode.Range(i, 0, i, 0);
                
                codeLenses.push(new vscode.CodeLens(range, {
                    title: `📡 ${method}: ${endpoint}`,
                    tooltip: 'Click to analyze endpoint coverage',
                    command: 'reposense.analyzeEndpoint',
                    arguments: [endpoint, document.uri.fsPath, i + 1]
                }));
            }
        }

        return codeLenses;
    }

    private detectEndpointsInDocument(document: vscode.TextDocument): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Express/NestJS route detection
            const expressMatch = line.match(/\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
            if (expressMatch) {
                const method = expressMatch[1].toUpperCase();
                const path = expressMatch[2];
                const range = new vscode.Range(i, 0, i, 0);
                
                codeLenses.push(new vscode.CodeLens(range, {
                    title: `🔌 Endpoint: ${method} ${path}`,
                    tooltip: 'Click to check frontend usage',
                    command: 'reposense.checkEndpointUsage',
                    arguments: [method, path, document.uri.fsPath, i + 1]
                }));

                // Check if this endpoint is used in frontend
                if (!this.hasMatchingAPICall(path)) {
                    codeLenses.push(new vscode.CodeLens(range, {
                        title: '⚠️ Unused Endpoint',
                        tooltip: 'No frontend calls found',
                        command: 'reposense.showUnusedEndpoint',
                        arguments: [method, path]
                    }));
                }
            }

            // FastAPI route detection
            const fastapiMatch = line.match(/@(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
            if (fastapiMatch) {
                const method = fastapiMatch[2].toUpperCase();
                const path = fastapiMatch[3];
                const range = new vscode.Range(i, 0, i, 0);
                
                codeLenses.push(new vscode.CodeLens(range, {
                    title: `🔌 FastAPI: ${method} ${path}`,
                    tooltip: 'Click to check frontend usage',
                    command: 'reposense.checkEndpointUsage',
                    arguments: [method, path, document.uri.fsPath, i + 1]
                }));
            }

            // Flask route detection
            const flaskMatch = line.match(/@app\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*methods\s*=\s*\[['"`](\w+)['"`]\]/);
            if (flaskMatch) {
                const path = flaskMatch[1];
                const method = flaskMatch[2].toUpperCase();
                const range = new vscode.Range(i, 0, i, 0);
                
                codeLenses.push(new vscode.CodeLens(range, {
                    title: `🔌 Flask: ${method} ${path}`,
                    tooltip: 'Click to check frontend usage',
                    command: 'reposense.checkEndpointUsage',
                    arguments: [method, path, document.uri.fsPath, i + 1]
                }));
            }
        }

        return codeLenses;
    }

    private hasMatchingEndpoint(apiCall: string): boolean {
        // Simplified check - will be enhanced with actual backend data
        return this.gaps.some(gap => 
            gap.type === 'orphaned_component' && gap.message.includes(apiCall)
        );
    }

    private hasMatchingAPICall(endpoint: string): boolean {
        // Simplified check - will be enhanced with actual frontend data
        return this.gaps.some(gap => 
            gap.type === 'unused_endpoint' && gap.message.includes(endpoint)
        );
    }
}
