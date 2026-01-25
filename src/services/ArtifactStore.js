"use strict";
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
exports.ArtifactStore = void 0;
exports.getArtifactStore = getArtifactStore;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ArtifactStore {
    constructor(signer, reposenseRoot = '.reposense') {
        this.currentRunId = '';
        this.signer = signer;
        this.rootDir = reposenseRoot;
    }
    /**
     * Initialize artifact storage for a new run
     */
    async initialize(runId) {
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
    async saveAnalysis(artifact) {
        const runDir = this.getRunDir(this.currentRunId);
        const filePath = path.join(runDir, 'scan.json');
        this.ensureDir(path.dirname(filePath));
        const content = JSON.stringify(artifact, null, 2);
        fs.writeFileSync(filePath, content);
        // Sign and save signature
        const signature = this.signer.sign(content);
        fs.writeFileSync(`${filePath}.sig`, signature);
    }
    /**
     * Save test and remediation plans
     */
    async savePlans(plans) {
        const filePath = path.join(this.getRunDir(this.currentRunId), 'plan.json');
        this.ensureDir(path.dirname(filePath));
        const content = JSON.stringify(plans, null, 2);
        fs.writeFileSync(filePath, content);
        // Sign
        const signature = this.signer.sign(content);
        fs.writeFileSync(`${filePath}.sig`, signature);
    }
    /**
     * Save patch applications
     */
    async savePatchApplications(applications) {
        const filePath = path.join(this.getRunDir(this.currentRunId), 'applied-patches.json');
        this.ensureDir(path.dirname(filePath));
        const content = JSON.stringify(applications, null, 2);
        fs.writeFileSync(filePath, content);
        // Sign
        const signature = this.signer.sign(content);
        fs.writeFileSync(`${filePath}.sig`, signature);
    }
    /**
     * Save execution results
     */
    async saveExecutionResults(results) {
        const filePath = path.join(this.getRunDir(this.currentRunId), 'execution-results.json');
        this.ensureDir(path.dirname(filePath));
        const content = JSON.stringify(results, null, 2);
        fs.writeFileSync(filePath, content);
        // Sign
        const signature = this.signer.sign(content);
        fs.writeFileSync(`${filePath}.sig`, signature);
    }
    /**
     * Save report (all formats)
     */
    async saveReport(report) {
        const runDir = this.getRunDir(this.currentRunId);
        this.ensureDir(runDir);
        // JSON format
        const jsonContent = JSON.stringify(report, null, 2);
        const jsonPath = path.join(runDir, 'report.json');
        fs.writeFileSync(jsonPath, jsonContent);
        // Sign JSON report
        const signature = this.signer.sign(jsonContent);
        fs.writeFileSync(`${jsonPath}.sig`, signature);
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
    async saveScreenshot(executionId, buffer) {
        const screenshotsDir = path.join(this.getRunDir(this.currentRunId), 'screenshots');
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
    async saveVideo(executionId, filePath) {
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
    async saveLog(executionId, content) {
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
    async getRunArtifacts() {
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
    async saveGeneratedTest(framework, testFileName, testCode) {
        const testDir = path.join(this.getRunDir(this.currentRunId), 'generated-tests', framework);
        this.ensureDir(testDir);
        const filePath = path.join(testDir, testFileName);
        fs.writeFileSync(filePath, testCode);
        return path.relative(this.rootDir, filePath);
    }
    /**
     * List all saved artifacts for a run
     */
    async listRunArtifacts(runId) {
        const runDir = this.getRunDir(runId);
        const artifacts = [];
        const walk = (dir, relativePrefix = '') => {
            if (!fs.existsSync(dir))
                return;
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = path.join(relativePrefix, entry.name);
                    if (entry.isDirectory()) {
                        walk(fullPath, relativePath);
                    }
                    else {
                        artifacts.push({
                            path: relativePath,
                            fullPath,
                            size: fs.statSync(fullPath).size,
                            type: this.getArtifactType(entry.name),
                            createdAt: fs.statSync(fullPath).birthtime
                        });
                    }
                }
            }
            catch (error) {
                console.warn(`Error walking directory ${dir}:`, error);
            }
        };
        walk(runDir);
        return artifacts;
    }
    /**
     * Export run artifacts as a single compressed file (optional)
     */
    async exportRun(runId, outputPath) {
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
    async cleanupOldRuns(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
        const runsDir = path.join(this.rootDir, 'runs');
        const deletedRuns = [];
        if (!fs.existsSync(runsDir))
            return deletedRuns;
        const entries = fs.readdirSync(runsDir, { withFileTypes: true });
        const now = Date.now();
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
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
    getRunDir(runId) {
        return path.join(this.rootDir, 'runs', runId);
    }
    ensureDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    updateIndex(runId, key, value) {
        const indexPath = path.join(this.getRunDir(runId), 'index.json');
        if (fs.existsSync(indexPath)) {
            const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
            index.artifacts[key] = value;
            index.lastModified = new Date().toISOString();
            fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
        }
    }
    addArtifactToIndex(runId, category, artifact) {
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
    getArtifactType(fileName) {
        if (fileName.endsWith('.json'))
            return 'json';
        if (fileName.endsWith('.md'))
            return 'markdown';
        if (fileName.endsWith('.html'))
            return 'html';
        if (fileName.endsWith('.png'))
            return 'screenshot';
        if (fileName.endsWith('.webm'))
            return 'video';
        if (fileName.endsWith('.log'))
            return 'log';
        if (fileName.endsWith('.ts') || fileName.endsWith('.tsx'))
            return 'test';
        return 'unknown';
    }
}
exports.ArtifactStore = ArtifactStore;
// Export singleton
let storeInstance = null;
function getArtifactStore(signer, reposenseRoot) {
    if (!storeInstance) {
        storeInstance = new ArtifactStore(signer, reposenseRoot);
    }
    return storeInstance;
}
