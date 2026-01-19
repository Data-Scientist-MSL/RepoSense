import * as vscode from 'vscode';
import * as path from 'path';

export interface TestCase {
    id: string;
    name: string;
    status: 'passed' | 'failed' | 'running' | 'pending';
    category: string;
    description?: string;
    file?: string;
    line?: number;
    duration?: number; // milliseconds
    error?: string;
}

export class TestCaseProvider implements vscode.TreeDataProvider<TestCaseTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TestCaseTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<TestCaseTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TestCaseTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    private testCases: TestCase[] = [];

    constructor() {
        // Initialize with sample data
        this.testCases = [
            { 
                id: '1', 
                name: 'User Registration - Happy Path', 
                status: 'passed', 
                category: 'User Management',
                file: 'tests/user.spec.ts',
                line: 15,
                duration: 1250
            },
            { 
                id: '2', 
                name: 'User Login - Valid Credentials', 
                status: 'passed', 
                category: 'User Management',
                file: 'tests/auth.spec.ts',
                line: 42,
                duration: 890
            },
            { 
                id: '3', 
                name: 'User Delete - Soft Delete Verification', 
                status: 'pending', 
                category: 'User Management',
                file: 'tests/user.spec.ts',
                line: 78
            },
            { 
                id: '4', 
                name: 'Product Search - Filter Validation', 
                status: 'running', 
                category: 'Product Catalog',
                file: 'tests/product.spec.ts',
                line: 23
            },
            { 
                id: '5', 
                name: 'Checkout - Payment Gateway', 
                status: 'failed', 
                category: 'Checkout Flow',
                file: 'tests/checkout.spec.ts',
                line: 156,
                duration: 3420,
                error: 'Expected status 200, received 500'
            }
        ];
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    update(testCases: TestCase[]): void {
        this.testCases = testCases;
        this.refresh();
    }

    getTreeItem(element: TestCaseTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TestCaseTreeItem): Thenable<TestCaseTreeItem[]> {
        if (!element) {
            // Root level - group by category
            const categories = this.groupByCategory();
            return Promise.resolve(categories);
        } else if (element.contextValue === 'category') {
            // Show test cases for this category
            const testsForCategory = this.testCases.filter(t => t.category === element.category);
            return Promise.resolve(testsForCategory.map(t => new TestCaseTreeItem(
                t.name,
                vscode.TreeItemCollapsibleState.None,
                t,
                'test-case'
            )));
        }
        return Promise.resolve([]);
    }

    private groupByCategory(): TestCaseTreeItem[] {
        const categories = new Set(this.testCases.map(t => t.category));
        return Array.from(categories).map(category => {
            const testsInCategory = this.testCases.filter(t => t.category === category);
            const passed = testsInCategory.filter(t => t.status === 'passed').length;
            const failed = testsInCategory.filter(t => t.status === 'failed').length;
            const running = testsInCategory.filter(t => t.status === 'running').length;
            const pending = testsInCategory.filter(t => t.status === 'pending').length;
            
            let statusSummary = '';
            if (failed > 0) statusSummary = ` • ${failed} failed`;
            else if (running > 0) statusSummary = ` • ${running} running`;
            else if (pending > 0) statusSummary = ` • ${pending} pending`;
            else if (passed > 0) statusSummary = ` • ${passed} passed`;
            
            const icon = failed > 0 ? 'error' : running > 0 ? 'sync~spin' : passed === testsInCategory.length ? 'pass-filled' : 'circle-outline';
            const iconColor = failed > 0 ? new vscode.ThemeColor('testing.iconFailed') : 
                              running > 0 ? new vscode.ThemeColor('testing.iconQueued') :
                              passed === testsInCategory.length ? new vscode.ThemeColor('testing.iconPassed') : undefined;
            
            return new TestCaseTreeItem(
                `${category}${statusSummary}`,
                vscode.TreeItemCollapsibleState.Expanded,
                undefined,
                'category',
                category,
                new vscode.ThemeIcon(icon, iconColor)
            );
        });
    }
}

export class TestCaseTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly testCase?: TestCase,
        public readonly contextValue?: string,
        public readonly category?: string,
        icon?: vscode.ThemeIcon
    ) {
        super(label, collapsibleState);

        if (icon) {
            this.iconPath = icon;
        }

        if (testCase) {
            this.label = testCase.name;
            
            // Create rich tooltip
            const tooltipMd = new vscode.MarkdownString();
            tooltipMd.appendMarkdown(`**${testCase.name}**\n\n`);
            tooltipMd.appendMarkdown(`Status: ${testCase.status.toUpperCase()}\n\n`);
            if (testCase.description) {
                tooltipMd.appendMarkdown(`${testCase.description}\n\n`);
            }
            if (testCase.file) {
                tooltipMd.appendMarkdown(`📁 ${testCase.file}:${testCase.line || 0}\n\n`);
            }
            if (testCase.duration) {
                tooltipMd.appendMarkdown(`⏱ Duration: ${testCase.duration}ms\n\n`);
            }
            if (testCase.error) {
                tooltipMd.appendMarkdown(`❌ **Error:** ${testCase.error}`);
            }
            this.tooltip = tooltipMd;
            
            // Set description with duration if available
            if (testCase.duration) {
                this.description = `${testCase.duration}ms`;
            } else if (testCase.file) {
                this.description = path.basename(testCase.file);
            }
            
            // Set icon based on status
            const iconId = this.getStatusIcon(testCase.status);
            const iconColor = this.getStatusColor(testCase.status);
            this.iconPath = new vscode.ThemeIcon(iconId, iconColor);
            
            // Add command to open test file if available
            if (testCase.file && testCase.line) {
                this.command = {
                    command: 'vscode.open',
                    title: 'Open Test',
                    arguments: [
                        vscode.Uri.file(testCase.file),
                        { selection: new vscode.Range(testCase.line - 1, 0, testCase.line - 1, 0) }
                    ]
                };
            }
        }
    }

    private getStatusIcon(status: TestCase['status']): string {
        switch (status) {
            case 'passed': return 'pass-filled';
            case 'failed': return 'error';
            case 'running': return 'sync~spin';
            case 'pending': return 'circle-outline';
            default: return 'question';
        }
    }

    private getStatusColor(status: TestCase['status']): vscode.ThemeColor | undefined {
        switch (status) {
            case 'passed': return new vscode.ThemeColor('testing.iconPassed');
            case 'failed': return new vscode.ThemeColor('testing.iconFailed');
            case 'running': return new vscode.ThemeColor('testing.iconQueued');
            case 'pending': return new vscode.ThemeColor('testing.iconSkipped');
            default: return undefined;
        }
    }
}
