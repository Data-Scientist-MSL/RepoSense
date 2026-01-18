import * as vscode from 'vscode';

export interface TestCase {
    id: string;
    name: string;
    status: 'passed' | 'failed' | 'running' | 'pending';
    category: string;
    description?: string;
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
            { id: '1', name: 'User Registration - Happy Path', status: 'passed', category: 'User Management' },
            { id: '2', name: 'User Login - Valid Credentials', status: 'passed', category: 'User Management' },
            { id: '3', name: 'User Delete - Soft Delete Verification', status: 'pending', category: 'User Management' },
            { id: '4', name: 'Product Search - Filter Validation', status: 'running', category: 'Product Catalog' },
            { id: '5', name: 'Checkout - Payment Gateway', status: 'failed', category: 'Checkout Flow' }
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
            const count = this.testCases.filter(t => t.category === category).length;
            return new TestCaseTreeItem(
                `${category} (${count})`,
                vscode.TreeItemCollapsibleState.Expanded,
                undefined,
                'category',
                category
            );
        });
    }

    private getStatusIcon(status: TestCase['status']): string {
        switch (status) {
            case 'passed': return '✅';
            case 'failed': return '❌';
            case 'running': return '🔄';
            case 'pending': return '⏸️';
            default: return '⚪';
        }
    }
}

export class TestCaseTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly testCase?: TestCase,
        public readonly contextValue?: string,
        public readonly category?: string
    ) {
        super(label, collapsibleState);

        if (testCase) {
            const icon = this.getStatusIcon(testCase.status);
            this.label = `${icon} ${testCase.name}`;
            this.tooltip = testCase.description || testCase.name;
        }
    }

    private getStatusIcon(status: TestCase['status']): string {
        switch (status) {
            case 'passed': return '✅';
            case 'failed': return '❌';
            case 'running': return '🔄';
            case 'pending': return '⏸️';
            default: return '⚪';
        }
    }
}
