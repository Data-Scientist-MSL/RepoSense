/**
 * RepoSenseError.ts (Sprint 12 - Security)
 * 
 * Unified error model for all RepoSense failures.
 * Every error is structured, remediable, and auditable.
 */

export type ErrorSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface RepoSenseErrorData {
  code: string;                    // RS_CATEGORY_TYPE
  message: string;                 // User-facing message
  severity: ErrorSeverity;         // Severity level
  remediation: string[];           // Clear remediation steps
  runId?: string;                  // Associated run
  timestamp: string;               // ISO 8601
  cause?: unknown;                 // Original error (internal)
  context?: Record<string, unknown>; // Additional debugging context
}

/**
 * Base error class for all RepoSense failures.
 */
export class RepoSenseError extends Error implements RepoSenseErrorData {
  code: string;
  message: string;
  severity: ErrorSeverity;
  remediation: string[];
  runId?: string;
  timestamp: string;
  cause?: unknown;
  context?: Record<string, unknown>;

  constructor(data: RepoSenseErrorData) {
    super(data.message);
    this.name = 'RepoSenseError';
    this.code = data.code;
    this.message = data.message;
    this.severity = data.severity;
    this.remediation = data.remediation;
    this.runId = data.runId;
    this.timestamp = data.timestamp;
    this.cause = data.cause;
    this.context = data.context;

    // Maintain prototype chain for instanceof checks
    Object.setPrototypeOf(this, RepoSenseError.prototype);
  }

  /**
   * Serialize for persistence in meta.json or logging.
   */
  toJSON(): RepoSenseErrorData {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      remediation: this.remediation,
      runId: this.runId,
      timestamp: this.timestamp,
      context: this.context,
    };
  }

  /**
   * Format for UI display.
   */
  toUserMessage(): string {
    let msg = `[${this.code}] ${this.message}\n\n`;
    if (this.remediation.length > 0) {
      msg += 'How to fix:\n';
      this.remediation.forEach((step, idx) => {
        msg += `  ${idx + 1}. ${step}\n`;
      });
    }
    return msg;
  }

  /**
   * Format for logging (may include internal cause).
   */
  toLogMessage(): string {
    return `[${this.severity}] ${this.code}: ${this.message}\nCause: ${
      this.cause instanceof Error ? this.cause.message : String(this.cause)
    }`;
  }
}

/**
 * Error code definitions.
 */
export const ErrorCodes = {
  // I/O Errors
  IO_WRITE_FAILED: 'RS_IO_WRITE_FAILED',
  IO_READ_FAILED: 'RS_IO_READ_FAILED',
  IO_INVALID_JSON: 'RS_IO_INVALID_JSON',
  IO_PATH_TRAVERSAL: 'RS_IO_PATH_TRAVERSAL',
  IO_PERMISSION_DENIED: 'RS_IO_PERMISSION_DENIED',

  // Run Lifecycle Errors
  RUN_FAILED: 'RS_RUN_FAILED',
  RUN_LOCKED: 'RS_RUN_LOCKED',
  RUN_NOT_FOUND: 'RS_RUN_NOT_FOUND',
  RUN_CORRUPTED: 'RS_RUN_CORRUPTED',

  // Analysis Errors
  SCAN_FAILED: 'RS_SCAN_FAILED',
  SCAN_TIMEOUT: 'RS_SCAN_TIMEOUT',
  INVALID_ANALYSIS: 'RS_INVALID_ANALYSIS',

  // Generation Errors (Sprint 13)
  GENERATION_FAILED: 'RS_GENERATION_FAILED',

  // Security Errors
  POLICY_VIOLATION: 'RS_POLICY_VIOLATION',
  UNAUTHORIZED_ACTION: 'RS_UNAUTHORIZED_ACTION',
  SECRET_DETECTED: 'RS_SECRET_DETECTED',

  // Health Errors
  HEALTH_CHECK_FAILED: 'RS_HEALTH_CHECK_FAILED',
  CORRUPTED_ARTIFACTS: 'RS_CORRUPTED_ARTIFACTS',
  UNRECOVERABLE_STATE: 'RS_UNRECOVERABLE_STATE',

  // Generic Errors
  UNKNOWN: 'RS_UNKNOWN',
} as const;
