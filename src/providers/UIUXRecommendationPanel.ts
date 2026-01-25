import * as vscode from 'vscode';
import * as path from 'path';
import { RecommendationPack, UIUXIssue } from '../services/UIUXAnalyzer';

export class UIUXRecommendationPanel {
  public static currentPanel: UIUXRecommendationPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, pack: RecommendationPack) {
    const column = vscode.ViewColumn.Beside;

    if (UIUXRecommendationPanel.currentPanel) {
      UIUXRecommendationPanel.currentPanel.panel.reveal(column);
      UIUXRecommendationPanel.currentPanel.update(pack);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'uiuxRecommendations',
      '🎨 UI/UX Recommendations',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );

    UIUXRecommendationPanel.currentPanel = new UIUXRecommendationPanel(panel, extensionUri, pack);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, pack: RecommendationPack) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.webview.html = this.getWebviewContent(pack);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'openFile':
            const uri = vscode.Uri.file(path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, message.file));
            vscode.window.showTextDocument(uri);
            return;
        }
      },
      null,
      this.disposables
    );
  }

  public update(pack: RecommendationPack) {
    this.panel.webview.postMessage({ command: 'update', pack });
  }

  private getWebviewContent(pack: RecommendationPack): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI/UX Recommendations</title>
    <style>
        :root {
            --accent: #0066cc;
            --bg: var(--vscode-editor-background);
            --fg: var(--vscode-editor-foreground);
            --border: var(--vscode-panel-border);
            --card-bg: var(--vscode-sideBar-background);
            --critical: #dc3545;
            --high: #fd7e14;
            --medium: #ffc107;
            --low: #28a745;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: var(--bg);
            color: var(--fg);
            padding: 20px;
            line-height: 1.6;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 2px solid var(--border);
            padding-bottom: 20px;
        }

        .header-info h1 { margin: 0; font-size: 24px; color: var(--accent); }
        .header-info p { margin: 5px 0 0; opacity: 0.7; font-size: 14px; }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 40px;
        }

        .score-card {
            background: var(--card-bg);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid var(--border);
        }

        .score-value { font-size: 32px; font-weight: bold; margin-bottom: 5px; }
        .score-label { font-size: 12px; text-transform: uppercase; opacity: 0.6; }

        .issue-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            margin-bottom: 30px;
            overflow: hidden;
        }

        .issue-header {
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border);
        }

        .issue-title-area { display: flex; align-items: center; gap: 10px; }
        .severity-badge {
            font-size: 10px;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            text-transform: uppercase;
            color: white;
        }
        .severity-critical { background: var(--critical); }
        .severity-high { background: var(--high); }
        .severity-medium { background: var(--medium); color: black; }
        .severity-low { background: var(--low); }

        .issue-content { padding: 20px; }
        
        .tab-buttons { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
        .tab-btn {
            background: none;
            border: none;
            color: var(--fg);
            padding: 10px 15px;
            cursor: pointer;
            opacity: 0.6;
            border-bottom: 2px solid transparent;
        }
        .tab-btn.active { opacity: 1; border-bottom-color: var(--accent); font-weight: bold; }

        .mockup-container {
            background: #eee;
            border-radius: 8px;
            padding: 10px;
            margin-top: 15px;
            text-align: center;
        }
        .mockup-img { max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

        .code-block {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 13px;
            margin: 10px 0;
        }

        .benefits-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
        }
        .benefit-tag {
            background: rgba(40, 167, 69, 0.1);
            color: var(--low);
            padding: 4px 10px;
            border-radius: 15px;
            font-size: 11px;
            border: 1px solid var(--low);
        }

        .roadmap-container {
            margin-top: 50px;
            padding: 20px;
            background: var(--card-bg);
            border-radius: 12px;
            border: 1px solid var(--border);
        }

        .roadmap-phase {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            position: relative;
        }
        .phase-number {
            width: 40px;
            height: 40px;
            background: var(--accent);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            flex-shrink: 0;
        }
        .phase-content { flex: 1; padding-top: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-info">
            <h1>🎨 UI/UX Recommendations</h1>
            <p>Analysis for: ${pack.endpoint} • Generated at: ${new Date(pack.generatedAt).toLocaleString()}</p>
        </div>
        <div class="header-actions">
            <!-- Action buttons could go here -->
        </div>
    </div>

    <div class="summary-grid">
        <div class="score-card">
            <div class="score-value" style="color: ${this.getScoreColor(pack.overallScore.accessibility)}">${pack.overallScore.accessibility}%</div>
            <div class="score-label">Accessibility</div>
        </div>
        <div class="score-card">
            <div class="score-value" style="color: ${this.getScoreColor(pack.overallScore.usability)}">${pack.overallScore.usability}%</div>
            <div class="score-label">Usability</div>
        </div>
        <div class="score-card">
            <div class="score-value" style="color: ${this.getScoreColor(pack.overallScore.visual)}">${pack.overallScore.visual}%</div>
            <div class="score-label">Visual Design</div>
        </div>
        <div class="score-card">
            <div class="score-value" style="color: ${this.getScoreColor(pack.overallScore.performance)}">${pack.overallScore.performance}%</div>
            <div class="score-label">Performance</div>
        </div>
    </div>

    <h2>⚠️ Detected Issues (${pack.issues.length})</h2>
    ${pack.issues.map(issue => `
        <div class="issue-card">
            <div class="issue-header">
                <div class="issue-title-area">
                    <span class="severity-badge severity-${issue.severity}">${issue.severity}</span>
                    <strong style="font-size: 16px;">${issue.title}</strong>
                </div>
                <span style="opacity: 0.6; font-size: 12px;">Step ${issue.detectedAt.stepNumber}</span>
            </div>
            <div class="issue-content">
                <p>${issue.description}</p>
                
                <div class="mockup-container">
                    <p style="font-size: 11px; margin-bottom: 8px; opacity: 0.6;">Side-by-side: Current Architecture vs Recommended Fix</p>
                    <img class="mockup-img" src="data:image/svg+xml;base64,${issue.toBe.mockup}" />
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                    <div>
                        <h3>🚩 Current Issues</h3>
                        <ul style="padding-left: 20px;">
                            ${issue.asIs.issues.map(i => `<li>${i}</li>`).join('')}
                        </ul>
                    </div>
                    <div>
                        <h3>✨ Improvements</h3>
                        <ul style="padding-left: 20px; color: var(--low);">
                            ${issue.toBe.improvements.map(i => `<li>${i}</li>`).join('')}
                        </ul>
                    </div>
                </div>

                ${issue.recommendations.map(rec => `
                    <div style="margin-top: 25px; padding-top: 20px; border-top: 1px dashed var(--border);">
                        <h4>💡 Recommendation: ${rec.title}</h4>
                        <p style="font-size: 13px;">${rec.description}</p>
                        ${rec.beforeCode ? `
                            <div style="font-size: 11px; margin-top: 10px;">Before:</div>
                            <pre class="code-block"><code>${this.escapeHtml(rec.beforeCode)}</code></pre>
                        ` : ''}
                        ${rec.afterCode ? `
                            <div style="font-size: 11px; margin-top: 10px;">After:</div>
                            <pre class="code-block" style="border-left: 4px solid var(--low);"><code>${this.escapeHtml(rec.afterCode)}</code></pre>
                        ` : ''}
                        <div class="benefits-list">
                            ${rec.benefits.map(b => `<span class="benefit-tag">✓ ${b}</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('')}

    <div class="roadmap-container">
        <h2>🛠️ Implementation Roadmap</h2>
        ${pack.prioritizedRoadmap.map(phase => `
            <div class="roadmap-phase">
                <div class="phase-number">${phase.phase}</div>
                <div class="phase-content">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="font-size: 15px;">${phase.name}</strong>
                        <span style="opacity: 0.6; font-size: 12px;">Est: ${phase.estimatedTime}</span>
                    </div>
                    <ul style="padding-left: 20px; margin-top: 10px; font-size: 13px;">
                        ${phase.issues.map(issueId => {
                            const issue = pack.issues.find(i => i.id === issueId);
                            return `<li>${issue ? issue.title : issueId}</li>`;
                        }).join('')}
                    </ul>
                </div>
            </div>
        `).join('')}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'update') {
               // Full reload for now to keep it simple, or update DOM
               window.location.reload();
            }
        });
    </script>
</body>
</html>`;
  }

  private getScoreColor(score: number): string {
    if (score >= 90) return '#28a745';
    if (score >= 70) return '#ffc107';
    return '#dc3545';
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  public dispose() {
    UIUXRecommendationPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) x.dispose();
    }
  }
}
