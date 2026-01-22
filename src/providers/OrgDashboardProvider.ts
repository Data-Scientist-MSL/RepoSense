/**
 * Sprint 16 D4: Organization Dashboard Provider
 * 
 * WebView panel displaying system health, cross-team dependencies, and blast radius.
 */

import * as vscode from 'vscode';

export class OrgDashboardProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private orgGraph: any = null;

  constructor(private context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };

    webviewView.webview.html = this.getHtmlContent();

    // Listen for messages from webview
    webviewView.webview.onDidReceiveMessage(message => {
      if (message.command === 'refreshDashboard') {
        this.refreshDashboard();
      }
    });
  }

  /**
   * Refresh dashboard with latest org-graph data
   */
  async refreshDashboard(): Promise<void> {
    // Load latest org-graph from .reposense/org-runs/
    try {
      const fs = require('fs');
      const path = require('path');

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (!workspaceRoot) return;

      const orgRunsPath = path.join(workspaceRoot, '.reposense', 'org-runs');
      
      if (!fs.existsSync(orgRunsPath)) {
        this.view?.webview.postMessage({
          type: 'noData',
          message: 'No org-graph available. Run multi-repo scan first.'
        });
        return;
      }

      // Get latest run
      const runs = fs.readdirSync(orgRunsPath);
      if (runs.length === 0) {
        return;
      }

      const latestRun = runs[runs.length - 1];
      const orgGraphPath = path.join(orgRunsPath, latestRun, 'org-graph.json');

      if (fs.existsSync(orgGraphPath)) {
        this.orgGraph = JSON.parse(fs.readFileSync(orgGraphPath, 'utf8'));
        this.renderDashboard();
      }
    } catch (error) {
      console.error('Dashboard refresh failed:', error);
    }
  }

  /**
   * Render dashboard with org-graph data
   */
  private renderDashboard(): void {
    if (!this.orgGraph || !this.view) return;

    const systemHealth = this.calculateSystemHealth();
    const driftStats = this.calculateDriftStats();
    const highRiskChanges = this.findHighRiskChanges();

    this.view.webview.postMessage({
      type: 'dashboardUpdate',
      data: {
        systemHealth,
        driftStats,
        highRiskChanges,
        repositoryCount: this.orgGraph.repos?.size || 0,
        contractCount: this.orgGraph.contracts?.length || 0
      }
    });
  }

  /**
   * Calculate overall system health (0-100)
   */
  private calculateSystemHealth(): number {
    if (!this.orgGraph) return 0;

    let healthScore = 100;

    // Deduct for breaking changes
    const breakingChanges = this.orgGraph.contracts?.filter((c: any) => c.breaking).length || 0;
    healthScore -= breakingChanges * 10;

    // Deduct for drifted repos
    const driftedRepos = Object.values(this.orgGraph.driftMap || {}).filter(
      (status: any) => status !== 'HEALTHY'
    ).length;
    healthScore -= driftedRepos * 5;

    return Math.max(0, healthScore);
  }

  /**
   * Calculate drift statistics
   */
  private calculateDriftStats(): object {
    const driftMap = this.orgGraph.driftMap || {};
    
    return {
      healthy: Object.values(driftMap).filter((s: any) => s === 'HEALTHY').length,
      drift: Object.values(driftMap).filter((s: any) => s === 'DRIFT').length,
      breaking: Object.values(driftMap).filter((s: any) => s === 'BREAKING').length
    };
  }

  /**
   * Find high-risk changes
   */
  private findHighRiskChanges(): any[] {
    const contracts = this.orgGraph.contracts || [];
    
    return contracts
      .filter((c: any) => c.breaking)
      .slice(0, 10)
      .map((c: any, index: number) => ({
        id: index,
        from: c.producer,
        to: c.consumer,
        severity: 'critical',
        impact: `Breaking change: ${c.producer} → ${c.consumer}`
      }));
  }

  /**
   * Get HTML content for webview
   */
  private getHtmlContent(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RepoSense Organization Dashboard</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 16px;
          }
          
          .dashboard {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
          }
          
          .card h2 {
            font-size: 14px;
            margin-bottom: 12px;
            color: var(--vscode-terminal-ansiGreen);
          }
          
          .metric {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .metric:last-child {
            border-bottom: none;
          }
          
          .metric-label {
            font-weight: 500;
          }
          
          .metric-value {
            font-family: 'Courier New', monospace;
            color: var(--vscode-terminal-ansiCyan);
          }
          
          .status-healthy { color: var(--vscode-terminal-ansiGreen); }
          .status-drift { color: var(--vscode-terminal-ansiYellow); }
          .status-breaking { color: var(--vscode-terminal-ansiRed); }
          
          .progress-bar {
            width: 100%;
            height: 4px;
            background: var(--vscode-panel-border);
            border-radius: 2px;
            overflow: hidden;
            margin-top: 4px;
          }
          
          .progress-fill {
            height: 100%;
            background: var(--vscode-terminal-ansiGreen);
            border-radius: 2px;
          }
          
          button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
          }
          
          button:hover {
            background: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <div class="dashboard">
          <div class="card">
            <h2>🏥 System Health</h2>
            <div class="metric">
              <span class="metric-label">Overall Score</span>
              <span class="metric-value" id="healthScore">--</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" id="healthBar"></div>
            </div>
          </div>
          
          <div class="card">
            <h2>📊 Repository Status</h2>
            <div class="metric">
              <span class="metric-label">Total Repositories</span>
              <span class="metric-value" id="repoCount">--</span>
            </div>
            <div class="metric">
              <span class="metric-label" style="color: var(--vscode-terminal-ansiGreen);">Healthy</span>
              <span class="metric-value status-healthy" id="healthyRepos">--</span>
            </div>
            <div class="metric">
              <span class="metric-label" style="color: var(--vscode-terminal-ansiYellow);">Drifted</span>
              <span class="metric-value status-drift" id="driftedRepos">--</span>
            </div>
            <div class="metric">
              <span class="metric-label" style="color: var(--vscode-terminal-ansiRed);">Breaking</span>
              <span class="metric-value status-breaking" id="breakingRepos">--</span>
            </div>
          </div>
          
          <div class="card">
            <h2>⚡ High-Risk Changes</h2>
            <div id="riskChanges"></div>
          </div>
          
          <div class="card">
            <button onclick="refreshDashboard()">🔄 Refresh Dashboard</button>
          </div>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function refreshDashboard() {
            vscode.postMessage({ command: 'refreshDashboard' });
          }
          
          window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.type === 'dashboardUpdate') {
              updateDashboard(message.data);
            } else if (message.type === 'noData') {
              document.body.innerHTML = '<p style="padding: 20px;">' + message.message + '</p>';
            }
          });
          
          function updateDashboard(data) {
            const health = data.systemHealth || 0;
            document.getElementById('healthScore').textContent = health + '/100';
            document.getElementById('healthBar').style.width = health + '%';
            
            document.getElementById('repoCount').textContent = data.repositoryCount;
            document.getElementById('healthyRepos').textContent = data.driftStats?.healthy || 0;
            document.getElementById('driftedRepos').textContent = data.driftStats?.drift || 0;
            document.getElementById('breakingRepos').textContent = data.driftStats?.breaking || 0;
            
            const risksHtml = (data.highRiskChanges || []).map(risk =>
              '<div class="metric"><span>' + risk.from + '</span><span style="color: red;">→ ' + risk.to + '</span></div>'
            ).join('');
            
            document.getElementById('riskChanges').innerHTML = risksHtml || '<p style="color: var(--vscode-terminal-ansiGreen);">No high-risk changes detected</p>';
          }
          
          // Initial refresh
          refreshDashboard();
        </script>
      </body>
      </html>
    `;
  }
}
