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
exports.GapTreeItem = exports.GapAnalysisProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class GapAnalysisProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.gaps = [];
        this.groupBy = 'severity';
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
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    update(gaps) {
        this.gaps = gaps;
        this.refresh();
    }
    setGrouping(groupBy) {
        this.groupBy = groupBy;
        this.refresh();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
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
        }
        else if (element.contextValue?.endsWith('-group')) {
            // Show gaps for this group
            let filteredGaps = [];
            if (element.contextValue === 'severity-group' && element.severity) {
                filteredGaps = this.gaps.filter(g => g.severity === element.severity);
            }
            else if (element.contextValue === 'type-group' && element.groupKey) {
                filteredGaps = this.gaps.filter(g => g.type === element.groupKey);
            }
            else if (element.contextValue === 'file-group' && element.groupKey) {
                filteredGaps = this.gaps.filter(g => g.file === element.groupKey);
            }
            return Promise.resolve(filteredGaps.map(g => new GapTreeItem(g.message, vscode.TreeItemCollapsibleState.None, g, 'gap')));
        }
        return Promise.resolve([]);
    }
    groupBySeverity() {
        const groups = {};
        this.gaps.forEach(gap => {
            groups[gap.severity] = (groups[gap.severity] || 0) + 1;
        });
        return Object.keys(groups).map(severity => {
            const iconId = this.getSeverityThemeIcon(severity);
            return new GapTreeItem(`${severity} (${groups[severity]})`, vscode.TreeItemCollapsibleState.Expanded, undefined, 'severity-group', severity, undefined, new vscode.ThemeIcon(iconId, this.getSeverityThemeColor(severity)));
        });
    }
    groupByType() {
        const groups = {};
        this.gaps.forEach(gap => {
            groups[gap.type] = (groups[gap.type] || 0) + 1;
        });
        return Object.keys(groups).map(type => {
            const iconId = this.getTypeIcon(type);
            return new GapTreeItem(`${this.formatType(type)} (${groups[type]})`, vscode.TreeItemCollapsibleState.Expanded, undefined, 'type-group', undefined, type, new vscode.ThemeIcon(iconId));
        });
    }
    groupByFile() {
        const groups = {};
        this.gaps.forEach(gap => {
            groups[gap.file] = (groups[gap.file] || 0) + 1;
        });
        return Object.keys(groups).map(file => {
            return new GapTreeItem(`${path.basename(file)} (${groups[file]})`, vscode.TreeItemCollapsibleState.Expanded, undefined, 'file-group', undefined, file, new vscode.ThemeIcon('file-code'));
        });
    }
    getSeverityThemeIcon(severity) {
        switch (severity) {
            case 'CRITICAL': return 'error';
            case 'HIGH': return 'warning';
            case 'MEDIUM': return 'info';
            case 'LOW': return 'check';
            default: return 'circle-outline';
        }
    }
    getSeverityThemeColor(severity) {
        switch (severity) {
            case 'CRITICAL': return new vscode.ThemeColor('errorForeground');
            case 'HIGH': return new vscode.ThemeColor('editorWarning.foreground');
            case 'MEDIUM': return new vscode.ThemeColor('editorInfo.foreground');
            case 'LOW': return new vscode.ThemeColor('terminal.ansiGreen');
            default: return new vscode.ThemeColor('foreground');
        }
    }
    getTypeIcon(type) {
        if (type.includes('orphaned'))
            return 'debug-disconnect';
        if (type.includes('unused'))
            return 'trash';
        if (type.includes('suggestion'))
            return 'lightbulb';
        return 'issue-opened';
    }
    formatType(type) {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
}
exports.GapAnalysisProvider = GapAnalysisProvider;
class GapTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, gap, contextValue, severity, groupKey, icon) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.gap = gap;
        this.contextValue = contextValue;
        this.severity = severity;
        this.groupKey = groupKey;
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
    getSeverityIcon(severity) {
        switch (severity) {
            case 'CRITICAL': return 'error';
            case 'HIGH': return 'warning';
            case 'MEDIUM': return 'info';
            case 'LOW': return 'check';
            default: return 'circle-outline';
        }
    }
    getSeverityColor(severity) {
        switch (severity) {
            case 'CRITICAL': return new vscode.ThemeColor('errorForeground');
            case 'HIGH': return new vscode.ThemeColor('editorWarning.foreground');
            case 'MEDIUM': return new vscode.ThemeColor('editorInfo.foreground');
            case 'LOW': return new vscode.ThemeColor('terminal.ansiGreen');
            default: return new vscode.ThemeColor('foreground');
        }
    }
}
exports.GapTreeItem = GapTreeItem;
