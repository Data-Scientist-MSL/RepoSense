import * as vscode from 'vscode';
import * as path from 'path';
import { GapItem } from '../models/types';

export class GapAnalysisProvider implements vscode.TreeDataProvider<GapTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<GapTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<GapTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GapTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    private gaps: GapItem[] = [];
    private groupBy: 'severity' | 'type' | 'file' = 'severity';

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

    setGrouping(groupBy: 'severity' | 'type' | 'file'): void {
        this.groupBy = groupBy;
        this.refresh();
    }

    getTreeItem(element: GapTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: GapTreeItem): Thenable<GapTreeItem[]> {
        if (!element) {
            // Root level - apply selected grouping
            switch (this.groupBy) {
                case 'severity':
                    return Promise.resolve(this.groupBySeverity());
                case 'type':
                    return Promise.resolve(this.groupByType());
                case 'file':
                    return Promise.resolve(this.groupByFile());
            }
        } else if (element.contextValue?.endsWith('-group')) {
            // Show gaps for this group
            let filteredGaps: GapItem[] = [];
            if (element.contextValue === 'severity-group' && element.severity) {
                filteredGaps = this.gaps.filter(g => g.severity === element.severity);
            } else if (element.contextValue === 'type-group' && element.groupKey) {
                filteredGaps = this.gaps.filter(g => g.type === element.groupKey);
            } else if (element.contextValue === 'file-group' && element.groupKey) {
                filteredGaps = this.gaps.filter(g => g.file === element.groupKey);
            }
            return Promise.resolve(filteredGaps.map(g => new GapTreeItem(
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
            const iconId = this.getSeverityThemeIcon(severity as GapItem['severity']);
            return new GapTreeItem(
                `${severity} (${groups[severity]})`,
                vscode.TreeItemCollapsibleState.Expanded,
                undefined,
                'severity-group',
                severity as GapItem['severity'],
                undefined,
                new vscode.ThemeIcon(iconId, this.getSeverityThemeColor(severity as GapItem['severity']))
            );
        });
    }

    private groupByType(): GapTreeItem[] {
        const groups: { [key: string]: number } = {};
        this.gaps.forEach(gap => {
            groups[gap.type] = (groups[gap.type] || 0) + 1;
        });

        return Object.keys(groups).map(type => {
            const iconId = this.getTypeIcon(type);
            return new GapTreeItem(
                `${this.formatType(type)} (${groups[type]})`,
                vscode.TreeItemCollapsibleState.Expanded,
                undefined,
                'type-group',
                undefined,
                type,
                new vscode.ThemeIcon(iconId)
            );
        });
    }

    private groupByFile(): GapTreeItem[] {
        const groups: { [key: string]: number } = {};
        this.gaps.forEach(gap => {
            groups[gap.file] = (groups[gap.file] || 0) + 1;
        });

        return Object.keys(groups).map(file => {
            return new GapTreeItem(
                `${path.basename(file)} (${groups[file]})`,
                vscode.TreeItemCollapsibleState.Expanded,
                undefined,
                'file-group',
                undefined,
                file,
                new vscode.ThemeIcon('file-code')
            );
        });
    }

    private getSeverityThemeIcon(severity: GapItem['severity']): string {
        switch (severity) {
            case 'CRITICAL': return 'error';
            case 'HIGH': return 'warning';
            case 'MEDIUM': return 'info';
            case 'LOW': return 'check';
            default: return 'circle-outline';
        }
    }

    private getSeverityThemeColor(severity: GapItem['severity']): vscode.ThemeColor {
        switch (severity) {
            case 'CRITICAL': return new vscode.ThemeColor('errorForeground');
            case 'HIGH': return new vscode.ThemeColor('editorWarning.foreground');
            case 'MEDIUM': return new vscode.ThemeColor('editorInfo.foreground');
            case 'LOW': return new vscode.ThemeColor('terminal.ansiGreen');
            default: return new vscode.ThemeColor('foreground');
        }
    }

    private getTypeIcon(type: string): string {
        if (type.includes('orphaned')) return 'debug-disconnect';
        if (type.includes('unused')) return 'trash';
        if (type.includes('suggestion')) return 'lightbulb';
        return 'issue-opened';
    }

    private formatType(type: string): string {
        return type.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
}

export class GapTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly gap?: GapItem,
        public readonly contextValue?: string,
        public readonly severity?: GapItem['severity'],
        public readonly groupKey?: string,
        icon?: vscode.ThemeIcon
    ) {
        super(label, collapsibleState);

        if (icon) {
            this.iconPath = icon;
        }

        if (gap) {
            // Create rich tooltip with markdown
            const tooltipMd = new vscode.MarkdownString();
            tooltipMd.appendMarkdown(`**${gap.type.replace('_', ' ').toUpperCase()}**\n\n`);
            tooltipMd.appendMarkdown(`${gap.message}\n\n`);
            tooltipMd.appendMarkdown(`📁 ${gap.file}:${gap.line}\n\n`);
            if (gap.suggestedFix) {
                tooltipMd.appendMarkdown(`💡 **Suggested Fix:** ${gap.suggestedFix}`);
            }
            this.tooltip = tooltipMd;
            
            this.description = `${path.basename(gap.file)}:${gap.line}`;
            this.resourceUri = vscode.Uri.file(gap.file);
            
            // Set icon based on severity
            const iconId = this.getSeverityIcon(gap.severity);
            const iconColor = this.getSeverityColor(gap.severity);
            this.iconPath = new vscode.ThemeIcon(iconId, iconColor);
            
            // Add command to open file at specific line
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

    private getSeverityIcon(severity: GapItem['severity']): string {
        switch (severity) {
            case 'CRITICAL': return 'error';
            case 'HIGH': return 'warning';
            case 'MEDIUM': return 'info';
            case 'LOW': return 'check';
            default: return 'circle-outline';
        }
    }

    private getSeverityColor(severity: GapItem['severity']): vscode.ThemeColor {
        switch (severity) {
            case 'CRITICAL': return new vscode.ThemeColor('errorForeground');
            case 'HIGH': return new vscode.ThemeColor('editorWarning.foreground');
            case 'MEDIUM': return new vscode.ThemeColor('editorInfo.foreground');
            case 'LOW': return new vscode.ThemeColor('terminal.ansiGreen');
            default: return new vscode.ThemeColor('foreground');
        }
    }
}
