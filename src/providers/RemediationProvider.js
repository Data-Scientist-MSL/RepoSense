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
exports.RemediationTreeItem = exports.RemediationProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class RemediationProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.remediations = [];
        // Initialize with sample data
        this.remediations = [
            {
                id: '1',
                title: 'Generate DELETE Endpoint',
                description: 'Create missing DELETE /api/users/:id endpoint',
                file: 'src/api/users.controller.ts',
                line: 50,
                estimatedTime: '2 minutes',
                priority: 'high',
                category: 'Missing Endpoints',
                autoFixAvailable: true,
                actions: [
                    'Scaffold endpoint in users.controller.ts',
                    'Add validation middleware',
                    'Update API documentation'
                ]
            },
            {
                id: '2',
                title: 'Add Error Handling',
                description: 'Wrap fetchUserData in try-catch',
                file: 'src/components/UserProfile.tsx',
                line: 23,
                estimatedTime: '1 minute',
                priority: 'medium',
                category: 'Error Handling',
                autoFixAvailable: true,
                actions: [
                    'Add try-catch block',
                    'Show error message to user',
                    'Log error for debugging'
                ]
            },
            {
                id: '3',
                title: 'Remove Unused Endpoint',
                description: 'DELETE /api/analytics/legacy is never called',
                file: 'src/api/analytics.ts',
                line: 89,
                estimatedTime: '30 seconds',
                priority: 'low',
                category: 'Code Cleanup',
                autoFixAvailable: false,
                actions: [
                    'Remove endpoint definition',
                    'Update tests',
                    'Update API documentation'
                ]
            }
        ];
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    update(remediations) {
        this.remediations = remediations;
        this.refresh();
    }
    getAutoFixableCount() {
        return this.remediations.filter(r => r.autoFixAvailable).length;
    }
    getByPriority(priority) {
        return this.remediations.filter(r => r.priority === priority);
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve(this.remediations.map(r => new RemediationTreeItem(r.title, vscode.TreeItemCollapsibleState.Collapsed, r, 'remediation')));
        }
        else if (element.remediation) {
            // Show actions as children
            const actionItems = element.remediation.actions.map((action, index) => new RemediationTreeItem(action, vscode.TreeItemCollapsibleState.None, undefined, 'action', index));
            return Promise.resolve(actionItems);
        }
        return Promise.resolve([]);
    }
}
exports.RemediationProvider = RemediationProvider;
class RemediationTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, remediation, contextValue, actionIndex) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.remediation = remediation;
        this.contextValue = contextValue;
        this.actionIndex = actionIndex;
        if (remediation) {
            // Create rich tooltip with markdown
            const tooltipMd = new vscode.MarkdownString();
            tooltipMd.appendMarkdown(`**${remediation.title}**\n\n`);
            tooltipMd.appendMarkdown(`${remediation.description}\n\n`);
            tooltipMd.appendMarkdown(`📁 ${remediation.file}:${remediation.line}\n\n`);
            tooltipMd.appendMarkdown(`⏱ **Estimated Time:** ${remediation.estimatedTime}\n\n`);
            if (remediation.priority) {
                tooltipMd.appendMarkdown(`⚠️ **Priority:** ${remediation.priority.toUpperCase()}\n\n`);
            }
            if (remediation.autoFixAvailable) {
                tooltipMd.appendMarkdown(`✨ **Auto-fix available** - Click to apply\n\n`);
            }
            tooltipMd.appendMarkdown(`**Actions:**\n`);
            remediation.actions.forEach((action, i) => {
                tooltipMd.appendMarkdown(`${i + 1}. ${action}\n`);
            });
            this.tooltip = tooltipMd;
            this.description = `${path.basename(remediation.file)}:${remediation.line} • ${remediation.estimatedTime}`;
            this.resourceUri = vscode.Uri.file(remediation.file);
            // Set icon based on priority and auto-fix availability
            let iconId = 'wrench';
            let iconColor;
            if (remediation.autoFixAvailable) {
                iconId = 'lightbulb-autofix';
                iconColor = new vscode.ThemeColor('editorLightBulb.foreground');
            }
            else if (remediation.priority === 'high') {
                iconId = 'warning';
                iconColor = new vscode.ThemeColor('editorWarning.foreground');
            }
            else if (remediation.priority === 'medium') {
                iconId = 'info';
                iconColor = new vscode.ThemeColor('editorInfo.foreground');
            }
            this.iconPath = new vscode.ThemeIcon(iconId, iconColor);
            // Add command to open file at specific line
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [
                    vscode.Uri.file(remediation.file),
                    { selection: new vscode.Range(remediation.line - 1, 0, remediation.line - 1, 0) }
                ]
            };
        }
        else if (contextValue === 'action') {
            // Action items get a checkbox icon
            this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
    }
}
exports.RemediationTreeItem = RemediationTreeItem;
