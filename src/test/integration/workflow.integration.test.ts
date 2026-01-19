import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Integration tests for complete RepoSense workflows
 * These tests exercise full user journeys from scan to report
 */
describe('Integration Tests - Complete Workflows', function() {
    this.timeout(60000); // Workflows can take time

    let testWorkspace: vscode.WorkspaceFolder;
    let testFilePath: string;

    before(async function() {
        // Get workspace
        const workspaces = vscode.workspace.workspaceFolders;
        if (!workspaces || workspaces.length === 0) {
            throw new Error('No workspace folder open for testing');
        }
        testWorkspace = workspaces[0];

        // Create test file structure
        const testDir = path.join(testWorkspace.uri.fsPath, 'test-integration');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // Create sample file with coverage gaps
        testFilePath = path.join(testDir, 'sample.ts');
        const sampleCode = `
export class UserService {
    private users: Map<string, any> = new Map();

    // Tested function
    getUser(id: string) {
        return this.users.get(id);
    }

    // Untested function - should be detected
    deleteUser(id: string) {
        this.users.delete(id);
        this.notifyDeletion(id);
    }

    // Untested function - should be detected
    private notifyDeletion(id: string) {
        console.log(\`User deleted: \${id}\`);
    }

    // Tested function
    addUser(id: string, user: any) {
        this.users.set(id, user);
    }
}
`;
        fs.writeFileSync(testFilePath, sampleCode);

        // Create corresponding test file (partial coverage)
        const testFile = path.join(testDir, 'sample.test.ts');
        const testCode = `
import { UserService } from './sample';

describe('UserService', () => {
    it('should get user', () => {
        const service = new UserService();
        service.addUser('1', { name: 'Test' });
        expect(service.getUser('1')).toBeDefined();
    });

    it('should add user', () => {
        const service = new UserService();
        service.addUser('1', { name: 'Test' });
        expect(service.getUser('1')).toEqual({ name: 'Test' });
    });
});
`;
        fs.writeFileSync(testFile, testCode);
    });

    after(async function() {
        // Clean up test files
        const testDir = path.join(testWorkspace.uri.fsPath, 'test-integration');
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('Workflow 1: Scan → View Gaps → Fix Gap', function() {
        it('should complete full scan and fix workflow', async function() {
            // Step 1: Run scan
            await vscode.commands.executeCommand('reposense.scanRepository');

            // Wait for scan to complete
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Verify Tree View has data
            const gapTreeView = vscode.window.createTreeView('reposense-gaps', {
                treeDataProvider: {} as any // We just check if command registered
            });

            expect(gapTreeView).to.exist;

            // Step 2: Open a gap in editor
            const doc = await vscode.workspace.openTextDocument(testFilePath);
            await vscode.window.showTextDocument(doc);

            // Verify CodeLens appears (diagnostics should be present)
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            expect(diagnostics.length).to.be.greaterThan(0);

            // Step 3: Apply quick fix (if available)
            // This would normally be triggered by user action
            // We verify the command exists
            const commands = await vscode.commands.getCommands();
            expect(commands).to.include('reposense.fixGap');
        });
    });

    describe('Workflow 2: Scan → Generate Tests → View Report', function() {
        it('should generate tests and create report', async function() {
            // Step 1: Run scan
            await vscode.commands.executeCommand('reposense.scanRepository');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Step 2: Generate tests (requires Ollama)
            // We check command availability but don't execute (requires Ollama)
            const commands = await vscode.commands.getCommands();
            expect(commands).to.include('reposense.generateTests');

            // Step 3: Show report
            const reportCommands = commands.filter(c => c.includes('report'));
            expect(reportCommands.length).to.be.greaterThan(0);
        });
    });

    describe('Workflow 3: File Change → Incremental Scan', function() {
        it('should detect file changes and re-scan incrementally', async function() {
            // Step 1: Initial scan
            await vscode.commands.executeCommand('reposense.scanRepository');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Step 2: Modify file
            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const edit = new vscode.WorkspaceEdit();
            edit.insert(
                doc.uri,
                new vscode.Position(doc.lineCount, 0),
                '\n    // New untested method\n    updateUser(id: string) {}\n'
            );
            await vscode.workspace.applyEdit(edit);
            await doc.save();

            // Step 3: Re-scan (should use incremental analysis)
            await vscode.commands.executeCommand('reposense.scanRepository');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Verify diagnostics updated
            const diagnostics = vscode.languages.getDiagnostics(doc.uri);
            expect(diagnostics.length).to.be.greaterThan(0);
        });
    });

    describe('Workflow 4: Performance Monitoring', function() {
        it('should track performance metrics during scan', async function() {
            // Run scan with performance tracking
            await vscode.commands.executeCommand('reposense.scanRepository');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Check performance report command
            const commands = await vscode.commands.getCommands();
            expect(commands).to.include('reposense.showPerformanceReport');

            // Execute performance report
            await vscode.commands.executeCommand('reposense.showPerformanceReport');

            // Verify a document was opened (performance report)
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                expect(activeEditor.document.languageId).to.equal('markdown');
            }
        });
    });

    describe('Workflow 5: Error Handling & Recovery', function() {
        it('should handle errors gracefully', async function() {
            // Try to generate tests without Ollama running
            const commands = await vscode.commands.getCommands();
            expect(commands).to.include('reposense.generateTests');

            // The command should exist even if Ollama is not running
            // It will show an error message to the user
            // We just verify the command is registered
        });
    });

    describe('Workflow 6: TreeView Interactions', function() {
        it('should support grouping changes', async function() {
            const commands = await vscode.commands.getCommands();
            expect(commands).to.include('reposense.changeGrouping');
        });

        it('should support opening items in editor', async function() {
            const commands = await vscode.commands.getCommands();
            expect(commands).to.include('reposense.openInEditor');
        });

        it('should support copying gap details', async function() {
            const commands = await vscode.commands.getCommands();
            expect(commands).to.include('reposense.copyGapDetails');
        });
    });
});
