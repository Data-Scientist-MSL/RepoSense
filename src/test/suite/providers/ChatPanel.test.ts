import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ChatPanel } from '../../../providers/ChatPanel';
import { OllamaService } from '../../../services/llm/OllamaService';

describe('ChatPanel Unit Tests', () => {
    let mockPanel: any;
    let mockWebview: any;
    let mockOllama: sinon.SinonStubbedInstance<OllamaService>;
    let extensionUri: vscode.Uri;

    beforeEach(() => {
        mockWebview = {
            onDidReceiveMessage: sinon.stub(),
            html: '',
            postMessage: sinon.stub(),
            asWebviewUri: sinon.stub().returns({ toString: () => 'mock-uri' })
        };
        mockPanel = {
            webview: mockWebview,
            onDidDispose: sinon.stub(),
            reveal: sinon.stub(),
            dispose: sinon.stub()
        };
        mockOllama = sinon.createStubInstance(OllamaService);
        extensionUri = vscode.Uri.file('/mock/path');
        
        // Reset singleton
        (ChatPanel as any).currentPanel = undefined;
    });

    it('should initialize with greeting', async () => {
        // Use reflect to call private constructor if needed or just use createOrShow
        // But createOrShow calls window.createWebviewPanel
        const createStub = sinon.stub(vscode.window, 'createWebviewPanel').returns(mockPanel);
        
        await ChatPanel.createOrShow(extensionUri, mockOllama as any);
        
        assert.ok(mockWebview.html.includes('Hello! I\'m your RepoSense AI Assistant'));
        createStub.restore();
    });

    it('should update context and add system message', async () => {
        const createStub = sinon.stub(vscode.window, 'createWebviewPanel').returns(mockPanel);
        await ChatPanel.createOrShow(extensionUri, mockOllama as any);
        const panel = ChatPanel.currentPanel!;

        panel.updateContext([{ message: 'Gap 1', severity: 'CRITICAL', file: 'a.ts', line: 1 } as any], { critical: 1 });
        
        // System message doesn't render in HTML but it's in the conversation
        assert.ok((panel as any)._conversation.some((m: any) => m.role === 'system' && m.content.includes('Context updated')));
        createStub.restore();
    });

    it('should handle user messages and get AI response', async () => {
        const createStub = sinon.stub(vscode.window, 'createWebviewPanel').returns(mockPanel);
        await ChatPanel.createOrShow(extensionUri, mockOllama as any);
        const panel = ChatPanel.currentPanel!;

        mockOllama.generate.resolves('I can help with that.');

        // Simulate message from webview
        await (panel as any)._handleUserMessage('How do I fix this?');

        assert.ok(mockWebview.html.includes('How do I fix this?'));
        assert.ok(mockWebview.html.includes('I can help with that.'));
        assert.ok(mockOllama.generate.calledOnce);
        
        createStub.restore();
    });

    it('should show typing indicator while generating', async () => {
        const createStub = sinon.stub(vscode.window, 'createWebviewPanel').returns(mockPanel);
        await ChatPanel.createOrShow(extensionUri, mockOllama as any);
        const panel = ChatPanel.currentPanel!;

        mockOllama.generate.resolves('Response');

        await (panel as any)._handleUserMessage('Test');

        assert.ok(mockWebview.postMessage.calledWith(sinon.match({ command: 'typing', isTyping: true })));
        createStub.restore();
    });
});
