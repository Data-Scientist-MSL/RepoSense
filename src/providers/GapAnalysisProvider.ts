import * as vscode from 'vscode';
import { GapItem } from '../models/types';

export class GapAnalysisProvider implements vscode.TreeDataProvider<GapTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<GapTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<GapTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GapTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    private gaps: GapItem[] = [];

    constructor() {
        // Initialize with sample data
        this.gaps = [
            {
                type: 'orphaned_component',
                severity: 'CRITICAL',
                message: 'DELETE /api/users/:id called but no endpoint exists',
                file: 'src/components/UserProfile.tsx',
                line: 47,
                suggestedFix: 'Create endpoint in users.controller.ts'
            },
            {
                type: 'unused_endpoint',
                severity: 'MEDIUM',
                message: 'GET /api/analytics/detailed is never called',
                file: 'src/api/analytics.ts',
                line: 15
            },
            {
                type: 'suggestion',
                severity: 'LOW',
                message: 'Add loading state to Dashboard component',
                file: 'src/pages/Dashboard.tsx',
                line: 23
            }
        ];
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    update(gaps: GapItem[]): void {
        this.gaps = gaps;
        this.refresh();
    }

    getTreeItem(element: GapTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: GapTreeItem): Thenable<GapTreeItem[]> {
        if (!element) {
            // Root level - group by severity
            const severityGroups = this.groupBySeverity();
            return Promise.resolve(severityGroups);
        } else if (element.contextValue === 'severity-group') {
            // Show gaps for this severity
            const gapsForSeverity = this.gaps.filter(g => g.severity === element.severity);
            return Promise.resolve(gapsForSeverity.map(g => new GapTreeItem(
                g.message,
                vscode.TreeItemCollapsibleState.None,
                g,
                'gap'
            )));
        }
        return Promise.resolve([]);
    }

    private groupBySeverity(): GapTreeItem[] {
        const groups: { [key: string]: number } = {};
        this.gaps.forEach(gap => {
            groups[gap.severity] = (groups[gap.severity] || 0) + 1;
        });

        return Object.keys(groups).map(severity => {
            const icon = this.getSeverityIcon(severity as GapItem['severity']);
            return new GapTreeItem(
                `${icon} ${severity} (${groups[severity]})`,
                vscode.TreeItemCollapsibleState.Expanded,
                undefined,
                'severity-group',
                severity as GapItem['severity']
            );
        });
    }

    private getSeverityIcon(severity: GapItem['severity']): string {
        switch (severity) {
            case 'CRITICAL': return '🔴';
            case 'HIGH': return '🟠';
            case 'MEDIUM': return '🟡';
            case 'LOW': return '🟢';
            default: return '⚪';
        }
    }
}

export class GapTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly gap?: GapItem,
        public readonly contextValue?: string,
        public readonly severity?: GapItem['severity']
    ) {
        super(label, collapsibleState);

        if (gap) {
            this.tooltip = `${gap.file}:${gap.line}\n${gap.message}`;
            this.description = `${gap.file}:${gap.line}`;
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [
                    vscode.Uri.file(gap.file),
                    { selection: new vscode.Range(gap.line - 1, 0, gap.line - 1, 0) }
                ]
            };
        }
    }
}
