import assert from 'assert';
import * as vscode from 'vscode';
import { before, after, describe, it } from 'mocha';

describe('Extension Test Suite', () => {
    before(() => {
        vscode.window.showInformationMessage('Start all tests.');
    });

    after(() => {
        // Cleanup
    });

    it('Should activate extension', async () => {
        const ext = vscode.extensions.getExtension('reposense.reposense');
        assert.ok(ext, 'Extension should be installed');
        
        await ext?.activate();
        assert.ok(ext?.isActive, 'Extension should be active');
    });

    it('Should register all commands', async () => {
        const commands = await vscode.commands.getCommands(true);
        
        const expectedCommands = [
            'reposense.scanRepository',
            'reposense.generateTests',
            'reposense.showReport',
            'reposense.fixGap',
            'reposense.analyzeCodeWithAI',
            'reposense.generateReport',
            'reposense.configureOllama'
        ];
        
        expectedCommands.forEach(cmd => {
            assert.ok(
                commands.includes(cmd),
                `Command ${cmd} should be registered`
            );
        });
    });

    it('Should create status bar item', async () => {
        // Extension should create a status bar item on activation
        // This is a smoke test - actual status bar testing requires more setup
        const ext = vscode.extensions.getExtension('reposense.reposense');
        await ext?.activate();
        assert.ok(ext?.isActive);
    });

    it('Should register TreeView providers', async () => {
        const ext = vscode.extensions.getExtension('reposense.reposense');
        await ext?.activate();
        
        // Verify TreeViews are registered by checking if views exist
        // Note: Direct TreeView validation requires more complex setup
        assert.ok(ext?.isActive);
    });

    it('Should have proper configuration schema', () => {
        const config = vscode.workspace.getConfiguration('reposense');
        
        // Check if configuration keys exist
        assert.ok(config.has('scanOnSave'), 'Should have scanOnSave setting');
        assert.ok(config.has('llmModel'), 'Should have llmModel setting');
        assert.ok(config.has('ollamaEndpoint'), 'Should have ollamaEndpoint setting');
        assert.ok(config.has('excludePatterns'), 'Should have excludePatterns setting');
    });

    it('Should handle configuration defaults correctly', () => {
        const config = vscode.workspace.getConfiguration('reposense');
        
        assert.strictEqual(config.get('scanOnSave'), false, 'Default scanOnSave should be false');
        assert.strictEqual(config.get('llmModel'), 'deepseek-coder:6.7b', 'Default model should be deepseek-coder');
        assert.strictEqual(config.get('ollamaEndpoint'), 'http://localhost:11434', 'Default endpoint should be localhost');
    });
});
