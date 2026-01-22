/**
 * Sprint 12 Security & Health Module Exports
 */

// Error Model
export {
  RepoSenseError,
  ErrorSeverity,
  type RepoSenseErrorData,
  ErrorCodes,
} from './RepoSenseError';

// Error Factory
export { ErrorFactory } from './ErrorFactory';

// Safe I/O
export { SafeArtifactIO } from './SafeArtifactIO';

// Error Boundary
export { ErrorBoundary, type ErrorBoundaryOptions } from './ErrorBoundary';

// Action Policy
export {
  ActionPolicy,
  type SafeAction,
  type ActionRequest,
  type ActionResult,
} from './ActionPolicy';

// Redaction
export { Redactor, type RedactionPattern } from './Redactor';

// Health Service
export {
  RunHealthService,
  type HealthCheckResult,
  type HealthCheck,
} from '../health/RunHealthService';
