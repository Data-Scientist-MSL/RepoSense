/**
 * ArtifactStore.ts
 * 
 * Manages centralized artifact storage for RepoSense runs.
 * Handles: analysis results, test plans, patches, execution logs, screenshots, videos.
 * 
 * File structure:
 * .reposense/
 *   runs/
 *     <runId>/
 *       scan.json                     # AnalysisArtifact
 *       plan.json                     # TestPlan[] + RemediationPlan[]
 *       applied-patches.json          # PatchApplication[]
 *       execution-results.json        # ExecutionResult[]
 *       report.md                     # Markdown report
 *       report.html                   # HTML report (optional)
 *       report.json                   # JSON report
 *       generated-tests/
 *         playwright/
 *           endpoint-name.test.ts
 *         jest/
 *           endpoint-name.test.ts
 *       screenshots/
 *         <executionId>-1234567890.png
 *       videos/
 *         <executionId>-1234567890.webm
 *       logs/
 *         execution-<executionId>.log
 */

import * as fs from 'fs';
import * as path from 'path';
import {
    ArtifactStore as IArtifactStore,
    ArtifactStoreLayout,
    AnalysisArtifact,
    TestPlan,
    PatchApplication,
    ExecutionResult,
    ReportArtifact,
    ExecutionArtifact
} from '../models/RunOrchestrator';

export class ArtifactStore implements IArtifactStore {
    private rootDir: string;
    private currentRunId: string = '';

    constructor(reposenseRoot: string = '.reposense') {
        this.rootDir = reposenseRoot;
    }

    /**
     * Initialize artifact storage for a new run
     */
    async initialize(runId: string): Promise<void> {
        this.currentRunId = runId;

        const runDir = this.getRunDir(runId);
        const subDirs = [
            'generated-tests',
            'generated-tests/playwright',
            'generated-tests/jest',
            'generated-tests/cypress',
            'screenshots',
            'videos',
            'logs'
        ];

        // Create run root directory
        this.ensureDir(runDir);

        // Create subdirectories
        for (const subDir of subDirs) {
            this.ensureDir(path.join(runDir, subDir));
        }

        // Create index file
        const indexPath = path.join(runDir, 'index.json');
        const index = {
            runId,
            createdAt: new Date().toISOString(),
            artifacts: {
                analysis: null,
                plans: null,
                patches: null,
                executions: null,
                report: null,
                screenshots: [],
                videos: [],
                logs: []
            }
        };
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    }

    /**
     * Save analysis artifact
     */
    async saveAnalysis(artifact: AnalysisArtifact): Promise<void> {
        const filePath = path.join(this.getRunDir(this.currentRunId), 'scan.json');
        this.ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2));
    }

    /**
     * Save test and remediation plans
     */
    async savePlans(plans: (TestPlan | unknown)[]): Promise<void> {
        const filePath = path.join(this.getRunDir(this.currentRunId), 'plan.json');
        this.ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(plans, null, 2));
    }

    /**
     * Save patch applications
     */
    async savePatchApplications(applications: PatchApplication[]): Promise<void> {
        const filePath = path.join(this.getRunDir(this.currentRunId), 'applied-patches.json');
        this.ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(applications, null, 2));
    }

    /**
     * Save execution results
     */
    async saveExecutionResults(results: ExecutionResult[]): Promise<void> {
        const filePath = path.join(this.getRunDir(this.currentRunId), 'execution-results.json');
        this.ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
    }

    /**
     * Save report (all formats)
     */
    async saveReport(report: ReportArtifact): Promise<void> {
        const runDir = this.getRunDir(this.currentRunId);
        this.ensureDir(runDir);

        // JSON format
        fs.writeFileSync(
            path.join(runDir, 'report.json'),
            JSON.stringify(report, null, 2)
        );

        // Markdown format
        if (report.markdownContent) {
            fs.writeFileSync(path.join(runDir, 'report.md'), report.markdownContent);
        }

        // HTML format (optional)
        if (report.htmlContent) {
            fs.writeFileSync(path.join(runDir, 'report.html'), report.htmlContent);
        }

        // Update index
        this.updateIndex(this.currentRunId, 'report', report.reportId);
    }

    /**
     * Save screenshot from test execution
     */
    async saveScreenshot(executionId: string, buffer: Buffer): Promise<string> {
        const screenshotsDir = path.join(
            this.getRunDir(this.currentRunId),
            'screenshots'
        );
        this.ensureDir(screenshotsDir);

        const fileName = `${executionId}-${Date.now()}.png`;
        const filePath = path.join(screenshotsDir, fileName);

        fs.writeFileSync(filePath, buffer);

        // Track in index
        this.addArtifactToIndex(this.currentRunId, 'screenshots', {
            type: 'screenshot',
            path: path.relative(this.getRunDir(this.currentRunId), filePath),
            mimeType: 'image/png',
            sizeBytes: buffer.length,
            timestamp: Date.now()
        });

        return path.relative(this.rootDir, filePath);
    }

    /**
     * Save video from test execution
     */
    async saveVideo(executionId: string, filePath: string): Promise<string> {
        const videosDir = path.join(this.getRunDir(this.currentRunId), 'videos');
        this.ensureDir(videosDir);

        const fileName = `${executionId}-${Date.now()}.webm`;
        const destPath = path.join(videosDir, fileName);

        fs.copyFileSync(filePath, destPath);

        // Track in index
        const fileSize = fs.statSync(filePath).size;
        this.addArtifactToIndex(this.currentRunId, 'videos', {
            type: 'video',
            path: path.relative(this.getRunDir(this.currentRunId), destPath),
            mimeType: 'video/webm',
            sizeBytes: fileSize,
            timestamp: Date.now()
        });

        return path.relative(this.rootDir, destPath);
    }

    /**
     * Save execution log
     */
    async saveLog(executionId: string, content: string): Promise<string> {
        const logsDir = path.join(this.getRunDir(this.currentRunId), 'logs');
        this.ensureDir(logsDir);

        const fileName = `execution-${executionId}.log`;
        const filePath = path.join(logsDir, fileName);

        fs.writeFileSync(filePath, content);

        // Track in index
        this.addArtifactToIndex(this.currentRunId, 'logs', {
            type: 'log',
            path: path.relative(this.getRunDir(this.currentRunId), filePath),
            mimeType: 'text/plain',
            sizeBytes: Buffer.byteLength(content),
            timestamp: Date.now()
        });

        return path.relative(this.rootDir, filePath);
    }

    /**
     * Get run artifacts directory structure
     */
    async getRunArtifacts(): Promise<ArtifactStoreLayout> {
        const runDir = this.getRunDir(this.currentRunId);

        return {
            rootDir: this.rootDir,
            runDir,
            generatedTestsDir: path.join(runDir, 'generated-tests'),
            screenshotsDir: path.join(runDir, 'screenshots'),
            videosDir: path.join(runDir, 'videos'),
            logsDir: path.join(runDir, 'logs')
        };
    }

    /**
     * Save generated test file to appropriate framework directory
     */
    async saveGeneratedTest(
        framework: string,
        testFileName: string,
        testCode: string
    ): Promise<string> {
        const testDir = path.join(
            this.getRunDir(this.currentRunId),
            'generated-tests',
            framework
        );
        this.ensureDir(testDir);

        const filePath = path.join(testDir, testFileName);
        fs.writeFileSync(filePath, testCode);

        return path.relative(this.rootDir, filePath);
    }

    /**
     * List all saved artifacts for a run
     */
    async listRunArtifacts(runId: string): Promise<unknown[]> {
        const runDir = this.getRunDir(runId);
        const artifacts: unknown[] = [];

        const walk = (dir: string, relativePrefix: string = '') => {
            if (!fs.existsSync(dir)) return;

            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = path.join(relativePrefix, entry.name);

                    if (entry.isDirectory()) {
                        walk(fullPath, relativePath);
                    } else {
                        artifacts.push({
                            path: relativePath,
                            fullPath,
                            size: fs.statSync(fullPath).size,
                            type: this.getArtifactType(entry.name),
                            createdAt: fs.statSync(fullPath).birthtime
                        });
                    }
                }
            } catch (error) {
                console.warn(`Error walking directory ${dir}:`, error);
            }
        };

        walk(runDir);
        return artifacts;
    }

    /**
     * Export run artifacts as a single compressed file (optional)
     */
    async exportRun(runId: string, outputPath: string): Promise<void> {
        const runDir = this.getRunDir(runId);

        if (!fs.existsSync(runDir)) {
            throw new Error(`Run directory not found: ${runDir}`);
        }

        // Note: In production, this would use a zip library
        // For now, we just document the directory structure
        const manifest = {
            runId,
            exportedAt: new Date().toISOString(),
            location: runDir,
            artifacts: await this.listRunArtifacts(runId)
        };

        fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
        console.log(`Run exported to ${outputPath}`);
    }

    /**
     * Clean up old runs (retention policy)
     */
    async cleanupOldRuns(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<string[]> {
        const runsDir = path.join(this.rootDir, 'runs');
        const deletedRuns: string[] = [];

        if (!fs.existsSync(runsDir)) return deletedRuns;

        const entries = fs.readdirSync(runsDir, { withFileTypes: true });
        const now = Date.now();

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const runDir = path.join(runsDir, entry.name);
            const stat = fs.statSync(runDir);
            const age = now - stat.birthtimeMs;

            if (age > maxAgeMs) {
                fs.rmSync(runDir, { recursive: true, force: true });
                deletedRuns.push(entry.name);
            }
        }

        return deletedRuns;
    }

    // ========================================================================
    // Private Helpers
    // ========================================================================

    private getRunDir(runId: string): string {
        return path.join(this.rootDir, 'runs', runId);
    }

    private ensureDir(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    private updateIndex(runId: string, key: string, value: unknown): void {
        const indexPath = path.join(this.getRunDir(runId), 'index.json');
        if (fs.existsSync(indexPath)) {
            const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
            index.artifacts[key] = value;
            index.lastModified = new Date().toISOString();
            fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
        }
    }

    private addArtifactToIndex(runId: string, category: string, artifact: unknown): void {
        const indexPath = path.join(this.getRunDir(runId), 'index.json');
        if (fs.existsSync(indexPath)) {
            const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
            if (Array.isArray(index.artifacts[category])) {
                index.artifacts[category].push(artifact);
            }
            index.lastModified = new Date().toISOString();
            fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
        }
    }

    private getArtifactType(fileName: string): string {
        if (fileName.endsWith('.json')) return 'json';
        if (fileName.endsWith('.md')) return 'markdown';
        if (fileName.endsWith('.html')) return 'html';
        if (fileName.endsWith('.png')) return 'screenshot';
        if (fileName.endsWith('.webm')) return 'video';
        if (fileName.endsWith('.log')) return 'log';
        if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return 'test';
        return 'unknown';
    }
}

// Export singleton
let storeInstance: ArtifactStore | null = null;

export function getArtifactStore(reposenseRoot?: string): ArtifactStore {
    if (!storeInstance) {
        storeInstance = new ArtifactStore(reposenseRoot);
    }
    return storeInstance;
}
