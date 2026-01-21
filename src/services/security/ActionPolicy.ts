/**
 * ActionPolicy.ts (Sprint 12 - Security)
 * 
 * Allow-list of safe commands. All other actions are blocked.
 * Ensures chat cannot execute arbitrary VS Code commands or shell operations.
 */

import { RepoSenseError } from './RepoSenseError';
import { ErrorFactory } from './ErrorFactory';

export type SafeAction =
  | 'scan'
  | 'openReport'
  | 'openRunFolder'
  | 'compareRuns'
  | 'explainNode'
  | 'generateTest'
  | 'viewDiagram'
  | 'applyRecommendation'
  | 'applyTestPreview'
  | 'rollbackApply'
  | 'executeTests';

export interface ActionRequest {
  action: SafeAction;
  args?: Record<string, unknown>;
  context?: {
    runId?: string;
    nodeId?: string;
    workspaceFolder?: string;
  };
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: RepoSenseError;
}

/**
 * Enforces security policy for all RepoSense actions.
 */
export class ActionPolicy {
  private static readonly ALLOWED_ACTIONS: Set<SafeAction> = new Set([
    'scan',
    'openReport',
    'openRunFolder',
    'compareRuns',
    'explainNode',
    'generateTest',
    'viewDiagram',
    'applyRecommendation',
    'applyTestPreview',
    'rollbackApply',
    'executeTests',
  ]);

  /**
   * Validate action before execution.
   * Returns error if action is not allowed.
   */
  static validateAction(request: ActionRequest): RepoSenseError | null {
    // Check if action is in allow-list
    if (!this.ALLOWED_ACTIONS.has(request.action)) {
      return ErrorFactory.policyViolation(
        request.action,
        `Action not in allow-list. Allowed: ${Array.from(this.ALLOWED_ACTIONS).join(', ')}`
      );
    }

    // Validate action-specific constraints
    switch (request.action) {
      case 'scan':
        return this.validateScan(request);
      case 'generateTest':
        return this.validateGenerateTest(request);
      case 'applyRecommendation':
        return this.validateApplyRecommendation(request);
      default:
        return null; // No additional validation
    }
  }

  private static validateScan(request: ActionRequest): RepoSenseError | null {
    // Scan must have a workspace folder
    if (!request.context?.workspaceFolder) {
      return ErrorFactory.policyViolation('scan', 'workspaceFolder required');
    }
    return null;
  }

  private static validateGenerateTest(request: ActionRequest): RepoSenseError | null {
    // Generate test cannot apply patches automatically
    // "generateTest" means generate only, no apply
    if (request.args?.autoApply === true) {
      return ErrorFactory.policyViolation(
        'generateTest',
        'Automatic patch application is not allowed. Review and apply manually.'
      );
    }
    return null;
  }

  private static validateApplyRecommendation(
    request: ActionRequest
  ): RepoSenseError | null {
    // Apply recommendation must specify which recommendation
    if (!request.args?.recommendationId) {
      return ErrorFactory.policyViolation(
        'applyRecommendation',
        'recommendationId required'
      );
    }
    return null;
  }

  /**
   * Get description of allowed actions for UI/chat.
   */
  static getAllowedActions(): Array<{ action: SafeAction; description: string }> {
    return [
      {
        action: 'scan',
        description: 'Run analysis on the repository',
      },
      {
        action: 'openReport',
        description: 'Open the analysis report in the editor',
      },
      {
        action: 'openRunFolder',
        description: 'Open the .reposense/runs/<runId> folder',
      },
      {
        action: 'compareRuns',
        description: 'Compare two analysis runs side-by-side',
      },
      {
        action: 'explainNode',
        description: 'Show details about a specific endpoint or gap',
      },
      {
        action: 'generateTest',
        description: 'Generate tests for uncovered endpoints (requires review)',
      },
      {
        action: 'viewDiagram',
        description: 'View architecture diagrams',
      },
      {
        action: 'applyRecommendation',
        description: 'Apply a specific recommendation',
      },
    ];
  }

  /**
   * Check if an action requires user confirmation.
   */
  static requiresConfirmation(action: SafeAction): boolean {
    return ['generateTest', 'applyRecommendation'].includes(action);
  }
}
