import * as vscode from 'vscode';
import { GapItem } from '../models/types';

export class ReportPanel {
    public static currentPanel: ReportPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _gaps: GapItem[] = [];
    private _summary: any = {};

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set HTML content
        this._update();

        // Handle messages from webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'export':
                        this._handleExport(message.format);
                        break;
                    case 'openFile':
                        this._openFile(message.file, message.line);
                        break;
                    case 'fixGap':
                        vscode.commands.executeCommand('reposense.fixGap', message.gap);
                        break;
                }
            },
            null,
            this._disposables
        );

        // Handle panel dispose
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static createOrShow(extensionUri: vscode.Uri, gaps: GapItem[], summary: any) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (ReportPanel.currentPanel) {
            ReportPanel.currentPanel._panel.reveal(column);
            ReportPanel.currentPanel.updateData(gaps, summary);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'reposenseReport',
            'RepoSense Report',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
                retainContextWhenHidden: true
            }
        );

        ReportPanel.currentPanel = new ReportPanel(panel, extensionUri);
        ReportPanel.currentPanel.updateData(gaps, summary);
    }

    public updateData(gaps: GapItem[], summary: any) {
        this._gaps = gaps;
        this._summary = summary;
        this._update();
    }

    private _update() {
        this._panel.webview.html = this._getHtmlContent();
    }

    private _getHtmlContent(): string {
        const webview = this._panel.webview;
        
        // Group gaps by severity
        const critical = this._gaps.filter(g => g.severity === 'CRITICAL');
        const high = this._gaps.filter(g => g.severity === 'HIGH');
        const medium = this._gaps.filter(g => g.severity === 'MEDIUM');
        const low = this._gaps.filter(g => g.severity === 'LOW');

        // Calculate statistics
        const totalGaps = this._gaps.length;
        const orphanedComponents = this._gaps.filter(g => g.type === 'orphaned_component').length;
        const unusedEndpoints = this._gaps.filter(g => g.type === 'unused_endpoint').length;
        const suggestions = this._gaps.filter(g => g.type === 'suggestion').length;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RepoSense Report</title>
    <style>
        :root {
            --vscode-font-family: var(--vscode-editor-font-family);
            --error-color: var(--vscode-errorForeground);
            --warning-color: var(--vscode-editorWarning-foreground);
            --info-color: var(--vscode-editorInfo-foreground);
            --success-color: var(--vscode-terminal-ansiGreen);
        }
        
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            line-height: 1.6;
        }
        
        h1, h2, h3 {
            color: var(--vscode-foreground);
            margin-top: 1.5em;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .export-buttons {
            display: flex;
            gap: 10px;
        }
        
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
        }
        
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .stat-card {
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 3em;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .stat-label {
            font-size: 0.9em;
            opacity: 0.8;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .critical { color: var(--error-color); }
        .high { color: var(--warning-color); }
        .medium { color: var(--info-color); }
        .low { color: var(--success-color); }
        
        .gap-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: var(--vscode-editorWidget-background);
        }
        
        .gap-table th,
        .gap-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .gap-table th {
            background: var(--vscode-editorGroupHeader-tabsBackground);
            font-weight: 600;
            position: sticky;
            top: 0;
        }
        
        .gap-table tr:hover {
            background: var(--vscode-list-hoverBackground);
            cursor: pointer;
        }
        
        .severity-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .badge-critical {
            background: rgba(255, 0, 0, 0.2);
            color: var(--error-color);
        }
        
        .badge-high {
            background: rgba(255, 165, 0, 0.2);
            color: var(--warning-color);
        }
        
        .badge-medium {
            background: rgba(0, 123, 255, 0.2);
            color: var(--info-color);
        }
        
        .badge-low {
            background: rgba(0, 255, 0, 0.2);
            color: var(--success-color);
        }
        
        .chart-container {
            margin: 30px 0;
            padding: 20px;
            background: var(--vscode-editorWidget-background);
            border-radius: 8px;
        }
        
        .bar-chart {
            display: flex;
            align-items: flex-end;
            height: 200px;
            gap: 20px;
            margin: 20px 0;
        }
        
        .bar {
            flex: 1;
            background: linear-gradient(180deg, var(--bar-color), transparent);
            border-radius: 4px 4px 0 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            padding: 10px;
            min-height: 40px;
            position: relative;
        }
        
        .bar-value {
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 10px;
        }
        
        .bar-label {
            position: absolute;
            bottom: -30px;
            font-size: 0.85em;
        }
        
        .file-link {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        
        .file-link:hover {
            text-decoration: underline;
        }
        
        .action-button {
            padding: 4px 8px;
            font-size: 0.85em;
            margin-left: 10px;
        }
        
        .section {
            margin: 40px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>RepoSense Analysis Report</h1>
            <p>Comprehensive analysis of frontend-backend connectivity gaps</p>
        </div>
        <div class="export-buttons">
            <button onclick="exportReport('json')">📥 Export JSON</button>
            <button onclick="exportReport('csv')">📊 Export CSV</button>
            <button onclick="window.print()">🖨️ Print</button>
        </div>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-label">Total Gaps</div>
            <div class="stat-number">${totalGaps}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label critical">Critical</div>
            <div class="stat-number critical">${critical.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label high">High</div>
            <div class="stat-number high">${high.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label medium">Medium</div>
            <div class="stat-number medium">${medium.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label low">Low</div>
            <div class="stat-number low">${low.length}</div>
        </div>
    </div>
    
    <div class="chart-container">
        <h2>Gap Distribution by Type</h2>
        <div class="bar-chart">
            <div class="bar" style="--bar-color: var(--error-color); height: ${orphanedComponents / Math.max(orphanedComponents, unusedEndpoints, suggestions, 1) * 100}%;">
                <div class="bar-value">${orphanedComponents}</div>
                <div class="bar-label">Orphaned Components</div>
            </div>
            <div class="bar" style="--bar-color: var(--warning-color); height: ${unusedEndpoints / Math.max(orphanedComponents, unusedEndpoints, suggestions, 1) * 100}%;">
                <div class="bar-value">${unusedEndpoints}</div>
                <div class="bar-label">Unused Endpoints</div>
            </div>
            <div class="bar" style="--bar-color: var(--info-color); height: ${suggestions / Math.max(orphanedComponents, unusedEndpoints, suggestions, 1) * 100}%;">
                <div class="bar-value">${suggestions}</div>
                <div class="bar-label">Suggestions</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>Critical Gaps</h2>
        ${this._generateGapTable(critical)}
    </div>
    
    <div class="section">
        <h2>All Gaps</h2>
        ${this._generateGapTable(this._gaps)}
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function exportReport(format) {
            vscode.postMessage({
                command: 'export',
                format: format
            });
        }
        
        function openFile(file, line) {
            vscode.postMessage({
                command: 'openFile',
                file: file,
                line: line
            });
        }
        
        function fixGap(gapIndex) {
            const gaps = ${JSON.stringify(this._gaps)};
            vscode.postMessage({
                command: 'fixGap',
                gap: gaps[gapIndex]
            });
        }
    </script>
</body>
</html>`;
    }

    private _generateGapTable(gaps: GapItem[]): string {
        if (gaps.length === 0) {
            return '<p>No gaps found in this category.</p>';
        }

        const rows = gaps.map((gap, index) => `
            <tr onclick="openFile('${gap.file}', ${gap.line})">
                <td><span class="severity-badge badge-${gap.severity.toLowerCase()}">${gap.severity}</span></td>
                <td>${gap.type.replace('_', ' ')}</td>
                <td>${gap.message}</td>
                <td><a class="file-link" href="#" onclick="event.stopPropagation(); openFile('${gap.file}', ${gap.line});">${gap.file}:${gap.line}</a></td>
                <td>
                    ${gap.suggestedFix ? `<button class="action-button" onclick="event.stopPropagation(); fixGap(${this._gaps.indexOf(gap)})">Fix</button>` : ''}
                </td>
            </tr>
        `).join('');

        return `
            <table class="gap-table">
                <thead>
                    <tr>
                        <th>Severity</th>
                        <th>Type</th>
                        <th>Message</th>
                        <th>Location</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    private _handleExport(format: string) {
        if (format === 'json') {
            this._exportJSON();
        } else if (format === 'csv') {
            this._exportCSV();
        }
    }

    private async _exportJSON() {
        const data = {
            timestamp: new Date().toISOString(),
            summary: this._summary,
            gaps: this._gaps
        };

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('reposense-report.json'),
            filters: { 'JSON': ['json'] }
        });

        if (uri) {
            const content = JSON.stringify(data, null, 2);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            vscode.window.showInformationMessage(`Report exported to ${uri.fsPath}`);
        }
    }

    private async _exportCSV() {
        const headers = 'Severity,Type,Message,File,Line,Suggested Fix';
        const rows = this._gaps.map(gap => 
            `${gap.severity},${gap.type},"${gap.message}",${gap.file},${gap.line},"${gap.suggestedFix || ''}"`
        );
        const csv = [headers, ...rows].join('\n');

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('reposense-report.csv'),
            filters: { 'CSV': ['csv'] }
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(csv, 'utf8'));
            vscode.window.showInformationMessage(`Report exported to ${uri.fsPath}`);
        }
    }

    private _openFile(file: string, line: number) {
        const uri = vscode.Uri.file(file);
        vscode.window.showTextDocument(uri, {
            selection: new vscode.Range(line - 1, 0, line - 1, 0)
        });
    }

    public dispose() {
        ReportPanel.currentPanel = undefined;

        // Clean up resources
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
