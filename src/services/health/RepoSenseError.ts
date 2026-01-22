/**
 * RepoSenseError.ts
 * 
 * Custom error hierarchy for RepoSense
 */

export enum ErrorCodes {
  // Health checks
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  ARTIFACT_CORRUPTED = 'ARTIFACT_CORRUPTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // Recovery
  RECOVERY_FAILED = 'RECOVERY_FAILED',
  BACKUP_FAILED = 'BACKUP_FAILED',
  
  // General
  UNKNOWN = 'UNKNOWN',
}

export class RepoSenseError extends Error {
  public readonly code: ErrorCodes;
  public readonly cause?: Error;

  constructor(message: string, code: ErrorCodes = ErrorCodes.UNKNOWN, cause?: Error) {
    super(message);
    this.name = 'RepoSenseError';
    this.code = code;
    this.cause = cause;
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      cause: this.cause?.message,
    };
  }
}
