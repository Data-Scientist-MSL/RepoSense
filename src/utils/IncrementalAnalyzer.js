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
exports.IncrementalAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
const crypto = __importStar(require("crypto"));
class IncrementalAnalyzer {
    constructor() {
        this.fileHashes = new Map();
        this.analysisCache = new Map();
        this.changedFiles = new Set();
        this.setupFileWatcher();
    }
    setupFileWatcher() {
        // Watch for file changes in workspace
        this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,js,tsx,jsx,py}', false, // create
        false, // change
        false // delete
        );
        this.fileWatcher.onDidCreate(uri => {
            this.markFileAsChanged(uri.fsPath);
        });
        this.fileWatcher.onDidChange(uri => {
            this.markFileAsChanged(uri.fsPath);
        });
        this.fileWatcher.onDidDelete(uri => {
            this.invalidateFile(uri.fsPath);
        });
    }
    markFileAsChanged(filePath) {
        this.changedFiles.add(filePath);
        this.analysisCache.delete(filePath);
        this.fileHashes.delete(filePath);
    }
    invalidateFile(filePath) {
        this.changedFiles.delete(filePath);
        this.analysisCache.delete(filePath);
        this.fileHashes.delete(filePath);
    }
    async hasFileChanged(filePath, content) {
        const newHash = this.computeHash(content);
        const oldHash = this.fileHashes.get(filePath);
        if (!oldHash) {
            // First time seeing this file
            this.fileHashes.set(filePath, newHash);
            return true;
        }
        const changed = newHash !== oldHash;
        if (changed) {
            this.fileHashes.set(filePath, newHash);
        }
        return changed;
    }
    computeHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    getCachedAnalysis(filePath) {
        const cached = this.analysisCache.get(filePath);
        if (!cached)
            return undefined;
        // Check if cache is still valid (within TTL)
        const age = Date.now() - cached.timestamp;
        if (age > cached.ttl) {
            this.analysisCache.delete(filePath);
            return undefined;
        }
        return cached.data;
    }
    setCachedAnalysis(filePath, data, ttl = 5 * 60 * 1000 // 5 minutes default
    ) {
        this.analysisCache.set(filePath, {
            data,
            timestamp: Date.now(),
            ttl
        });
        this.changedFiles.delete(filePath);
    }
    getChangedFiles() {
        return Array.from(this.changedFiles);
    }
    clearChangedFiles() {
        this.changedFiles.clear();
    }
    isFileModified(filePath) {
        return this.changedFiles.has(filePath);
    }
    invalidateAll() {
        this.fileHashes.clear();
        this.analysisCache.clear();
        this.changedFiles.clear();
    }
    getStats() {
        const totalFiles = this.fileHashes.size;
        const cachedFiles = this.analysisCache.size;
        const modifiedFiles = this.changedFiles.size;
        const cacheHitRate = totalFiles > 0 ? cachedFiles / totalFiles : 0;
        // Calculate cache size in bytes
        let cacheSize = 0;
        this.analysisCache.forEach(cache => {
            cacheSize += JSON.stringify(cache.data).length;
        });
        return {
            totalFiles,
            cachedFiles,
            modifiedFiles,
            cacheHitRate: cacheHitRate * 100,
            cacheSizeBytes: cacheSize,
            cacheSizeMB: cacheSize / 1024 / 1024
        };
    }
    dispose() {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        this.invalidateAll();
    }
}
exports.IncrementalAnalyzer = IncrementalAnalyzer;
