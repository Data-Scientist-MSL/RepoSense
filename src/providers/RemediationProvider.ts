import * as vscode from 'vscode';
import * as path from 'path';

export interface RemediationItem {
    id: string;
    title: string;
    description: string;
    file: string;
    line: number;
    estimatedTime: string;
    actions: string[];
    priority?: 'high' | 'medium' | 'low';
    category?: string;
    autoFixAvailable?: boolean;
}

export class RemediationProvider implements vscode.TreeDataProvider<RemediationTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<RemediationTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<RemediationTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RemediationTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    private remediations: RemediationItem[] = [];

    constructor() {
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

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    update(remediations: RemediationItem[]): void {
        this.remediations = remediations;
        this.refresh();
    }

    getAutoFixableCount(): number {
        return this.remediations.filter(r => r.autoFixAvailable).length;
    }

    getByPriority(priority: 'high' | 'medium' | 'low'): RemediationItem[] {
        return this.remediations.filter(r => r.priority === priority);
    }

    getTreeItem(element: RemediationTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: RemediationTreeItem): Thenable<RemediationTreeItem[]> {
        if (!element) {
            return Promise.resolve(this.remediations.map(r => new RemediationTreeItem(
                r.title,
                vscode.TreeItemCollapsibleState.Collapsed,
                r,
                'remediation'
            )));
        } else if (element.remediation) {
            // Show actions as children
            const actionItems = element.remediation.actions.map((action, index) => 
                new RemediationTreeItem(
                    action,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    'action',
                    index
                )
            );
            return Promise.resolve(actionItems);
        }
        return Promise.resolve([]);
    }
}

export class RemediationTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly remediation?: RemediationItem,
        public readonly contextValue?: string,
        public readonly actionIndex?: number
    ) {
        super(label, collapsibleState);

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
            let iconColor: vscode.ThemeColor | undefined;
            
            if (remediation.autoFixAvailable) {
                iconId = 'lightbulb-autofix';
                iconColor = new vscode.ThemeColor('editorLightBulb.foreground');
            } else if (remediation.priority === 'high') {
                iconId = 'warning';
                iconColor = new vscode.ThemeColor('editorWarning.foreground');
            } else if (remediation.priority === 'medium') {
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
        } else if (contextValue === 'action') {
            // Action items get a checkbox icon
            this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
    }
}
