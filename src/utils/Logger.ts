import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    SECURITY = 'SECURITY'
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    category: string;
    message: string;
    metadata?: any;
    runId?: string;
}

export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;
    private logFile: string | undefined;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('RepoSense System');
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public setLogFile(filePath: string): void {
        this.logFile = filePath;
        const logDir = path.dirname(filePath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    public debug(category: string, message: string, metadata?: any): void {
        this.log(LogLevel.DEBUG, category, message, metadata);
    }

    public info(category: string, message: string, metadata?: any): void {
        this.log(LogLevel.INFO, category, message, metadata);
    }

    public warn(category: string, message: string, metadata?: any): void {
        this.log(LogLevel.WARN, category, message, metadata);
    }

    public error(category: string, message: string, error?: any): void {
        const metadata = error instanceof Error ? {
            stack: error.stack,
            message: error.message
        } : error;
        this.log(LogLevel.ERROR, category, message, metadata);
    }

    public security(category: string, message: string, metadata?: any): void {
        this.log(LogLevel.SECURITY, category, message, metadata);
    }

    private log(level: LogLevel, category: string, message: string, metadata?: any): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            metadata
        };

        const logString = `[${entry.timestamp}] [${entry.level}] [${entry.category}] ${entry.message}`;
        this.outputChannel.appendLine(logString);

        if (metadata) {
            this.outputChannel.appendLine(`Metadata: ${JSON.stringify(metadata, null, 2)}`);
        }

        if (this.logFile) {
            try {
                fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
            } catch (err) {
                console.error('Failed to write to log file:', err);
            }
        }
    }

    public show(): void {
        this.outputChannel.show();
    }
}
