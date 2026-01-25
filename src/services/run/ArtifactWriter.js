"use strict";
/**
 * ArtifactWriter.ts (Sprint 10 - Days 5-6)
 *
 * Orchestrates all artifact persistence in order:
 * scan.json → graph.json → report.json → diagrams
 *
 * Called by RunOrchestrator when analysis completes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactWriter = void 0;
const RunStorage_1 = require("./RunStorage");
const GraphBuilder_1 = require("./GraphBuilder");
const ReportBuilder_1 = require("./ReportBuilder");
const DiagramBuilder_1 = require("./DiagramBuilder");
class ArtifactWriter {
    constructor(workspaceFolder) {
        this.runStorage = new RunStorage_1.RunStorage(workspaceFolder);
        this.graphBuilder = new GraphBuilder_1.GraphBuilder();
        this.reportBuilder = new ReportBuilder_1.ReportBuilder();
        this.diagramBuilder = new DiagramBuilder_1.DiagramBuilder();
    }
    /**
     * Main entry point: write all artifacts for a run.
     *
     * Order:
     * 1. Ensure directories exist
     * 2. Write scan.json (raw analyzer output)
     * 3. Build and write graph.json (canonical with stable IDs)
     * 4. Build and write report.json (statistics)
     * 5. Build and write diagrams (mermaid files + index)
     * 6. Update latest.json pointer
     *
     * @throws Error if any step fails
     */
    async writeAllArtifacts(runId, analysisResult) {
        try {
            // Step 1: Ensure directories
            await this.runStorage.ensureDirectories();
            await this.runStorage.createRunFolder(runId);
            // Step 2: Write raw analysis output
            console.log(`[${runId}] Writing scan.json...`);
            await this.runStorage.writeJson('scan.json', analysisResult, runId);
            // Step 3: Build and write graph
            console.log(`[${runId}] Building graph with stable IDs...`);
            const graph = this.graphBuilder.buildGraph(analysisResult);
            await this.runStorage.writeJson('graph.json', graph, runId);
            // Step 4: Build and write report
            console.log(`[${runId}] Generating report...`);
            const report = this.reportBuilder.buildReport(graph);
            await this.runStorage.writeJson('report/report.json', report, runId);
            // Step 5: Build and write diagrams
            console.log(`[${runId}] Generating diagrams...`);
            const { diagrams, files } = this.diagramBuilder.buildDiagrams(graph);
            // Write diagrams index
            await this.runStorage.writeJson('diagrams/diagrams.json', diagrams, runId);
            // Write each mermaid diagram
            for (const [fileName, content] of files) {
                const fullFileName = `diagrams/${fileName}`;
                // Write .mmd file as text
                const runPath = this.runStorage.getRunPath(runId);
                const filePath = `${runPath}/${fullFileName}`;
                const fs = require('fs');
                fs.writeFileSync(filePath, content, 'utf-8');
            }
            // Step 6: Update latest pointer
            console.log(`[${runId}] Updating latest.json pointer...`);
            await this.runStorage.updateLatestPointer(runId);
            console.log(`[${runId}] ✅ All artifacts written successfully`);
        }
        catch (error) {
            console.error(`[${runId}] ❌ Failed to write artifacts: ${error}`);
            throw error;
        }
    }
    /**
     * Verify all artifacts exist and are valid.
     */
    async verifyArtifacts(runId) {
        try {
            const scan = await this.runStorage.readJson('scan.json', runId);
            const graph = await this.runStorage.readJson('graph.json', runId);
            const report = await this.runStorage.readJson('report/report.json', runId);
            const diagrams = await this.runStorage.readJson('diagrams/diagrams.json', runId);
            const all = !!(scan && graph && report && diagrams);
            return {
                scan: !!scan,
                graph: !!graph,
                report: !!report,
                diagrams: !!diagrams,
                all,
            };
        }
        catch (error) {
            console.error(`[${runId}] Artifact verification failed: ${error}`);
            return {
                scan: false,
                graph: false,
                report: false,
                diagrams: false,
                all: false,
            };
        }
    }
    /**
     * Get paths to all artifacts for a run.
     */
    getArtifactPaths(runId) {
        const runPath = this.runStorage.getRunPath(runId);
        return {
            runPath,
            scanPath: `${runPath}/scan.json`,
            graphPath: `${runPath}/graph.json`,
            reportPath: `${runPath}/report/report.json`,
            diagramsDir: `${runPath}/diagrams`,
        };
    }
}
exports.ArtifactWriter = ArtifactWriter;
