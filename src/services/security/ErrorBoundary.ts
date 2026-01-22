/**
 * ErrorBoundary.ts (Sprint 12 - Security)
 * 
 * Error boundary for graceful error handling and recovery.
 * Wraps async operations and ensures errors are caught, logged, and surfaced.
 */

import * as vscode from 'vscode';
import { RepoSenseError } from './RepoSenseError';
import { Redactor } from './Redactor';

export interface ErrorBoundaryOptions {
  context?: vscode.ExtensionContext;
  outputChannel?: vscode.OutputChannel;
  runId?: string;
  operation?: string;
}

/**
 * Wraps operations with comprehensive error handling.
 */
export class ErrorBoundary {
  private static outputChannel?: vscode.OutputChannel;

  static setOutputChannel(channel: vscode.OutputChannel): void {
    this.outputChannel = channel;
  }

  /**
   * Execute an async operation with error handling.
   */
  static async execute<T>(
    fn: () => Promise<T>,
    options: ErrorBoundaryOptions = {}
  ): Promise<{ success: boolean; data?: T; error?: RepoSenseError }> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      const repoSenseError = this.normalizeError(error, options);
      await this.handleError(repoSenseError, options);
      return { success: false, error: repoSenseError };
    }
  }

  /**
   * Execute a sync operation with error handling.
   */
  static executeSync<T>(
    fn: () => T,
    options: ErrorBoundaryOptions = {}
  ): { success: boolean; data?: T; error?: RepoSenseError } {
    try {
      const data = fn();
      return { success: true, data };
    } catch (error) {
      const repoSenseError = this.normalizeError(error, options);
      this.handleErrorSync(repoSenseError, options);
      return { success: false, error: repoSenseError };
    }
  }

  /**
   * Convert any error to RepoSenseError.
   */
  private static normalizeError(
    error: unknown,
    options: ErrorBoundaryOptions
  ): RepoSenseError {
    if (error instanceof RepoSenseError) {
      if (options.runId && !error.runId) {
        error.runId = options.runId;
      }
      return error;
    }

    if (error instanceof Error) {
      // Parse known error patterns
      if (error.message.includes('ENOENT') || error.message.includes('not found')) {
        const { RepoSenseError: RSError, ErrorFactory } = require('./RepoSenseError');
        return ErrorFactory.ioReadFailed('unknown', error.message, options.runId);
      }

      if (error.message.includes('EACCES') || error.message.includes('permission')) {
        const { ErrorFactory } = require('./ErrorFactory');
        return ErrorFactory.permissionDenied('unknown', 'operation');
      }

      // Generic error
      const { ErrorFactory } = require('./ErrorFactory');
      return ErrorFactory.unknown(error, { operation: options.operation });
    }

    // Unknown error type
    const { ErrorFactory } = require('./ErrorFactory');
    return ErrorFactory.unknown(error, { operation: options.operation });
  }

  /**
   * Handle error: log, surface to UI, persist.
   */
  private static async handleError(
    error: RepoSenseError,
    options: ErrorBoundaryOptions
  ): Promise<void> {
    // Redact secrets before logging
    const redactedMessage = Redactor.redactError(
      new Error(error.toLogMessage())
    );

    // Log to output channel
    if (this.outputChannel) {
      this.outputChannel.appendLine(`[${error.timestamp}] ${redactedMessage}`);
    }

    // Show notification for critical errors
    if (error.severity === 'CRITICAL' || error.severity === 'ERROR') {
      vscode.window
        .showErrorMessage(error.message, ...this.getActionButtons(error))
        .then((action) => {
          if (action === 'Details') {
            if (this.outputChannel) {
              this.outputChannel.show();
            }
          }
        });
    } else if (error.severity === 'WARN') {
      vscode.window.showWarningMessage(error.message);
    }

    // TODO: Persist to meta.json (requires RunStorage context)
  }

  private static handleErrorSync(
    error: RepoSenseError,
    options: ErrorBoundaryOptions
  ): void {
    const redactedMessage = Redactor.redactError(new Error(error.toLogMessage()));

    if (this.outputChannel) {
      this.outputChannel.appendLine(`[${error.timestamp}] ${redactedMessage}`);
    }

    if (error.severity === 'CRITICAL') {
      vscode.window.showErrorMessage(error.message);
    }
  }

  private static getActionButtons(error: RepoSenseError): string[] {
    const buttons: string[] = [];

    if (error.severity === 'CRITICAL' || error.severity === 'ERROR') {
      buttons.push('Details');
    }

    if (error.remediation && error.remediation.length > 0) {
      buttons.push('How to fix');
    }

    return buttons;
  }

  /**
   * Create a wrapper for a function.
   */
  static wrap<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options: ErrorBoundaryOptions
  ): T {
    return (async (...args: unknown[]) => {
      const result = await this.execute(() => fn(...args), options);
      if (!result.success) {
        throw result.error;
      }
      return result.data;
    }) as T;
  }
}
