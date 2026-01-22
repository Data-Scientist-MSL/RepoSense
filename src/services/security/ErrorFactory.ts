/**
 * ErrorFactory.ts (Sprint 12 - Security)
 * 
 * Factory for creating standardized RepoSenseError instances.
 * Ensures all errors have proper codes, remediation, and severity.
 */

import { RepoSenseError, ErrorSeverity, ErrorCodes } from './RepoSenseError';

export class ErrorFactory {
  /**
   * Create I/O write failure error.
   */
  static ioWriteFailed(
    path: string,
    reason: string,
    runId?: string
  ): RepoSenseError {
    return new RepoSenseError({
      code: ErrorCodes.IO_WRITE_FAILED,
      message: `Failed to write file: ${path}. Reason: ${reason}`,
      severity: 'ERROR',
      remediation: [
        'Check if .reposense folder has write permissions',
        'Ensure disk space is available',
        'Try running "RepoSense: Run Health Check" command',
        'If persists, restart VS Code',
      ],
      runId,
      timestamp: new Date().toISOString(),
      context: { path, reason },
    });
  }

  /**
   * Create I/O read failure error.
   */
  static ioReadFailed(
    path: string,
    reason: string,
    runId?: string
  ): RepoSenseError {
    return new RepoSenseError({
      code: ErrorCodes.IO_READ_FAILED,
      message: `Failed to read file: ${path}. Reason: ${reason}`,
      severity: 'ERROR',
      remediation: [
        'Verify file exists and is readable',
        'Check file permissions',
        'Try running "RepoSense: Run Health Check" command',
      ],
      runId,
      timestamp: new Date().toISOString(),
      context: { path, reason },
    });
  }

  /**
   * Create invalid JSON error.
   */
  static invalidJson(path: string, reason: string, runId?: string): RepoSenseError {
    return new RepoSenseError({
      code: ErrorCodes.IO_INVALID_JSON,
      message: `Invalid JSON in ${path}: ${reason}`,
      severity: 'CRITICAL',
      remediation: [
        'The artifact may be corrupted',
        'Try deleting .reposense/runs/<runId> and scanning again',
        'Contact support if file cannot be recovered',
      ],
      runId,
      timestamp: new Date().toISOString(),
      context: { path, reason },
    });
  }

  /**
   * Create path traversal attack error.
   */
  static pathTraversal(attemptedPath: string, rootPath: string): RepoSenseError {
    return new RepoSenseError({
      code: ErrorCodes.IO_PATH_TRAVERSAL,
      message: `Security violation: attempted to access path outside .reposense: ${attemptedPath}`,
      severity: 'CRITICAL',
      remediation: [
        'This is a security violation',
        'RepoSense operations are limited to the .reposense folder',
        'If you believe this is an error, contact support',
      ],
      timestamp: new Date().toISOString(),
      context: { attemptedPath, rootPath },
    });
  }

  /**
   * Create permission denied error.
   */
  static permissionDenied(path: string, operation: string): RepoSenseError {
    return new RepoSenseError({
      code: ErrorCodes.IO_PERMISSION_DENIED,
      message: `Permission denied on ${operation} for ${path}`,
      severity: 'ERROR',
      remediation: [
        `Grant write permissions to ${path}`,
        'Ensure .reposense folder is writable',
        'Run VS Code with appropriate permissions',
      ],
      timestamp: new Date().toISOString(),
      context: { path, operation },
    });
  }

  /**
   * Create run locked error (crash recovery).
   */
  static runLocked(runId: string): RepoSenseError {
    return new RepoSenseError({
      code: ErrorCodes.RUN_LOCKED,
      message: `Run ${runId} is locked (may have crashed)`,
      severity: 'WARN',
      remediation: [
        'The previous run did not complete cleanly',
        'Run "RepoSense: Run Health Check" to inspect',
        'Delete .reposense/runs/<runId>/run.lock to force recovery',
        'Then try scanning again',
      ],
      runId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Create run not found error.
   */
  static runNotFound(runId: string): RepoSenseError {
    return new RepoSenseError({
      code: ErrorCodes.RUN_NOT_FOUND,
      message: `Run not found: ${runId}`,
      severity: 'ERROR',
      remediation: [
        'The run may have been deleted',
        'Try running analysis again to create a new run',
        'Check .reposense/runs/ for available runs',
      ],
      runId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Create corrupted artifacts error.
   */
  static corruptedArtifacts(runId: string, details: string): RepoSenseError {
    return new RepoSenseError({
      code: ErrorCodes.RUN_CORRUPTED,
      message: `Run artifacts are corrupted: ${details}`,
      severity: 'CRITICAL',
      remediation: [
        'The run folder may be damaged',
        `Delete .reposense/runs/${runId} to remove corrupted data`,
        'Run analysis again to regenerate',
      ],
      runId,
      timestamp: new Date().toISOString(),
      context: { details },
    });
  }

  /**
   * Create scan failed error.
   */
  static scanFailed(reason: string, runId?: string): RepoSenseError {
    return new RepoSenseError({
      code: ErrorCodes.SCAN_FAILED,
      message: `Analysis scan failed: ${reason}`,
      severity: 'ERROR',
      remediation: [
        'Check the analysis output for details',
        'Verify all source files are present and readable',
        'Try running analysis again',
        'If error persists, contact support',
      ],
      runId,
      timestamp: new Date().toISOString(),
      context: { reason },
    });
  }

  /**
   * Create policy violation error (security).
   */
  static policyViolation(action: string, reason: string): RepoSenseError {
    return new RepoSenseError({
      code: ErrorCodes.POLICY_VIOLATION,
      message: `Security policy violation: ${action} is not allowed. Reason: ${reason}`,
      severity: 'CRITICAL',
      remediation: [
        'This action violates RepoSense security policy',
        'Only whitelisted commands can execute',
        'Contact an administrator if you need this action',
      ],
      timestamp: new Date().toISOString(),
      context: { action, reason },
    });
  }

  /**
   * Create secret detected error.
   */
  static secretDetected(location: string, secretType: string): RepoSenseError {
    return new RepoSenseError({
      code: ErrorCodes.SECRET_DETECTED,
      message: `Potential secret detected and redacted: ${secretType}`,
      severity: 'WARN',
      remediation: [
        `Review ${location} for sensitive data`,
        'Rotate any potentially exposed secrets',
        'Use .reposense/redact-rules.json to customize redaction',
      ],
      timestamp: new Date().toISOString(),
      context: { location, secretType },
    });
  }

  /**
   * Create health check failed error.
   */
  static healthCheckFailed(issue: string, runId?: string): RepoSenseError {
    return new RepoSenseError({
      code: ErrorCodes.HEALTH_CHECK_FAILED,
      message: `Health check failed: ${issue}`,
      severity: 'ERROR',
      remediation: [
        'Run "RepoSense: Run Health Check" for detailed diagnostics',
        'Follow suggested fixes in health report',
        'Restart VS Code if issues persist',
      ],
      runId,
      timestamp: new Date().toISOString(),
      context: { issue },
    });
  }

  /**
   * Create generic error from unknown cause.
   */
  static unknown(cause: unknown, context?: Record<string, unknown>): RepoSenseError {
    const message = cause instanceof Error ? cause.message : String(cause);

    return new RepoSenseError({
      code: ErrorCodes.UNKNOWN,
      message: `An unexpected error occurred: ${message}`,
      severity: 'ERROR',
      remediation: [
        'Check the output channel for detailed logs',
        'Try running "RepoSense: Run Health Check"',
        'Restart VS Code',
        'If error persists, contact support with logs',
      ],
      timestamp: new Date().toISOString(),
      cause,
      context,
    });
  }

  /**
   * Create generation failure error (test previews, exports, etc).
   */
  static generationFailed(
    message: string,
    reason: string,
    context?: Record<string, unknown>
  ): RepoSenseError {
    return new RepoSenseError({
      code: ErrorCodes.GENERATION_FAILED,
      message: `Generation failed: ${message}. Reason: ${reason}`,
      severity: 'ERROR',
      remediation: [
        'Ensure all dependencies are installed',
        'Check if the run data is complete and not corrupted',
        'Try running "RepoSense: Run Health Check"',
        'Retry the operation',
      ],
      timestamp: new Date().toISOString(),
      context,
    });
  }
}
