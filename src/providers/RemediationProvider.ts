import * as vscode from 'vscode';

export interface RemediationItem {
    id: string;
    title: string;
    description: string;
    file: string;
    line: number;
    estimatedTime: string;
    actions: string[];
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
                actions: [
                    'Add try-catch block',
                    'Show error message to user',
                    'Log error for debugging'
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
            return Promise.resolve(element.remediation.actions.map(action => 
                new RemediationTreeItem(
                    action,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    'action'
                )
            ));
        }
        return Promise.resolve([]);
    }
}

export class RemediationTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly remediation?: RemediationItem,
        public readonly contextValue?: string
    ) {
        super(label, collapsibleState);

        if (remediation) {
            this.tooltip = `${remediation.description}\n${remediation.file}:${remediation.line}\nEstimated time: ${remediation.estimatedTime}`;
            this.description = `${remediation.file}:${remediation.line}`;
            this.iconPath = new vscode.ThemeIcon('wrench');
        }
    }
}
