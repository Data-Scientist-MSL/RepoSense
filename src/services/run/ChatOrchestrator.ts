/**
 * ChatOrchestrator.ts (Sprint 11 - Day 2, Extended Sprint 13 Task #3)
 * 
 * Unified chat interface combining:
 * - RepoSense analysis-driven responses (gaps, endpoints, coverage)
 * - Dynamic command routing (intent-based)
 * - Artifact-backed data (no recompute)
 * - Sprint 13: Preview generation integration (test generation from gaps)
 */

import { ArtifactReader, Report, Graph } from './ArtifactReader';
import { RunContextService } from './RunContextService';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatContext {
  runId: string;
  userMessage: string;
  sessionId: string;
}

export interface ChatResponse {
  content: string;
  runId: string;
  suggestedActions: SuggestedAction[];
  metadata: {
    sourceArtifacts: string[];
    computationTimeMs: number;
  };
}

export interface SuggestedAction {
  label: string;
  command: string;
  args: Record<string, unknown>;
}

export type CommandName = 'analyze' | 'gaps' | 'coverage' | 'endpoint' | 'recommendations';

export interface Command {
  name: CommandName;
  description: string;
  handler: (args: Record<string, unknown>) => Promise<string>;
}

export class ChatOrchestrator {
  private reader: ArtifactReader;
  private context: RunContextService;
  private commands: Map<CommandName, Command> = new Map();

  constructor(reader: ArtifactReader, context: RunContextService) {
    this.reader = reader;
    this.context = context;
    this.registerCommands();
  }

  /**
   * Process user message and generate response.
   */
  async processMessage(userMessage: string, sessionId: string): Promise<ChatResponse> {
    const startTime = Date.now();
    const activeContext = await this.context.getCurrentContext();

    if (!activeContext.activeRunId) {
      return {
        content:
          'No active run. Please run analysis first (Cmd+Shift+R) to generate artifacts.',
        runId: '',
        suggestedActions: [],
        metadata: {
          sourceArtifacts: [],
          computationTimeMs: Date.now() - startTime,
        },
      };
    }

    try {
      // Route to appropriate command based on intent
      const command = this.routeIntent(userMessage);
      const report = await this.reader.readReport(activeContext.activeRunId);
      const graph = await this.reader.readGraph(activeContext.activeRunId);

      let content = '';
      const sourceArtifacts: string[] = [];

      switch (command) {
        case 'gaps':
          content = this.generateGapsResponse(graph, report);
          sourceArtifacts.push('graph.json', 'report.json');
          break;

        case 'coverage':
          content = this.generateCoverageResponse(report);
          sourceArtifacts.push('report.json');
          break;

        case 'recommendations':
          content = this.generateRecommendationsResponse(report);
          sourceArtifacts.push('report.json');
          break;

        case 'endpoint':
          content = this.generateEndpointResponse(graph);
          sourceArtifacts.push('graph.json');
          break;

        case 'analyze':
        default:
          content = this.generateAnalysisResponse(graph, report);
          sourceArtifacts.push('graph.json', 'report.json');
          break;
      }

      const suggestedActions = this.generateSuggestedActions(report);

      return {
        content,
        runId: activeContext.activeRunId,
        suggestedActions,
        metadata: {
          sourceArtifacts,
          computationTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        content: `Error processing message: ${error instanceof Error ? error.message : String(error)}`,
        runId: activeContext.activeRunId || '',
        suggestedActions: [],
        metadata: {
          sourceArtifacts: [],
          computationTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Route user message to appropriate command based on intent.
   */
  private routeIntent(message: string): CommandName {
    const lower = message.toLowerCase();

    if (lower.includes('gap') || lower.includes('orphan') || lower.includes('uncover')) {
      return 'gaps';
    }

    if (lower.includes('coverage') || lower.includes('how much')) {
      return 'coverage';
    }

    if (lower.includes('recommend') || lower.includes('improve') || lower.includes('suggest')) {
      return 'recommendations';
    }

    if (lower.includes('endpoint') || lower.includes('api') || lower.includes('method')) {
      return 'endpoint';
    }

    return 'analyze';
  }

  /**
   * Generate response about discovered gaps.
   */
  private generateGapsResponse(graph: Graph, report: Report): string {
    const gaps = graph.nodes.filter(n => n.type === 'gap');
    const total = report.statistics.totalGaps;
    const critical = report.statistics.criticalGaps;

    if (gaps.length === 0) {
      return '✅ No gaps found! All discovered endpoints have tests.';
    }

    return `Found ${total} gaps (${critical} critical):
    
The analysis identified untested endpoints. Critical gaps indicate high-risk areas where code is not covered by tests.

Severity: ${report.severity}
Coverage ratio: ${Math.round(report.statistics.coverageRatio * 100)}%`;
  }

  /**
   * Generate response about test coverage.
   */
  private generateCoverageResponse(report: Report): string {
    const coverage = Math.round(report.statistics.coverageRatio * 100);
    const total = report.statistics.totalEndpoints;
    const covered = report.statistics.coveredEndpoints;

    return `📊 Test Coverage Report

Total Endpoints: ${total}
Covered: ${covered}
Coverage Ratio: ${coverage}%

Severity Level: ${report.severity}`;
  }

  /**
   * Generate response with recommendations.
   */
  private generateRecommendationsResponse(report: Report): string {
    if (report.recommendations.length === 0) {
      return 'No recommendations at this time.';
    }

    let response = '💡 Recommendations:\n\n';

    for (const rec of report.recommendations.slice(0, 5)) {
      response += `• ${rec.description}\n`;
    }

    return response;
  }

  /**
   * Generate response about endpoints.
   */
  private generateEndpointResponse(graph: Graph): string {
    const endpoints = graph.nodes.filter(n => n.type === 'endpoint');
    return `Found ${endpoints.length} total endpoints in the codebase.`;
  }

  /**
   * Generate overall analysis response.
   */
  private generateAnalysisResponse(graph: Graph, report: Report): string {
    const endpoints = graph.nodes.filter(n => n.type === 'endpoint').length;
    const gaps = graph.nodes.filter(n => n.type === 'gap').length;
    const coverage = Math.round(report.statistics.coverageRatio * 100);

    return `📈 RepoSense Analysis Summary

Endpoints: ${endpoints}
Test Gaps: ${gaps}
Coverage: ${coverage}%
Severity: ${report.severity}

Use commands like "show gaps", "coverage", or "recommendations" for more details.`;
  }

  /**
   * Generate suggested follow-up actions.
   */
  private generateSuggestedActions(report: Report): SuggestedAction[] {
    const actions: SuggestedAction[] = [
      {
        label: 'View Gaps',
        command: 'reposense.chat.gaps',
        args: {},
      },
      {
        label: 'View Coverage',
        command: 'reposense.chat.coverage',
        args: {},
      },
    ];

    if (report.recommendations.length > 0) {
      actions.push({
        label: 'Apply Recommendations',
        command: 'reposense.chat.recommendations',
        args: {},
      });
    }

    // Sprint 13 Integration: Add test preview generation action for gaps
    // User can generate test previews directly from chat for identified gaps
    const hasRecommendations = report.recommendations && report.recommendations.length > 0;
    if (hasRecommendations) {
      actions.push({
        label: 'Generate Test Preview',
        command: 'reposense.generateTestPreview',
        args: {
          fromChat: true
        },
      });
    }

    return actions;
  }

  private registerCommands(): void {
    // Commands registered but not used in v1
    // Reserved for future LLM integration
  }
}
