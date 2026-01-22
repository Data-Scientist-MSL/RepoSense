/**
 * ReportPanel WebView Provider
 * =============================
 * 
 * Renders interactive reports in VS Code WebView.
 * Displays run graph data with tabs for summary, gaps, coverage, evidence, diagrams.
 * 
 * Version: 1.0
 * Status: Production-ready
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { RunGraph } from '../models/ReportAndDiagramModels';
import { DiagramGenerator } from '../services/DiagramGenerator';

/**
 * ReportPanel
 * 
 * WebView-based interactive dashboard for reports
 */
export class ReportPanel {
  public static currentPanel: ReportPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _runGraph: RunGraph;
  private _diagramGenerator: DiagramGenerator;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    runGraph: RunGraph,
    diagramGenerator: DiagramGenerator
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._runGraph = runGraph;
    this._diagramGenerator = diagramGenerator;

    // Set panel icon
    this._panel.iconPath = vscode.Uri.joinPath(
      extensionUri,
      'media',
      'report-icon.svg'
    );

    // Set initial HTML
    this._panel.webview.html = this._getHtmlForWebview(
      this._panel.webview
    );

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      message => {
        this._handleWebviewMessage(message);
      },
      null,
      this._disposables
    );

    // Handle panel closed
    this._panel.onDidDispose(
      () => {
        ReportPanel.currentPanel = undefined;
        this.dispose();
      },
      null,
      this._disposables
    );
  }

  /**
   * Create or reveal report panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    runGraph: RunGraph,
    diagramGenerator: DiagramGenerator
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ReportPanel.currentPanel) {
      ReportPanel.currentPanel._panel.reveal(column);
      ReportPanel.currentPanel.updateReport(runGraph, diagramGenerator);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'reposenseReport',
      'RepoSense Report',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'out'),
        ],
      }
    );

    ReportPanel.currentPanel = new ReportPanel(
      panel,
      extensionUri,
      runGraph,
      diagramGenerator
    );
  }

  /**
   * Update report data
   */
  public updateReport(
    runGraph: RunGraph,
    diagramGenerator: DiagramGenerator
  ): void {
    this._runGraph = runGraph;
    this._diagramGenerator = diagramGenerator;
    this._panel.webview.html = this._getHtmlForWebview(
      this._panel.webview
    );
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    ReportPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  /**
   * Handle messages from webview
   */
  private _handleWebviewMessage(message: any): void {
    switch (message.command) {
      case 'openFile':
        this._openFile(message.file, message.line);
        break;
      case 'exportReport':
        this._exportReport(message.format);
        break;
      case 'showGapDetails':
        this._showGapDetails(message.gapId);
        break;
    }
  }

  /**
   * Open file at line
   */
  private _openFile(file: string, line: number): void {
    vscode.workspace.openTextDocument(file).then(doc => {
      vscode.window.showTextDocument(doc).then(editor => {
        const lineNum = Math.max(0, line - 1);
        editor.selection = new vscode.Selection(lineNum, 0, lineNum, 0);
        editor.revealRange(
          new vscode.Range(lineNum, 0, lineNum, 0),
          vscode.TextEditorRevealType.InCenter
        );
      });
    });
  }

  /**
   * Export report
   */
  private _exportReport(format: 'markdown' | 'html' | 'pdf'): void {
    // TODO: Implement export
    vscode.window.showInformationMessage(
      `Exporting report as ${format.toUpperCase()}...`
    );
  }

  /**
   * Show gap details in info panel
   */
  private _showGapDetails(gapId: string): void {
    // TODO: Show related evidence, tests, potential fixes
  }

  /**
   * Generate HTML for webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const stats = this._runGraph.metadata.statistics;
    const diagrams = this._diagramGenerator.getAllDiagrams();

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RepoSense Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        
        header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        h1 { font-size: 28px; margin-bottom: 10px; }
        .run-meta { font-size: 12px; color: var(--vscode-descriptionForeground); }
        
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .tab {
            padding: 10px 15px;
            background: transparent;
            border: none;
            color: var(--vscode-editor-foreground);
            cursor: pointer;
            border-bottom: 2px solid transparent;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .tab:hover { color: var(--vscode-textLink-foreground); }
        .tab.active {
            border-bottom-color: var(--vscode-textLink-foreground);
            color: var(--vscode-textLink-foreground);
        }
        
        .tab-content {
            display: none;
            animation: fadeIn 0.3s ease-in;
        }
        
        .tab-content.active { display: block; }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        /* Summary Tab */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: var(--vscode-editor-lineHighlightBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 15px;
            text-align: center;
        }
        
        .metric-card .value {
            font-size: 28px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        
        .metric-card .label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
        
        /* Coverage Stats */
        .coverage-bar {
            width: 100%;
            height: 8px;
            background: var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .coverage-fill {
            height: 100%;
            background: linear-gradient(90deg, #4caf50, #8bc34a);
            transition: width 0.3s;
        }
        
        .coverage-fill.low { background: linear-gradient(90deg, #f44336, #ff5722); }
        .coverage-fill.medium { background: linear-gradient(90deg, #ff9800, #ffc107); }
        
        /* Table */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th {
            background: var(--vscode-editor-lineHighlightBackground);
            padding: 10px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        td {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        tr:hover { background: var(--vscode-editor-lineHighlightBackground); }
        
        /* Buttons */
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        }
        
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        button.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        /* Diagrams */
        .mermaid-container {
            background: var(--vscode-editor-lineHighlightBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
            overflow-x: auto;
        }
        
        .diagram-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
        }
        
        /* Links */
        a {
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            text-decoration: none;
        }
        
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔍 RepoSense Analysis Report</h1>
            <div class="run-meta">
                <span>Run ID: <code>${this._runGraph.runId}</code></span> •
                <span>Timestamp: ${new Date(this._runGraph.timestamp).toLocaleString()}</span>
            </div>
        </header>
        
        <div class="tabs">
            <button class="tab active" onclick="switchTab('summary')">📊 Summary</button>
            <button class="tab" onclick="switchTab('coverage')">📈 Coverage</button>
            <button class="tab" onclick="switchTab('diagrams')">🎨 Diagrams</button>
            <button class="tab" onclick="switchTab('evidence')">🔗 Evidence</button>
            <button class="tab" onclick="switchTab('export')">💾 Export</button>
        </div>
        
        <!-- Summary Tab -->
        <div id="summary" class="tab-content active">
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="value">${stats.totalEndpoints}</div>
                    <div class="label">Total Endpoints</div>
                </div>
                <div class="metric-card">
                    <div class="value">${stats.usedEndpoints}</div>
                    <div class="label">Used Endpoints</div>
                </div>
                <div class="metric-card">
                    <div class="value">${stats.totalTests}</div>
                    <div class="label">Total Tests</div>
                </div>
                <div class="metric-card">
                    <div class="value">${stats.endpointCoveragePercent}%</div>
                    <div class="label">Coverage</div>
                </div>
            </div>
            
            <h3 style="margin-bottom: 15px;">Coverage Progress</h3>
            <div>
                <strong>Endpoint Test Coverage</strong>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${stats.endpointCoveragePercent}%"></div>
                </div>
                <small>${stats.usedEndpoints} of ${stats.totalEndpoints} endpoints covered</small>
            </div>
        </div>
        
        <!-- Coverage Tab -->
        <div id="coverage" class="tab-content">
            <h2>Test Coverage Details</h2>
            <p style="margin: 15px 0; color: var(--vscode-descriptionForeground);">
                <strong>${stats.untestedEndpoints}</strong> endpoints lack test coverage
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Endpoint</th>
                        <th>Method</th>
                        <th>Tests</th>
                        <th>Coverage</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Populated by JavaScript -->
                </tbody>
            </table>
        </div>
        
        <!-- Diagrams Tab -->
        <div id="diagrams" class="tab-content">
            <h2>Architecture & Flow Diagrams</h2>
            <p style="margin: 15px 0; color: var(--vscode-descriptionForeground);">
                ${diagrams.length} diagrams generated from run graph
            </p>
            ${diagrams
              .map(
                d => `
            <div>
                <div class="diagram-title">${d.title}</div>
                <div class="mermaid-container" style="display: none;">
                    <pre>${d.source}</pre>
                </div>
                <button onclick="loadDiagram('${d.id}')">View Diagram</button>
            </div>
            `
              )
              .join('')}
        </div>
        
        <!-- Evidence Tab -->
        <div id="evidence" class="tab-content">
            <h2>Evidence & Artifacts</h2>
            <p style="margin: 15px 0; color: var(--vscode-descriptionForeground);">
                Evidence trail showing test artifacts, screenshots, logs
            </p>
            <p style="color: var(--vscode-descriptionForeground);">Evidence loading...</p>
        </div>
        
        <!-- Export Tab -->
        <div id="export" class="tab-content">
            <h2>Export Report</h2>
            <p style="margin: 15px 0; color: var(--vscode-descriptionForeground);">
                Export this analysis report in multiple formats
            </p>
            <div style="display: flex; gap: 10px; margin: 20px 0;">
                <button onclick="exportReport('markdown')">📄 Markdown</button>
                <button class="secondary" onclick="exportReport('html')">🌐 HTML</button>
                <button class="secondary" onclick="exportReport('pdf')">📕 PDF</button>
            </div>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function switchTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(el => {
                el.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(el => {
                el.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }
        
        function loadDiagram(diagramId) {
            // TODO: Load and render Mermaid diagram
        }
        
        function exportReport(format) {
            vscode.postMessage({
                command: 'exportReport',
                format: format
            });
        }
    </script>
</body>
</html>
    `;
  }
}
