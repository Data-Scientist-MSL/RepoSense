import * as vscode from 'vscode';
import * as crypto from 'crypto';

export class IncrementalAnalyzer {
    private fileHashes: Map<string, string> = new Map();
    private analysisCache: Map<string, CachedAnalysis> = new Map();
    private fileWatcher: vscode.FileSystemWatcher | undefined;
    private changedFiles: Set<string> = new Set();

    constructor() {
        this.setupFileWatcher();
    }

    private setupFileWatcher(): void {
        // Watch for file changes in workspace
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(
            '**/*.{ts,js,tsx,jsx,py}',
            false, // create
            false, // change
            false  // delete
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

    private markFileAsChanged(filePath: string): void {
        this.changedFiles.add(filePath);
        this.analysisCache.delete(filePath);
        this.fileHashes.delete(filePath);
    }

    private invalidateFile(filePath: string): void {
        this.changedFiles.delete(filePath);
        this.analysisCache.delete(filePath);
        this.fileHashes.delete(filePath);
    }

    public async hasFileChanged(filePath: string, content: string): Promise<boolean> {
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

    private computeHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    public getCachedAnalysis<T>(filePath: string): T | undefined {
        const cached = this.analysisCache.get(filePath);
        if (!cached) return undefined;

        // Check if cache is still valid (within TTL)
        const age = Date.now() - cached.timestamp;
        if (age > cached.ttl) {
            this.analysisCache.delete(filePath);
            return undefined;
        }

        return cached.data as T;
    }

    public setCachedAnalysis<T>(
        filePath: string,
        data: T,
        ttl: number = 5 * 60 * 1000 // 5 minutes default
    ): void {
        this.analysisCache.set(filePath, {
            data,
            timestamp: Date.now(),
            ttl
        });
        this.changedFiles.delete(filePath);
    }

    public getChangedFiles(): string[] {
        return Array.from(this.changedFiles);
    }

    public clearChangedFiles(): void {
        this.changedFiles.clear();
    }

    public isFileModified(filePath: string): boolean {
        return this.changedFiles.has(filePath);
    }

    public invalidateAll(): void {
        this.fileHashes.clear();
        this.analysisCache.clear();
        this.changedFiles.clear();
    }

    public getStats(): IncrementalAnalysisStats {
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

    public dispose(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        this.invalidateAll();
    }
}

interface CachedAnalysis {
    data: any;
    timestamp: number;
    ttl: number;
}

interface IncrementalAnalysisStats {
    totalFiles: number;
    cachedFiles: number;
    modifiedFiles: number;
    cacheHitRate: number;
    cacheSizeBytes: number;
    cacheSizeMB: number;
}
