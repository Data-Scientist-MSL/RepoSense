import * as vscode from 'vscode';
import { GapItem } from '../models/types';
import { OllamaService } from '../services/llm/OllamaService';
import { handleError } from '../utils/ErrorHandler';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

interface AnalysisSummary {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
}

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _conversation: ChatMessage[] = [];
    private _ollamaService: OllamaService;
    private _gaps: GapItem[] = [];
    private _summary: AnalysisSummary = {};

    private constructor(
        panel: vscode.WebviewPanel, 
        extensionUri: vscode.Uri,
        ollamaService: OllamaService
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._ollamaService = ollamaService;

        // Set HTML content
        this._update();

        // Handle messages from webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'sendMessage':
                        await this._handleUserMessage(message.text);
                        break;
                    case 'clearChat':
                        this._clearConversation();
                        break;
                    case 'exportChat':
                        await this._exportChat();
                        break;
                }
            },
            null,
            this._disposables
        );

        // Handle panel dispose
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Send initial greeting
        this._sendInitialGreeting();
    }

    public static async createOrShow(
        extensionUri: vscode.Uri,
        ollamaService: OllamaService,
        gaps?: GapItem[],
        summary?: AnalysisSummary
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            if (gaps && summary) {
                ChatPanel.currentPanel.updateContext(gaps, summary);
            }
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'reposenseChat',
            'RepoSense AI Assistant',
            column || vscode.ViewColumn.Two,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
                retainContextWhenHidden: true
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, ollamaService);
        if (gaps && summary) {
            ChatPanel.currentPanel.updateContext(gaps, summary);
        }
    }

    public updateContext(gaps: GapItem[], summary: AnalysisSummary) {
        this._gaps = gaps;
        this._summary = summary;
        
        // Add context message
        const contextMessage: ChatMessage = {
            role: 'system',
            content: `Context updated: ${gaps.length} gaps found (${summary.critical || 0} critical, ${summary.high || 0} high, ${summary.medium || 0} medium, ${summary.low || 0} low)`,
            timestamp: new Date()
        };
        this._conversation.push(contextMessage);
        this._update();
    }

    private _sendInitialGreeting() {
        const greeting: ChatMessage = {
            role: 'assistant',
            content: `👋 Hello! I'm your RepoSense AI Assistant. I can help you understand and fix the gaps in your codebase.

**I can help you with:**
- Explaining what each gap means and its implications
- Suggesting remediation steps with pros and cons
- Generating test code for missing coverage
- Providing guidance on best practices

**Try asking me:**
- "What are the critical gaps in my codebase?"
- "How do I fix the missing endpoint for /api/users?"
- "Explain the security implications of this gap"
- "What's the best way to add test coverage?"

How can I assist you today?`,
            timestamp: new Date()
        };
        this._conversation.push(greeting);
        this._update();
    }

    private async _handleUserMessage(text: string) {
        try {
            // Add user message to conversation
            const userMessage: ChatMessage = {
                role: 'user',
                content: text,
                timestamp: new Date()
            };
            this._conversation.push(userMessage);
            this._update();

            // Show typing indicator
            this._sendTypingIndicator();

            // Build context-aware prompt
            const contextPrompt = this._buildContextPrompt(text);

            // Get AI response
            const response = await this._ollamaService.generate(contextPrompt, {
                system: this._getSystemPrompt(),
                temperature: 0.3
            });

            // Add assistant response
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };
            this._conversation.push(assistantMessage);
            this._update();

        } catch (error) {
            await handleError(
                error instanceof Error ? error : new Error(String(error)),
                'Chat Message',
                'ChatPanel',
                { severity: 'error', retryable: true }
            );

            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: `⚠️ I'm sorry, I encountered an error processing your request. Please make sure Ollama is running and try again.`,
                timestamp: new Date()
            };
            this._conversation.push(errorMessage);
            this._update();
        }
    }

    private _getSystemPrompt(): string {
        return `You are an expert software development assistant specializing in code quality, testing, and remediation.
        
Your role is to help developers understand and fix frontend-backend integration gaps. You should:
- Provide clear, actionable explanations
- Suggest specific remediation steps
- Explain pros and cons of different approaches
- Reference best practices and industry standards
- Be concise but thorough

When discussing gaps, always consider:
- Security implications
- Performance impact
- Maintainability
- Testing requirements
- Backward compatibility`;
    }

    private _buildContextPrompt(userQuery: string): string {
        let prompt = userQuery;

        // Add gap context if available
        if (this._gaps.length > 0) {
            const criticalGaps = this._gaps.filter(g => g.severity === 'CRITICAL');
            const highGaps = this._gaps.filter(g => g.severity === 'HIGH');

            prompt += `\n\n**Current Analysis Context:**`;
            prompt += `\nTotal gaps: ${this._gaps.length}`;
            prompt += `\nCritical: ${criticalGaps.length}`;
            prompt += `\nHigh priority: ${highGaps.length}`;

            // Include details of top critical gaps
            if (criticalGaps.length > 0) {
                prompt += `\n\n**Critical Gaps:**`;
                criticalGaps.slice(0, 3).forEach(gap => {
                    prompt += `\n- ${gap.message} (${gap.file}:${gap.line})`;
                });
            }
        }

        // Add conversation history (last 3 exchanges)
        const recentHistory = this._conversation
            .filter(m => m.role !== 'system')
            .slice(-6)
            .map(m => `${m.role}: ${m.content}`)
            .join('\n');

        if (recentHistory) {
            prompt += `\n\n**Recent conversation:**\n${recentHistory}`;
        }

        return prompt;
    }

    private _sendTypingIndicator() {
        this._panel.webview.postMessage({
            command: 'typing',
            isTyping: true
        });
    }

    private _clearConversation() {
        this._conversation = [];
        this._sendInitialGreeting();
    }

    private async _exportChat() {
        const content = this._conversation
            .filter(m => m.role !== 'system')
            .map(m => {
                const time = m.timestamp.toLocaleTimeString();
                const role = m.role === 'user' ? 'You' : 'AI Assistant';
                return `[${time}] ${role}:\n${m.content}\n`;
            })
            .join('\n');

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('reposense-chat.txt'),
            filters: { 'Text': ['txt'], 'Markdown': ['md'] }
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            vscode.window.showInformationMessage(`Chat exported to ${uri.fsPath}`);
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtmlContent();
    }

    private _getHtmlContent(): string {
        const messages = this._conversation
            .filter(m => m.role !== 'system')
            .map((msg) => {
                const time = msg.timestamp.toLocaleTimeString();
                const isUser = msg.role === 'user';
                return `
                    <div class="message ${isUser ? 'user-message' : 'assistant-message'}">
                        <div class="message-header">
                            <span class="message-author">${isUser ? '👤 You' : '🤖 AI Assistant'}</span>
                            <span class="message-time">${time}</span>
                        </div>
                        <div class="message-content">${this._escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            })
            .join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RepoSense AI Assistant</title>
    <style>
        :root {
            --vscode-font-family: var(--vscode-editor-font-family);
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            padding: 0;
            margin: 0;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }
        
        .header {
            background: var(--vscode-editorGroupHeader-tabsBackground);
            padding: 12px 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }
        
        .header h1 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }
        
        .header-actions {
            display: flex;
            gap: 10px;
        }
        
        .header-actions button {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 4px 12px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 12px;
        }
        
        .header-actions button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        
        .message {
            max-width: 85%;
            padding: 12px 16px;
            border-radius: 8px;
            animation: fadeIn 0.3s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .user-message {
            align-self: flex-end;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .assistant-message {
            align-self: flex-start;
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-panel-border);
        }
        
        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 12px;
            opacity: 0.8;
        }
        
        .message-author {
            font-weight: 600;
        }
        
        .message-time {
            font-size: 11px;
        }
        
        .message-content {
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .input-container {
            background: var(--vscode-editorGroupHeader-tabsBackground);
            border-top: 1px solid var(--vscode-panel-border);
            padding: 16px 20px;
            flex-shrink: 0;
        }
        
        .input-wrapper {
            display: flex;
            gap: 10px;
            align-items: flex-end;
        }
        
        #messageInput {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 10px 12px;
            border-radius: 4px;
            font-family: var(--vscode-font-family);
            font-size: 14px;
            resize: vertical;
            min-height: 40px;
            max-height: 120px;
        }
        
        #messageInput:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        
        #sendButton {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 24px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
            min-width: 80px;
        }
        
        #sendButton:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }
        
        #sendButton:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .typing-indicator {
            display: none;
            align-self: flex-start;
            padding: 12px 16px;
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            max-width: 100px;
        }
        
        .typing-indicator.active {
            display: block;
        }
        
        .typing-dots {
            display: flex;
            gap: 4px;
        }
        
        .typing-dots span {
            width: 8px;
            height: 8px;
            background: var(--vscode-foreground);
            opacity: 0.4;
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }
        
        .typing-dots span:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .typing-dots span:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes typing {
            0%, 60%, 100% { opacity: 0.4; transform: translateY(0); }
            30% { opacity: 1; transform: translateY(-8px); }
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            opacity: 0.6;
        }
        
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 RepoSense AI Assistant</h1>
        <div class="header-actions">
            <button onclick="exportChat()">📥 Export</button>
            <button onclick="clearChat()">🗑️ Clear</button>
        </div>
    </div>
    
    <div class="chat-container" id="chatContainer">
        ${messages || '<div class="empty-state"><div class="empty-state-icon">💬</div><p>Start a conversation with the AI assistant</p></div>'}
        <div class="typing-indicator" id="typingIndicator">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </div>
    
    <div class="input-container">
        <div class="input-wrapper">
            <textarea 
                id="messageInput" 
                placeholder="Ask me anything about your code gaps..."
                rows="1"
            ></textarea>
            <button id="sendButton" onclick="sendMessage()">Send</button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const chatContainer = document.getElementById('chatContainer');
        const typingIndicator = document.getElementById('typingIndicator');
        
        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
        
        // Send on Ctrl+Enter
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;
            
            vscode.postMessage({
                command: 'sendMessage',
                text: text
            });
            
            messageInput.value = '';
            messageInput.style.height = 'auto';
            sendButton.disabled = true;
        }
        
        function clearChat() {
            vscode.postMessage({
                command: 'clearChat'
            });
        }
        
        function exportChat() {
            vscode.postMessage({
                command: 'exportChat'
            });
        }
        
        // Scroll to bottom
        function scrollToBottom() {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.command === 'typing') {
                if (message.isTyping) {
                    typingIndicator.classList.add('active');
                    scrollToBottom();
                } else {
                    typingIndicator.classList.remove('active');
                }
            }
        });
        
        // Enable send button when there's input
        messageInput.addEventListener('input', function() {
            sendButton.disabled = !this.value.trim();
        });
        
        // Initial scroll
        setTimeout(scrollToBottom, 100);
    </script>
</body>
</html>`;
    }

    private _escapeHtml(text: string): string {
        const div = { textContent: text };
        return JSON.stringify(div).slice(15, -2)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    public dispose() {
        ChatPanel.currentPanel = undefined;

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
