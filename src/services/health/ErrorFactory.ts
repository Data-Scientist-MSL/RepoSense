/**
 * ErrorFactory.ts
 * 
 * Factory for creating and handling errors
 */

import { RepoSenseError, ErrorCodes } from './RepoSenseError';

export class ErrorFactory {
  /**
   * Create a health check error
   */
  public static createHealthCheckError(message: string, cause?: Error): RepoSenseError {
    return new RepoSenseError(message, ErrorCodes.HEALTH_CHECK_FAILED, cause);
  }

  /**
   * Create a corruption error
   */
  public static createCorruptionError(message: string, cause?: Error): RepoSenseError {
    return new RepoSenseError(message, ErrorCodes.ARTIFACT_CORRUPTED, cause);
  }

  /**
   * Create a permission error
   */
  public static createPermissionError(message: string, cause?: Error): RepoSenseError {
    return new RepoSenseError(message, ErrorCodes.PERMISSION_DENIED, cause);
  }

  /**
   * Create a recovery error
   */
  public static createRecoveryError(message: string, cause?: Error): RepoSenseError {
    return new RepoSenseError(message, ErrorCodes.RECOVERY_FAILED, cause);
  }

  /**
   * Create a backup error
   */
  public static createBackupError(message: string, cause?: Error): RepoSenseError {
    return new RepoSenseError(message, ErrorCodes.BACKUP_FAILED, cause);
  }

  /**
   * Create a generic error
   */
  public static createGenericError(message: string, cause?: Error): RepoSenseError {
    return new RepoSenseError(message, ErrorCodes.UNKNOWN, cause);
  }

  /**
   * Handle any error
   */
  public static handle(error: any): RepoSenseError {
    if (error instanceof RepoSenseError) {
      return error;
    }
    return new RepoSenseError(error?.message || 'Unknown error', ErrorCodes.UNKNOWN, error);
  }
}
