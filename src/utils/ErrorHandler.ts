import * as vscode from 'vscode';

export class ErrorHandler {
    private static instance: ErrorHandler;
    private errorLog: ErrorLogEntry[] = [];
    private readonly maxLogSize = 100;

    private constructor() {
        this.setupGlobalErrorHandlers();
    }

    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    private setupGlobalErrorHandlers(): void {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error: Error) => {
            this.handleCriticalError(error, 'Uncaught Exception');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason: any) => {
            this.handleCriticalError(
                reason instanceof Error ? reason : new Error(String(reason)),
                'Unhandled Promise Rejection'
            );
        });
    }

    public async handleError(
        error: Error,
        context: ErrorContext,
        options: ErrorHandlingOptions = {}
    ): Promise<void> {
        const {
            showUser = true,
            severity = 'error',
            retryable = false,
            telemetry = true
        } = options;

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

    private handleCriticalError(error: Error, type: string): void {
        console.error(`${type}:`, error);
        this.logError(error, { operation: type, component: 'Global' }, 'critical');

        vscode.window.showErrorMessage(
            `RepoSense encountered a critical error: ${error.message}`,
            'Report Issue',
            'Dismiss'
        ).then(action => {
            if (action === 'Report Issue') {
                this.openIssueReporter(error, type);
            }
        });
    }

    private logError(error: Error, context: ErrorContext, severity: ErrorSeverity): void {
        const entry: ErrorLogEntry = {
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

        // Log to console based on severity
        const logMethod = severity === 'critical' || severity === 'error' 
            ? console.error 
            : severity === 'warning' 
                ? console.warn 
                : console.log;

        logMethod(`[RepoSense ${severity.toUpperCase()}]`, {
            operation: context.operation,
            component: context.component,
            error: error.message
        });
    }

    private async showErrorMessage(
        error: Error,
        context: ErrorContext,
        severity: ErrorSeverity,
        retryable: boolean
    ): Promise<void> {
        const friendlyMessage = this.getFriendlyMessage(error, context);
        const actions: string[] = [];

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

    private getFriendlyMessage(error: Error, context: ErrorContext): string {
        // Map common errors to user-friendly messages
        const errorMappings: Record<string, string> = {
            'ECONNREFUSED': 'Ollama is not running. Please start Ollama to use AI features.',
            'ENOTFOUND': 'Cannot connect to Ollama. Check your network connection.',
            'ETIMEDOUT': 'Request timed out. The operation took too long to complete.',
            'ENOENT': 'File not found. The requested file may have been moved or deleted.',
            'EACCES': 'Permission denied. Check file permissions.',
            'ERR_INVALID_ARG_TYPE': 'Invalid input provided. Please check your configuration.',
        };

        // Check for specific error codes
        const errorCode = (error as any).code;
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

    private isKnownIssue(error: Error): boolean {
        const knownIssues = [
            'ECONNREFUSED',
            'model not found',
            'workspace',
            'ENOTFOUND'
        ];

        const errorCode = (error as any).code;
        if (errorCode && knownIssues.includes(errorCode)) {
            return true;
        }

        return knownIssues.some(pattern => error.message.includes(pattern));
    }

    private async openHelpUrl(error: Error): Promise<void> {
        const errorCode = (error as any).code;
        let url = 'https://github.com/Data-Scientist-MSL/RepoSense/wiki/Troubleshooting';

        // Specific help URLs for common issues
        if (errorCode === 'ECONNREFUSED' || error.message.includes('Ollama')) {
            url = 'https://ollama.ai/download';
        } else if (error.message.includes('model not found')) {
            url = 'https://github.com/Data-Scientist-MSL/RepoSense/wiki/LLM-Models';
        }

        await vscode.env.openExternal(vscode.Uri.parse(url));
    }

    private async openIssueReporter(error: Error, type: string): Promise<void> {
        const title = encodeURIComponent(`${type}: ${error.message}`);
        const body = encodeURIComponent(
            `## Error Type\n${type}\n\n` +
            `## Error Message\n${error.message}\n\n` +
            `## Stack Trace\n\`\`\`\n${error.stack}\n\`\`\`\n\n` +
            `## VS Code Version\n${vscode.version}\n\n` +
            `## Extension Version\n${this.getExtensionVersion()}`
        );

        const url = `https://github.com/Data-Scientist-MSL/RepoSense/issues/new?title=${title}&body=${body}`;
        await vscode.env.openExternal(vscode.Uri.parse(url));
    }

    private isTelemetryEnabled(): boolean {
        const config = vscode.workspace.getConfiguration('reposense');
        return config.get<boolean>('telemetry.enabled', false);
    }

    private async sendTelemetry(error: Error, context: ErrorContext): Promise<void> {
        // Placeholder for telemetry implementation
        // In production, this would send to Application Insights or similar
        console.log('[Telemetry]', {
            errorName: error.name,
            errorMessage: error.message,
            operation: context.operation,
            component: context.component,
            timestamp: new Date().toISOString()
        });
    }

    private getExtensionVersion(): string {
        const ext = vscode.extensions.getExtension('reposense.reposense');
        return ext?.packageJSON?.version || 'unknown';
    }

    public getErrorLog(): ErrorLogEntry[] {
        return [...this.errorLog];
    }

    public clearErrorLog(): void {
        this.errorLog = [];
    }

    public async withRetry<T>(
        operation: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<T> {
        const {
            maxAttempts = 3,
            delayMs = 1000,
            backoffMultiplier = 2,
            retryableErrors = []
        } = options;

        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Check if error is retryable
                const isRetryable = retryableErrors.length === 0 ||
                    retryableErrors.some(pattern => 
                        lastError!.message.includes(pattern) ||
                        (lastError as any).code === pattern
                    );

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

export interface ErrorContext {
    operation: string;
    component: string;
    additionalInfo?: Record<string, any>;
}

export interface ErrorHandlingOptions {
    showUser?: boolean;
    severity?: ErrorSeverity;
    retryable?: boolean;
    telemetry?: boolean;
}

export interface RetryOptions {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
}

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

interface ErrorLogEntry {
    timestamp: string;
    error: {
        name: string;
        message: string;
        stack?: string;
    };
    context: ErrorContext;
    severity: ErrorSeverity;
}

// Convenience wrapper functions
export function handleError(
    error: Error,
    operation: string,
    component: string,
    options?: ErrorHandlingOptions
): Promise<void> {
    return ErrorHandler.getInstance().handleError(
        error,
        { operation, component },
        options
    );
}

export function withRetry<T>(
    operation: () => Promise<T>,
    options?: RetryOptions
): Promise<T> {
    return ErrorHandler.getInstance().withRetry(operation, options);
}
