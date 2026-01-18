import * as crypto from 'crypto';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import { AnalysisResult } from '../../models/types';

export class CacheService {
    private db: Database.Database;
    private static readonly TABLE_NAME = 'analysis_cache';

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
        this.initializeDatabase();
    }

    private initializeDatabase(): void {
        // Create tables
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS ${CacheService.TABLE_NAME} (
                file_path TEXT PRIMARY KEY,
                content_hash TEXT NOT NULL,
                analysis_result TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                version TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_timestamp 
            ON ${CacheService.TABLE_NAME}(timestamp);

            CREATE INDEX IF NOT EXISTS idx_hash 
            ON ${CacheService.TABLE_NAME}(content_hash);
        `);
    }

    /**
     * Get cached analysis result for a file
     */
    get(filePath: string, contentHash: string): AnalysisResult | null {
        const stmt = this.db.prepare(`
            SELECT analysis_result 
            FROM ${CacheService.TABLE_NAME} 
            WHERE file_path = ? AND content_hash = ?
        `);

        const row = stmt.get(filePath, contentHash) as { analysis_result: string } | undefined;
        
        if (row) {
            try {
                return JSON.parse(row.analysis_result);
            } catch (error) {
                console.error(`Failed to parse cached result for ${filePath}:`, error);
                return null;
            }
        }

        return null;
    }

    /**
     * Store analysis result in cache
     */
    set(filePath: string, contentHash: string, result: AnalysisResult, version: string = '1.0'): void {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO ${CacheService.TABLE_NAME} 
            (file_path, content_hash, analysis_result, timestamp, version)
            VALUES (?, ?, ?, ?, ?)
        `);

        stmt.run(
            filePath,
            contentHash,
            JSON.stringify(result),
            Date.now(),
            version
        );
    }

    /**
     * Calculate SHA-256 hash of file content
     */
    static hashContent(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Calculate hash of file by path
     */
    static hashFile(filePath: string): string {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return CacheService.hashContent(content);
        } catch (error) {
            console.error(`Failed to hash file ${filePath}:`, error);
            return '';
        }
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        const stmt = this.db.prepare(`DELETE FROM ${CacheService.TABLE_NAME}`);
        stmt.run();
    }

    /**
     * Remove cache entries older than specified days
     */
    prune(olderThanDays: number = 30): number {
        const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
        
        const stmt = this.db.prepare(`
            DELETE FROM ${CacheService.TABLE_NAME} 
            WHERE timestamp < ?
        `);

        const result = stmt.run(cutoffTime);
        return result.changes;
    }

    /**
     * Get cache statistics
     */
    getStats(): { totalEntries: number; oldestEntry: number; newestEntry: number; totalSize: number } {
        const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${CacheService.TABLE_NAME}`);
        const oldestStmt = this.db.prepare(`SELECT MIN(timestamp) as oldest FROM ${CacheService.TABLE_NAME}`);
        const newestStmt = this.db.prepare(`SELECT MAX(timestamp) as newest FROM ${CacheService.TABLE_NAME}`);
        const sizeStmt = this.db.prepare(`SELECT SUM(LENGTH(analysis_result)) as size FROM ${CacheService.TABLE_NAME}`);

        const count = (countStmt.get() as { count: number }).count;
        const oldest = (oldestStmt.get() as { oldest: number | null }).oldest || 0;
        const newest = (newestStmt.get() as { newest: number | null }).newest || 0;
        const size = (sizeStmt.get() as { size: number | null }).size || 0;

        return {
            totalEntries: count,
            oldestEntry: oldest,
            newestEntry: newest,
            totalSize: size
        };
    }

    /**
     * Close database connection
     */
    close(): void {
        this.db.close();
    }

    /**
     * Check if a file's cache is still valid
     */
    isValid(filePath: string): boolean {
        const currentHash = CacheService.hashFile(filePath);
        if (!currentHash) {
            return false;
        }

        const stmt = this.db.prepare(`
            SELECT content_hash 
            FROM ${CacheService.TABLE_NAME} 
            WHERE file_path = ?
        `);

        const row = stmt.get(filePath) as { content_hash: string } | undefined;
        
        return row?.content_hash === currentHash;
    }

    /**
     * Invalidate cache for specific file
     */
    invalidate(filePath: string): void {
        const stmt = this.db.prepare(`
            DELETE FROM ${CacheService.TABLE_NAME} 
            WHERE file_path = ?
        `);

        stmt.run(filePath);
    }
}
