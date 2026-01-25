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
exports.TestCaseTreeItem = exports.TestCaseProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class TestCaseProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.testCases = [];
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
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    update(testCases) {
        this.testCases = testCases;
        this.refresh();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - group by category
            const categories = this.groupByCategory();
            return Promise.resolve(categories);
        }
        else if (element.contextValue === 'category') {
            // Show test cases for this category
            const testsForCategory = this.testCases.filter(t => t.category === element.category);
            return Promise.resolve(testsForCategory.map(t => new TestCaseTreeItem(t.name, vscode.TreeItemCollapsibleState.None, t, 'test-case')));
        }
        return Promise.resolve([]);
    }
    groupByCategory() {
        const categories = new Set(this.testCases.map(t => t.category));
        return Array.from(categories).map(category => {
            const testsInCategory = this.testCases.filter(t => t.category === category);
            const passed = testsInCategory.filter(t => t.status === 'passed').length;
            const failed = testsInCategory.filter(t => t.status === 'failed').length;
            const running = testsInCategory.filter(t => t.status === 'running').length;
            const pending = testsInCategory.filter(t => t.status === 'pending').length;
            let statusSummary = '';
            if (failed > 0)
                statusSummary = ` • ${failed} failed`;
            else if (running > 0)
                statusSummary = ` • ${running} running`;
            else if (pending > 0)
                statusSummary = ` • ${pending} pending`;
            else if (passed > 0)
                statusSummary = ` • ${passed} passed`;
            const icon = failed > 0 ? 'error' : running > 0 ? 'sync~spin' : passed === testsInCategory.length ? 'pass-filled' : 'circle-outline';
            const iconColor = failed > 0 ? new vscode.ThemeColor('testing.iconFailed') :
                running > 0 ? new vscode.ThemeColor('testing.iconQueued') :
                    passed === testsInCategory.length ? new vscode.ThemeColor('testing.iconPassed') : undefined;
            return new TestCaseTreeItem(`${category}${statusSummary}`, vscode.TreeItemCollapsibleState.Expanded, undefined, 'category', category, new vscode.ThemeIcon(icon, iconColor));
        });
    }
}
exports.TestCaseProvider = TestCaseProvider;
class TestCaseTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, testCase, contextValue, category, icon) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.testCase = testCase;
        this.contextValue = contextValue;
        this.category = category;
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
            }
            else if (testCase.file) {
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
    getStatusIcon(status) {
        switch (status) {
            case 'passed': return 'pass-filled';
            case 'failed': return 'error';
            case 'running': return 'sync~spin';
            case 'pending': return 'circle-outline';
            default: return 'question';
        }
    }
    getStatusColor(status) {
        switch (status) {
            case 'passed': return new vscode.ThemeColor('testing.iconPassed');
            case 'failed': return new vscode.ThemeColor('testing.iconFailed');
            case 'running': return new vscode.ThemeColor('testing.iconQueued');
            case 'pending': return new vscode.ThemeColor('testing.iconSkipped');
            default: return undefined;
        }
    }
}
exports.TestCaseTreeItem = TestCaseTreeItem;
