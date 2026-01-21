/**
 * ConsentProvider.ts (Sprint 14 - UX Guardrails)
 * 
 * Manages explicit user consent for all mutations:
 * - Apply test previews
 * - Rollback previous applies
 * - Execute generated tests
 * 
 * CRITICAL: No mutation proceeds without explicit "YES" confirmation.
 * Users must understand:
 * - What files will change
 * - Rollback availability
 * - Execution scope
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { SafeArtifactIO } from '../services/security/SafeArtifactIO';
import { ErrorFactory } from '../services/security/ErrorFactory';
import { ApplySnapshot } from '../services/apply/SafeApplyEngine';

export interface ConsentRequest {
  action: 'apply' | 'rollback' | 'execute';
  title: string;
  description: string;
  details: string[]; // List of details user sees
  confirmation: string; // Exact phrase user must confirm
  hasRollback: boolean;
}

export interface ConsentResponse {
  granted: boolean;
  confirmedPhrase?: string;
  timestamp: string;
}

export class ConsentProvider {
  private context: vscode.ExtensionContext;
  private artifactIo: SafeArtifactIO;

  constructor(context: vscode.ExtensionContext, artifactIo: SafeArtifactIO) {
    this.context = context;
    this.artifactIo = artifactIo;
  }

  /**
   * Show consent modal for apply action.
   * User must confirm to proceed.
   */
  async requestApplyConsent(snapshot: ApplySnapshot, previewPath: string): Promise<ConsentResponse> {
    try {
      const fileCount = snapshot.files.length;
      const testCount = 1; // One test preview
      
      const details = [
        `📁 Files to write: ${fileCount} file(s)`,
        ...snapshot.files.slice(0, 5).map(f => `   • ${path.basename(f.filePath)}`),
        fileCount > 5 ? `   • ... and ${fileCount - 5} more` : '',
        '',
        `🧪 Tests to execute: ${testCount} test(s)`,
        `   • Generated from workspace analysis`,
        '',
        `♻️ Rollback available: YES`,
        `   • Workspace snapshot created before apply`,
        `   • Can restore exact pre-apply state`,
        '',
        `⏱️ Timeout: 30 seconds per test`,
        `   • Prevents runaway test execution`,
      ].filter(d => d !== '');

      const confirmation = 'I understand the changes and consent to apply';

      const response = await vscode.window.showInformationMessage(
        `🔒 Confirm Test Preview Apply`,
        { modal: true, detail: details.join('\n') },
        { title: 'Cancel', isCloseAffordance: true },
        { title: 'Review Files', isCloseAffordance: false },
        { title: 'Apply (I Consent)', isCloseAffordance: false }
      );

      if (!response) {
        return {
          granted: false,
          timestamp: new Date().toISOString()
        };
      }

      if (response.title === 'Review Files') {
        // Show file diff view
        await this.showFileDiffView(snapshot);
        // Re-prompt after review
        return this.requestApplyConsent(snapshot, previewPath);
      }

      if (response.title === 'Apply (I Consent)') {
        // Verify user explicitly confirmed
        const confirmed = await vscode.window.showInputBox({
          prompt: `Type to confirm: "${confirmation}"`,
          placeHolder: confirmation,
          validateInput: (value) => {
            if (value !== confirmation) {
              return `Please type exactly: ${confirmation}`;
            }
            return undefined;
          }
        });

        if (confirmed === confirmation) {
          return {
            granted: true,
            confirmedPhrase: confirmed,
            timestamp: new Date().toISOString()
          };
        }
      }

      return {
        granted: false,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      vscode.window.showErrorMessage(`Error requesting consent: ${error}`);
      return {
        granted: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Show consent modal for rollback action.
   */
  async requestRollbackConsent(mutationId: string, appliedFiles: string[]): Promise<ConsentResponse> {
    try {
      const details = [
        `🔄 Rollback Action`,
        '',
        `Files that will be restored:`,
        ...appliedFiles.slice(0, 5).map(f => `   • ${path.basename(f)}`),
        appliedFiles.length > 5 ? `   • ... and ${appliedFiles.length - 5} more` : '',
        '',
        `This operation:`,
        `   ✓ Restores workspace to pre-apply state`,
        `   ✓ Verifies file integrity (SHA256)`,
        `   ✓ Updates run metadata`,
        `   ✗ Does NOT affect version control history`,
      ].filter(d => d !== '');

      const confirmation = 'I consent to rollback the apply';

      const response = await vscode.window.showInformationMessage(
        `🔄 Confirm Rollback`,
        { modal: true, detail: details.join('\n') },
        { title: 'Cancel', isCloseAffordance: true },
        { title: 'Rollback (I Consent)', isCloseAffordance: false }
      );

      if (response?.title === 'Rollback (I Consent)') {
        const confirmed = await vscode.window.showInputBox({
          prompt: `Type to confirm: "${confirmation}"`,
          placeHolder: confirmation,
          validateInput: (value) => {
            if (value !== confirmation) {
              return `Please type exactly: ${confirmation}`;
            }
            return undefined;
          }
        });

        if (confirmed === confirmation) {
          return {
            granted: true,
            confirmedPhrase: confirmed,
            timestamp: new Date().toISOString()
          };
        }
      }

      return {
        granted: false,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      vscode.window.showErrorMessage(`Error requesting consent: ${error}`);
      return {
        granted: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Show consent modal for test execution.
   */
  async requestExecutionConsent(testCount: number, timeout: number): Promise<ConsentResponse> {
    try {
      const details = [
        `🧪 Execute Generated Tests`,
        '',
        `Tests to run: ${testCount}`,
        `Timeout per test: ${timeout} seconds`,
        '',
        `Execution scope:`,
        `   • Tests run in workspace isolation`,
        `   • No network access allowed`,
        `   • Process killed if timeout exceeded`,
        `   • Logs captured for review`,
        '',
        `Evidence captured:`,
        `   • stdout/stderr logs`,
        `   • Test coverage data`,
        `   • Execution metadata (duration, status)`,
      ].filter(d => d !== '');

      const confirmation = 'I consent to execute these tests';

      const response = await vscode.window.showInformationMessage(
        `🧪 Confirm Test Execution`,
        { modal: true, detail: details.join('\n') },
        { title: 'Cancel', isCloseAffordance: true },
        { title: 'Execute (I Consent)', isCloseAffordance: false }
      );

      if (response?.title === 'Execute (I Consent)') {
        const confirmed = await vscode.window.showInputBox({
          prompt: `Type to confirm: "${confirmation}"`,
          placeHolder: confirmation,
          validateInput: (value) => {
            if (value !== confirmation) {
              return `Please type exactly: ${confirmation}`;
            }
            return undefined;
          }
        });

        if (confirmed === confirmation) {
          return {
            granted: true,
            confirmedPhrase: confirmed,
            timestamp: new Date().toISOString()
          };
        }
      }

      return {
        granted: false,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      vscode.window.showErrorMessage(`Error requesting consent: ${error}`);
      return {
        granted: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Show webview with file diffs for review.
   */
  private async showFileDiffView(snapshot: ApplySnapshot): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'reposense.fileDiff',
      'Preview Files - Diff View',
      vscode.ViewColumn.Beside,
      { enableScripts: false }
    );

    const htmlContent = this.generateDiffHtml(snapshot);
    panel.webview.html = htmlContent;
  }

  /**
   * Generate HTML for file diff view.
   */
  private generateDiffHtml(snapshot: ApplySnapshot): string {
    const fileRows = snapshot.files
      .map(f => `
        <tr>
          <td class="path">${this.escapeHtml(f.filePath)}</td>
          <td class="hash">${f.hash.substring(0, 8)}...</td>
          <td class="preview">${this.escapeHtml(f.originalContent.substring(0, 100))}</td>
        </tr>
      `)
      .join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: monospace;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
          }
          h1 { color: #4ec9b0; margin-top: 0; }
          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #3e3e42;
          }
          th {
            background: #252526;
            padding: 10px;
            text-align: left;
            border-bottom: 2px solid #3e3e42;
            color: #4ec9b0;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #3e3e42;
          }
          .path { color: #ce9178; word-break: break-all; }
          .hash { color: #b5cea8; font-size: 0.9em; }
          .preview { color: #d7ba7d; font-size: 0.85em; overflow: hidden; }
          .file-count { color: #569cd6; }
        </style>
      </head>
      <body>
        <h1>📋 Files to be Modified</h1>
        <p>Total: <span class="file-count">${snapshot.files.length}</span> file(s)</p>
        <table>
          <thead>
            <tr>
              <th>File Path</th>
              <th>SHA256 (first 8 chars)</th>
              <th>Preview (first 100 chars)</th>
            </tr>
          </thead>
          <tbody>
            ${fileRows}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Escape HTML to prevent XSS.
   */
  private escapeHtml(text: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, char => escapeMap[char]);
  }
}
