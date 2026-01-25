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
exports.Logger = exports.LogLevel = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["SECURITY"] = "SECURITY";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('RepoSense System');
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setLogFile(filePath) {
        this.logFile = filePath;
        const logDir = path.dirname(filePath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
    debug(category, message, metadata) {
        this.log(LogLevel.DEBUG, category, message, metadata);
    }
    info(category, message, metadata) {
        this.log(LogLevel.INFO, category, message, metadata);
    }
    warn(category, message, metadata) {
        this.log(LogLevel.WARN, category, message, metadata);
    }
    error(category, message, error) {
        const metadata = error instanceof Error ? {
            stack: error.stack,
            message: error.message
        } : error;
        this.log(LogLevel.ERROR, category, message, metadata);
    }
    security(category, message, metadata) {
        this.log(LogLevel.SECURITY, category, message, metadata);
    }
    log(level, category, message, metadata) {
        const entry = {
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
            }
            catch (err) {
                console.error('Failed to write to log file:', err);
            }
        }
    }
    show() {
        this.outputChannel.show();
    }
}
exports.Logger = Logger;
