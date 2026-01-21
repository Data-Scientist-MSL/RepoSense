/**
 * GapAnalysisProvider.ts (Sprint 11 - Refactored for Artifacts)
 * 
 * Tree data provider for displaying gaps from persisted artifacts.
 * Eliminates recompute - reads gaps from graph.json instead of live analysis.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ArtifactReader, Graph, GraphNode } from '../services/run/ArtifactReader';
import { RunContextService } from '../services/run/RunContextService';

interface GapData {
  id: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  file?: string;
  line?: number;
  suggestedFix?: string;
  data?: Record<string, unknown>;
}

export class GapAnalysisProvider implements vscode.TreeDataProvider<GapTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    GapTreeItem | undefined | null | void
  > = new vscode.EventEmitter<GapTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<GapTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private gaps: GapData[] = [];
  private groupBy: 'severity' | 'type' | 'file' = 'severity';
  private reader: ArtifactReader;
  private context: RunContextService;

  constructor(
    workspaceRoot: string,
    context: vscode.ExtensionContext,
    workspace: vscode.WorkspaceFolder
  ) {
    this.reader = new ArtifactReader(workspaceRoot);
    this.context = new RunContextService(context, workspace);

    // Watch for active run changes
    this.context.onActiveRunChanged(() => {
      this.loadGapsFromArtifacts();
    });

    // Load initial artifacts
    this.loadGapsFromArtifacts();
  }

  /**
   * Load gaps from persisted artifacts (no recompute).
   */
  private async loadGapsFromArtifacts(): Promise<void> {
    try {
      const ctx = await this.context.getCurrentContext();

      if (!ctx.activeRunId) {
        this.gaps = [];
        this.refresh();
        return;
      }

      const graph = await this.reader.readGraph(ctx.activeRunId);
      this.gaps = graph.nodes
        .filter((n) => n.type === 'gap')
        .map((n) => this.nodeToGap(n));

      this.refresh();
    } catch (error) {
      console.error('Error loading gaps from artifacts:', error);
      this.gaps = [];
      this.refresh();
    }
  }

  private nodeToGap(node: GraphNode): GapData {
    const data = node.data as Record<string, any>;

    return {
      id: node.id,
      message: data.message || 'Unnamed gap',
      severity: (data.severity || 'MEDIUM') as GapData['severity'],
      type: data.type || 'unknown',
      file: data.file as string | undefined,
      line: data.line as number | undefined,
      suggestedFix: data.suggestedFix as string | undefined,
      data,
    };
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
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
      let filteredGaps: GapData[] = [];
      if (element.contextValue === 'severity-group' && element.severity) {
        filteredGaps = this.gaps.filter((g) => g.severity === element.severity);
      } else if (element.contextValue === 'type-group' && element.groupKey) {
        filteredGaps = this.gaps.filter((g) => g.type === element.groupKey);
      } else if (element.contextValue === 'file-group' && element.groupKey) {
        filteredGaps = this.gaps.filter((g) => g.file === element.groupKey);
      }

      return Promise.resolve(
        filteredGaps.map(
          (g) =>
            new GapTreeItem(
              g.message,
              vscode.TreeItemCollapsibleState.None,
              g,
              'gap'
            )
        )
      );
    }

    return Promise.resolve([]);
  }

  private groupBySeverity(): GapTreeItem[] {
    const groups: { [key: string]: number } = {};
    this.gaps.forEach((gap) => {
      groups[gap.severity] = (groups[gap.severity] || 0) + 1;
    });

    return Object.keys(groups)
      .sort()
      .map((severity) => {
        const iconId = this.getSeverityThemeIcon(severity as GapData['severity']);
        return new GapTreeItem(
          `${severity} (${groups[severity]})`,
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          'severity-group',
          severity as GapData['severity'],
          undefined,
          new vscode.ThemeIcon(
            iconId,
            this.getSeverityThemeColor(severity as GapData['severity'])
          )
        );
      });
  }

  private groupByType(): GapTreeItem[] {
    const groups: { [key: string]: number } = {};
    this.gaps.forEach((gap) => {
      groups[gap.type] = (groups[gap.type] || 0) + 1;
    });

    return Object.keys(groups)
      .sort()
      .map((type) => {
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
    this.gaps.forEach((gap) => {
      groups[gap.file || '(unknown)'] = (groups[gap.file || '(unknown)'] || 0) + 1;
    });

    return Object.keys(groups)
      .sort()
      .map((file) => {
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

  private getSeverityThemeIcon(severity: GapData['severity']): string {
    switch (severity) {
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'debug';
      default:
        return 'note';
    }
  }

  private getSeverityThemeColor(severity: GapData['severity']): vscode.ThemeColor {
    switch (severity) {
      case 'CRITICAL':
        return new vscode.ThemeColor('errorForeground');
      case 'HIGH':
        return new vscode.ThemeColor('warningForeground');
      case 'MEDIUM':
      case 'LOW':
      default:
        return new vscode.ThemeColor('foreground');
    }
  }

  private getTypeIcon(type: string): string {
    switch (type) {
      case 'orphan_endpoint':
        return 'warning';
      case 'untested_endpoint':
        return 'issues';
      case 'unused_endpoint':
        return 'debug-disconnect';
      default:
        return 'note';
    }
  }

  private formatType(type: string): string {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

export class GapTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public gap?: GapData,
    public contextValue?: string,
    public severity?: GapData['severity'],
    public groupKey?: string,
    iconPath?: vscode.ThemeIcon
  ) {
    super(label, collapsibleState);

    if (contextValue === 'gap' && gap) {
      this.description = `${gap.file}:${gap.line}`;
      this.tooltip = gap.suggestedFix || gap.message;
      if (gap.file) {
        this.command = {
          title: 'Open file',
          command: 'vscode.open',
          arguments: [vscode.Uri.file(gap.file)],
        };
      }
    }

    if (iconPath) {
      this.iconPath = iconPath;
    }
  }
}
