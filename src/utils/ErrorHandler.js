"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
exports.handleError = handleError;
exports.withRetry = withRetry;
exports.withCircuitBreaker = withCircuitBreaker;
const vscode = __importStar(require("vscode"));
const Logger_1 = require("./Logger");
const Telemetry_1 = require("./Telemetry");
const CircuitBreaker_1 = require("./CircuitBreaker");
class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.circuitBreakers = new Map();
        this.logger = Logger_1.Logger.getInstance();
        this.telemetry = Telemetry_1.Telemetry.getInstance();
        this.setupGlobalErrorHandlers();
    }
    static getInstance() {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }
    setupGlobalErrorHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.handleCriticalError(error, 'Uncaught Exception');
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason) => {
            this.handleCriticalError(reason instanceof Error ? reason : new Error(String(reason)), 'Unhandled Promise Rejection');
        });
    }
    async handleError(error, context, options = {}) {
        const { showUser = true, severity = 'error', retryable = false, telemetry = true } = options;
        // Log error
        this.logError(error, context, severity);
        // Send telemetry if enabled
        if (telemetry && this.isTelemetryEnabled()) {
            await this.sendTelemetry(error, context);
        }
        // Show user-friendly message
        if (showUser) {
            await this.showErrorMessage(error, context, severity, retryable);
        }
    }
    handleCriticalError(error, type) {
        console.error(`${type}:`, error);
        this.logError(error, { operation: type, component: 'Global' }, 'critical');
        vscode.window.showErrorMessage(`RepoSense encountered a critical error: ${error.message}`, 'Report Issue', 'Dismiss').then(action => {
            if (action === 'Report Issue') {
                this.openIssueReporter(error, type);
            }
        });
    }
    logError(error, context, severity) {
        const entry = {
            timestamp: new Date().toISOString(),
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            context,
            severity
        };
        this.errorLog.push(entry);
        // Maintain log size
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
        // Log to new Logger instance
        const logMsg = `[${severity.toUpperCase()}] ${context.operation}: ${error.message}`;
        switch (severity) {
            case 'critical':
            case 'error':
                this.logger.error(context.component, logMsg, error);
                break;
            case 'warning':
                this.logger.warn(context.component, logMsg, context);
                break;
            default:
                this.logger.info(context.component, logMsg, context);
        }
    }
    async showErrorMessage(error, context, severity, retryable) {
        const friendlyMessage = this.getFriendlyMessage(error, context);
        const actions = [];
        if (retryable) {
            actions.push('Retry');
        }
        if (this.isKnownIssue(error)) {
            actions.push('Learn More');
        }
        actions.push('Dismiss');
        const showMethod = severity === 'critical' || severity === 'error'
            ? vscode.window.showErrorMessage
            : severity === 'warning'
                ? vscode.window.showWarningMessage
                : vscode.window.showInformationMessage;
        const action = await showMethod(friendlyMessage, ...actions);
        if (action === 'Learn More') {
            await this.openHelpUrl(error);
        }
    }
    getFriendlyMessage(error, context) {
        // Map common errors to user-friendly messages
        const errorMappings = {
            'ECONNREFUSED': 'Ollama is not running. Please start Ollama to use AI features.',
            'ENOTFOUND': 'Cannot connect to Ollama. Check your network connection.',
            'ETIMEDOUT': 'Request timed out. The operation took too long to complete.',
            'ENOENT': 'File not found. The requested file may have been moved or deleted.',
            'EACCES': 'Permission denied. Check file permissions.',
            'ERR_INVALID_ARG_TYPE': 'Invalid input provided. Please check your configuration.',
        };
        // Check for specific error codes
        const errorCode = error.code;
        if (errorCode && errorMappings[errorCode]) {
            return `${errorMappings[errorCode]} (Operation: ${context.operation})`;
        }
        // Check for known error patterns
        if (error.message.includes('model not found')) {
            return 'LLM model not found. Install it with: ollama pull deepseek-coder:6.7b';
        }
        if (error.message.includes('workspace')) {
            return 'No workspace folder is open. Please open a folder to use RepoSense.';
        }
        if (error.message.includes('parse') || error.message.includes('syntax')) {
            return 'Unable to parse file. The file may contain syntax errors.';
        }
        // Generic fallback
        return `RepoSense encountered an error during ${context.operation}: ${error.message}`;
    }
    isKnownIssue(error) {
        const knownIssues = [
            'ECONNREFUSED',
            'model not found',
            'workspace',
            'ENOTFOUND'
        ];
        const errorCode = error.code;
        if (errorCode && knownIssues.includes(errorCode)) {
            return true;
        }
        return knownIssues.some(pattern => error.message.includes(pattern));
    }
    async openHelpUrl(error) {
        const errorCode = error.code;
        let url = 'https://github.com/Data-Scientist-MSL/RepoSense/wiki/Troubleshooting';
        // Specific help URLs for common issues
        if (errorCode === 'ECONNREFUSED' || error.message.includes('Ollama')) {
            url = 'https://ollama.ai/download';
        }
        else if (error.message.includes('model not found')) {
            url = 'https://github.com/Data-Scientist-MSL/RepoSense/wiki/LLM-Models';
        }
        await vscode.env.openExternal(vscode.Uri.parse(url));
    }
    async openIssueReporter(error, type) {
        const title = encodeURIComponent(`${type}: ${error.message}`);
        const body = encodeURIComponent(`## Error Type\n${type}\n\n` +
            `## Error Message\n${error.message}\n\n` +
            `## Stack Trace\n\`\`\`\n${error.stack}\n\`\`\`\n\n` +
            `## VS Code Version\n${vscode.version}\n\n` +
            `## Extension Version\n${this.getExtensionVersion()}`);
        const url = `https://github.com/Data-Scientist-MSL/RepoSense/issues/new?title=${title}&body=${body}`;
        await vscode.env.openExternal(vscode.Uri.parse(url));
    }
    isTelemetryEnabled() {
        const config = vscode.workspace.getConfiguration('reposense');
        return config.get('telemetry.enabled', false);
    }
    async sendTelemetry(error, context) {
        this.telemetry.trackEvent('error', {
            errorName: error.name,
            errorMessage: error.message,
            operation: context.operation,
            component: context.component,
            timestamp: new Date().toISOString()
        });
    }
    getExtensionVersion() {
        const ext = vscode.extensions.getExtension('reposense.reposense');
        return ext?.packageJSON?.version || 'unknown';
    }
    getErrorLog() {
        return [...this.errorLog];
    }
    clearErrorLog() {
        this.errorLog = [];
    }
    getCircuitBreaker(name, options = { failureThreshold: 5, resetTimeout: 30000 }) {
        if (!this.circuitBreakers.has(name)) {
            this.circuitBreakers.set(name, new CircuitBreaker_1.CircuitBreaker(name, options));
        }
        return this.circuitBreakers.get(name);
    }
    async withRetry(operation, options = {}) {
        const { maxAttempts = 3, delayMs = 1000, backoffMultiplier = 2, retryableErrors = [] } = options;
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Check if error is retryable
                const isRetryable = retryableErrors.length === 0 ||
                    retryableErrors.some(pattern => lastError.message.includes(pattern) ||
                        lastError.code === pattern);
                if (!isRetryable || attempt === maxAttempts) {
                    throw lastError;
                }
                // Wait before retry with exponential backoff
                const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
                console.log(`[Retry] Attempt ${attempt + 1}/${maxAttempts} after ${delay}ms`);
            }
        }
        throw lastError || new Error('Retry failed');
    }
}
exports.ErrorHandler = ErrorHandler;
// Convenience wrapper functions
function handleError(error, operation, component, options) {
    return ErrorHandler.getInstance().handleError(error, { operation, component }, options);
}
function withRetry(operation, options) {
    return ErrorHandler.getInstance().withRetry(operation, options);
}
function withCircuitBreaker(name, operation, options) {
    return ErrorHandler.getInstance().getCircuitBreaker(name, options).execute(operation);
}
