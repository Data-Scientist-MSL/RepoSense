"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveBrowserPreviewPanel = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
// ============================================================================
// LIVE BROWSER PREVIEW PANEL
// ============================================================================
class LiveBrowserPreviewPanel {
    static createOrShow(extensionUri, gap, baseUrl) {
        const column = vscode.ViewColumn.Two;
        // If we already have a panel, show it
        if (LiveBrowserPreviewPanel.currentPanel) {
            LiveBrowserPreviewPanel.currentPanel.panel.reveal(column);
            LiveBrowserPreviewPanel.currentPanel.resetTest(gap, baseUrl);
            return LiveBrowserPreviewPanel.currentPanel;
        }
        // Create new panel
        const panel = vscode.window.createWebviewPanel('liveBrowserPreview', '🤖 Live Testing Preview', column, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [extensionUri]
        });
        LiveBrowserPreviewPanel.currentPanel = new LiveBrowserPreviewPanel(panel, extensionUri, gap, baseUrl);
        return LiveBrowserPreviewPanel.currentPanel;
    }
    constructor(panel, extensionUri, gap, baseUrl) {
        this.disposables = [];
        this.panel = panel;
        this.extensionUri = extensionUri;
        // Initialize test state
        this.testState = {
            status: 'idle',
            currentStep: 0,
            totalSteps: 0,
            gap,
            baseUrl,
            startTime: Date.now(),
            steps: [],
            screenshots: [],
            networkLogs: [],
            agentThinking: 'Initializing agent...'
        };
        // Set up panel
        this.panel.webview.html = this.getWebviewContent();
        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(message => this.handleWebviewMessage(message), null, this.disposables);
        // Clean up on panel close
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        // Start live updates
        this.startLiveUpdates();
    }
    resetTest(gap, baseUrl) {
        this.testState = {
            status: 'idle',
            currentStep: 0,
            totalSteps: 0,
            gap,
            baseUrl,
            startTime: Date.now(),
            steps: [],
            screenshots: [],
            networkLogs: [],
            agentThinking: 'Initializing agent...'
        };
        this.update();
    }
    // ============================================================================
    // STATE UPDATES
    // ============================================================================
    updateStatus(status) {
        this.testState.status = status;
        this.update();
    }
    addStep(step) {
        const newStep = {
            ...step,
            stepNumber: this.testState.steps.length + 1,
            timestamp: Date.now()
        };
        this.testState.steps.push(newStep);
        this.testState.currentStep = newStep.stepNumber;
        this.update();
    }
    updateCurrentStep(updates) {
        if (this.testState.steps.length === 0)
            return;
        const currentIndex = this.testState.steps.length - 1;
        this.testState.steps[currentIndex] = {
            ...this.testState.steps[currentIndex],
            ...updates
        };
        this.update();
    }
    addScreenshot(screenshot) {
        this.testState.screenshots.push(screenshot);
        this.update();
    }
    addNetworkLog(log) {
        this.testState.networkLogs.push(log);
        this.update();
    }
    setAgentThinking(thinking) {
        this.testState.agentThinking = thinking;
        this.update();
    }
    setError(error) {
        this.testState.error = error;
        this.testState.status = 'failed';
        this.update();
    }
    // ============================================================================
    // LIVE UPDATES
    // ============================================================================
    startLiveUpdates() {
        this.updateInterval = setInterval(() => {
            this.update();
        }, 500); // Update every 500ms for smooth real-time feel
    }
    update() {
        this.panel.webview.postMessage({
            command: 'updateState',
            state: this.testState
        });
    }
    // ============================================================================
    // WEBVIEW MESSAGE HANDLING
    // ============================================================================
    handleWebviewMessage(message) {
        switch (message.command) {
            case 'pause':
                // Implement pause functionality
                vscode.window.showInformationMessage('Test paused');
                break;
            case 'stop':
                this.testState.status = 'failed';
                this.testState.error = 'Test stopped by user';
                this.update();
                break;
            case 'export':
                this.exportReport();
                break;
            case 'openInBrowser':
                vscode.env.openExternal(vscode.Uri.parse(this.testState.baseUrl));
                break;
        }
    }
    async exportReport() {
        const reportContent = this.generateMarkdownReport();
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('test-report.md'),
            filters: { 'Markdown': ['md'], 'HTML': ['html'], 'JSON': ['json'] }
        });
        if (uri) {
            fs.writeFileSync(uri.fsPath, reportContent);
            vscode.window.showInformationMessage(`Report saved to ${uri.fsPath}`);
        }
    }
    generateMarkdownReport() {
        const duration = Date.now() - this.testState.startTime;
        const status = this.testState.status === 'completed' ? '✅ PASSED' : '❌ FAILED';
        return `
# Live Test Report

**Status**: ${status}  
**Endpoint**: ${this.testState.gap.method} ${this.testState.gap.endpoint}  
**Duration**: ${(duration / 1000).toFixed(2)}s  
**Base URL**: ${this.testState.baseUrl}  

## Steps Executed

${this.testState.steps.map(step => `
### Step ${step.stepNumber}: ${step.goal}

**Action**: ${step.action}  
**Result**: ${step.result}  
**Thinking**: ${step.thinking}  
${step.details ? `**Details**: ${step.details}` : ''}
${step.duration ? `**Duration**: ${step.duration}ms` : ''}
`).join('\n')}

## Network Logs

${this.testState.networkLogs.map(log => `
- \`${log.method} ${log.url}\` → ${log.status || 'pending'}
`).join('\n')}

${this.testState.error ? `\n## Error\n\n\`\`\`\n${this.testState.error}\n\`\`\`` : ''}
`;
    }
    // ============================================================================
    // WEBVIEW HTML CONTENT
    // ============================================================================
    getWebviewContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Testing Preview</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            overflow: hidden;
            height: 100vh;
        }

        /* ============ LAYOUT ============ */
        .container {
            display: grid;
            grid-template-columns: 350px 1fr;
            grid-template-rows: 60px 1fr 200px;
            height: 100vh;
            gap: 0;
        }

        /* ============ HEADER ============ */
        .header {
            grid-column: 1 / -1;
            background: var(--vscode-titleBar-activeBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding: 12px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .status-badge {
            padding: 6px 14px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-idle { background: #6c757d; color: white; }
        .status-initializing { background: #ffc107; color: black; }
        .status-running { 
            background: #17a2b8; 
            color: white;
            animation: pulse 2s infinite;
        }
        .status-completed { background: #28a745; color: white; }
        .status-failed { background: #dc3545; color: white; }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .header-info h2 {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 2px;
        }

        .header-info p {
            font-size: 11px;
            opacity: 0.7;
        }

        .header-actions {
            display: flex;
            gap: 8px;
        }

        .btn {
            padding: 6px 14px;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .btn:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
        }

        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .btn-danger {
            background: #dc3545;
            color: white;
        }

        /* ============ SIDEBAR ============ */
        .sidebar {
            background: var(--vscode-sideBar-background);
            border-right: 1px solid var(--vscode-panel-border);
            overflow-y: auto;
            padding: 15px;
        }

        .section {
            margin-bottom: 25px;
        }

        .section-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            opacity: 0.6;
            margin-bottom: 12px;
        }

        /* Progress Section */
        .progress-item {
            margin-bottom: 15px;
        }

        .progress-label {
            font-size: 12px;
            margin-bottom: 6px;
            display: flex;
            justify-content: space-between;
        }

        .progress-bar {
            height: 6px;
            background: var(--vscode-progressBar-background);
            border-radius: 3px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: #17a2b8;
            transition: width 0.3s ease;
        }

        .timer {
            font-size: 20px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            color: #17a2b8;
        }

        /* Steps List */
        .step-item {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 8px;
            transition: all 0.2s;
        }

        .step-item:hover {
            border-color: #17a2b8;
        }

        .step-item.active {
            border-color: #17a2b8;
            box-shadow: 0 0 0 2px rgba(23, 162, 184, 0.2);
        }

        .step-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
        }

        .step-number {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }

        .step-goal {
            font-size: 12px;
            font-weight: 600;
            flex: 1;
        }

        .step-status {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        .step-status.pending { background: #6c757d; }
        .step-status.running { 
            background: #17a2b8;
            animation: blink 1s infinite;
        }
        .step-status.success { background: #28a745; }
        .step-status.failed { background: #dc3545; }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        .step-action {
            font-size: 11px;
            opacity: 0.7;
            margin-top: 4px;
        }

        .step-thinking {
            font-size: 10px;
            font-style: italic;
            opacity: 0.5;
            margin-top: 4px;
            padding: 4px 8px;
            background: rgba(23, 162, 184, 0.1);
            border-radius: 3px;
        }

        /* ============ MAIN CONTENT ============ */
        .main-content {
            overflow-y: auto;
            padding: 20px;
        }

        .browser-frame {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            margin-bottom: 20px;
        }

        .browser-chrome {
            background: #f1f3f4;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid #dadce0;
        }

        .browser-dots {
            display: flex;
            gap: 6px;
        }

        .browser-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        .dot-red { background: #ff5f56; }
        .dot-yellow { background: #ffbd2e; }
        .dot-green { background: #27c93f; }

        .browser-url {
            flex: 1;
            background: white;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 11px;
            color: #5f6368;
        }

        .screenshot-container {
            background: white;
            min-height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        .screenshot-img {
            max-width: 100%;
            height: auto;
            display: block;
        }

        .screenshot-placeholder {
            text-align: center;
            color: #999;
        }

        .screenshot-placeholder .icon {
            font-size: 48px;
            margin-bottom: 12px;
            opacity: 0.3;
        }

        .live-indicator {
            position: absolute;
            top: 12px;
            right: 12px;
            background: #dc3545;
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .live-dot {
            width: 6px;
            height: 6px;
            background: white;
            border-radius: 50%;
            animation: blink 1s infinite;
        }

        .agent-thinking-box {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 20px;
        }

        .agent-thinking-box h3 {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #17a2b8;
        }

        .agent-thinking-box p {
            font-size: 12px;
            line-height: 1.6;
            font-style: italic;
        }

        /* ============ BOTTOM PANEL ============ */
        .bottom-panel {
            grid-column: 1 / -1;
            background: var(--vscode-panel-background);
            border-top: 1px solid var(--vscode-panel-border);
            overflow-y: auto;
        }

        .tabs {
            display: flex;
            gap: 0;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-editorGroupHeader-tabsBackground);
        }

        .tab {
            padding: 8px 16px;
            font-size: 12px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }

        .tab:hover {
            background: var(--vscode-tab-hoverBackground);
        }

        .tab.active {
            border-bottom-color: #17a2b8;
            background: var(--vscode-tab-activeBackground);
        }

        .tab-content {
            padding: 12px;
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .log-entry {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            padding: 4px 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 12px;
        }

        .log-time {
            color: #6c757d;
            min-width: 80px;
        }

        .log-method {
            font-weight: 600;
            min-width: 50px;
        }

        .log-method.GET { color: #28a745; }
        .log-method.POST { color: #17a2b8; }
        .log-method.PUT { color: #ffc107; }
        .log-method.DELETE { color: #dc3545; }

        .log-url {
            flex: 1;
            opacity: 0.8;
            word-break: break-all;
        }

        .log-status {
            font-weight: 600;
            min-width: 40px;
            text-align: right;
        }

        .log-status.success { color: #28a745; }
        .log-status.error { color: #dc3545; }

        /* Scrollbars */
        ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }

        ::-webkit-scrollbar-track {
            background: transparent;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-background);
            border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                <div class="status-badge status-idle" id="statusBadge">IDLE</div>
                <div class="header-info">
                    <h2 id="endpointLabel">Waiting to start...</h2>
                    <p id="baseUrlLabel"></p>
                </div>
            </div>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="openInBrowser()">
                    🌐 Open in Browser
                </button>
                <button class="btn" onclick="exportReport()">
                    📄 Export Report
                </button>
                <button class="btn btn-danger" onclick="stopTest()">
                    ⏹️ Stop
                </button>
            </div>
        </div>

        <!-- Sidebar -->
        <div class="sidebar">
            <!-- Progress Section -->
            <div class="section">
                <div class="section-title">Progress</div>
                <div class="progress-item">
                    <div class="progress-label">
                        <span>Steps</span>
                        <span id="stepProgress">0 / 0</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                    </div>
                </div>
                <div class="progress-item">
                    <div class="progress-label">
                        <span>Duration</span>
                    </div>
                    <div class="timer" id="timer">00:00</div>
                </div>
            </div>

            <!-- Steps Section -->
            <div class="section">
                <div class="section-title">Test Steps</div>
                <div id="stepsList"></div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Agent Thinking -->
            <div class="agent-thinking-box">
                <h3>🧠 Agent Thinking</h3>
                <p id="agentThinking">Initializing agent...</p>
            </div>

            <!-- Browser Frame -->
            <div class="browser-frame">
                <div class="browser-chrome">
                    <div class="browser-dots">
                        <div class="browser-dot dot-red"></div>
                        <div class="browser-dot dot-yellow"></div>
                        <div class="browser-dot dot-green"></div>
                    </div>
                    <div class="browser-url" id="browserUrl">about:blank</div>
                </div>
                <div class="screenshot-container" id="screenshotContainer">
                    <div class="screenshot-placeholder">
                        <div class="icon">📱</div>
                        <p>Waiting for test to start...</p>
                    </div>
                    <div class="live-indicator" id="liveIndicator" style="display: none;">
                        <div class="live-dot"></div>
                        LIVE
                    </div>
                </div>
            </div>
        </div>

        <!-- Bottom Panel -->
        <div class="bottom-panel">
            <div class="tabs">
                <div class="tab active" onclick="switchTab('network')">Network</div>
                <div class="tab" onclick="switchTab('console')">Console</div>
                <div class="tab" onclick="switchTab('screenshots')">Screenshots</div>
            </div>

            <div class="tab-content active" id="networkTab">
                <div id="networkLogs"></div>
            </div>

            <div class="tab-content" id="consoleTab">
                <div id="consoleLogs">No console logs yet...</div>
            </div>

            <div class="tab-content" id="screenshotsTab">
                <div id="screenshotsGallery">No screenshots yet...</div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let state = null;
        let startTime = Date.now();

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.command === 'updateState') {
                state = message.state;
                updateUI();
            }
        });

        function updateUI() {
            if (!state) return;

            // Update status badge
            const statusBadge = document.getElementById('statusBadge');
            statusBadge.textContent = state.status.toUpperCase();
            statusBadge.className = 'status-badge status-' + state.status;

            // Update header
            document.getElementById('endpointLabel').textContent = 
                state.gap.method + ' ' + state.gap.endpoint;
            document.getElementById('baseUrlLabel').textContent = state.baseUrl;
            document.getElementById('browserUrl').textContent = state.baseUrl;

            // Update progress
            const progress = state.totalSteps > 0 
                ? (state.currentStep / state.totalSteps) * 100 
                : 0;
            document.getElementById('progressFill').style.width = progress + '%';
            document.getElementById('stepProgress').textContent = 
                state.currentStep + ' / ' + state.totalSteps;

            // Update timer
            const elapsed = Date.now() - state.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('timer').textContent = 
                String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

            // Update agent thinking
            document.getElementById('agentThinking').textContent = state.agentThinking;

            // Update steps list
            updateStepsList();

            // Update screenshot
            updateScreenshot();

            // Update network logs
            updateNetworkLogs();

            // Show live indicator when running
            document.getElementById('liveIndicator').style.display = 
                state.status === 'running' ? 'flex' : 'none';
        }

        function updateStepsList() {
            const stepsList = document.getElementById('stepsList');
            stepsList.innerHTML = state.steps.map((step, index) => \`
                <div class="step-item \${index === state.steps.length - 1 ? 'active' : ''}">
                    <div class="step-header">
                        <div class="step-number">\${step.stepNumber}</div>
                        <div class="step-goal">\${step.goal}</div>
                        <div class="step-status \${step.result}"></div>
                    </div>
                    <div class="step-action">\${step.action}</div>
                    \${step.thinking ? '<div class="step-thinking">' + step.thinking + '</div>' : ''}
                </div>
            \`).join('');

            // Scroll to bottom
            stepsList.scrollTop = stepsList.scrollHeight;
        }

        function updateScreenshot() {
            const container = document.getElementById('screenshotContainer');
            
            if (state.screenshots.length > 0) {
                const latest = state.screenshots[state.screenshots.length - 1];
                container.innerHTML = \`
                    <img class="screenshot-img" src="data:image/png;base64,\${latest}" alt="Test screenshot" />
                    <div class="live-indicator" id="liveIndicator" style="\${state.status === 'running' ? 'display: flex;' : 'display: none;'}">
                        <div class="live-dot"></div>
                        LIVE
                    </div>
                \`;
            }
        }

        function updateNetworkLogs() {
            const networkLogs = document.getElementById('networkLogs');
            networkLogs.innerHTML = state.networkLogs.map(log => {
                const time = new Date(log.timestamp).toLocaleTimeString();
                const statusClass = log.status >= 200 && log.status < 300 ? 'success' : 'error';
                
                return \`
                    <div class="log-entry">
                        <div class="log-time">\${time}</div>
                        <div class="log-method \${log.method}">\${log.method}</div>
                        <div class="log-url">\${log.url}</div>
                        <div class="log-status \${statusClass}">\${log.status || '...'}</div>
                    </div>
                \`;
            }).join('');
        }

        function switchTab(tabId) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            const tabs = Array.from(document.querySelectorAll('.tab'));
            const selectedTab = tabs.find(t => t.textContent.toLowerCase().includes(tabId));
            if (selectedTab) selectedTab.classList.add('active');
            
            const content = document.getElementById(tabId + 'Tab');
            if (content) content.classList.add('active');
        }

        function openInBrowser() {
            vscode.postMessage({ command: 'openInBrowser' });
        }

        function exportReport() {
            vscode.postMessage({ command: 'export' });
        }

        function stopTest() {
            vscode.postMessage({ command: 'stop' });
        }
    </script>
</body>
</html>`;
    }
    dispose() {
        LiveBrowserPreviewPanel.currentPanel = undefined;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.panel.dispose();
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}
exports.LiveBrowserPreviewPanel = LiveBrowserPreviewPanel;
