import { Connection } from 'vscode-languageserver/node';
import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult, GapItem, APICall, Endpoint } from '../models/types';
import { FrontendAnalyzer } from '../../services/analysis/FrontendAnalyzer';
import { BackendAnalyzer } from '../../services/analysis/BackendAnalyzer';

export class AnalysisEngine {
    private connection: Connection;
    private frontendAnalyzer: FrontendAnalyzer;
    private backendAnalyzer: BackendAnalyzer;

    constructor(connection: Connection) {
        this.connection = connection;
        this.frontendAnalyzer = new FrontendAnalyzer();
        this.backendAnalyzer = new BackendAnalyzer();
    }

    async analyzeRepository(workspaceRoot: string): Promise<AnalysisResult> {
        this.connection.console.log(`Starting repository analysis: ${workspaceRoot}`);

        const gaps: GapItem[] = [];
        const apiCalls: APICall[] = [];
        const endpoints: Endpoint[] = [];

        try {
            // Scan for frontend files
            const frontendFiles = await this.findFiles(workspaceRoot, ['.tsx', '.ts', '.jsx', '.js']);
            this.connection.console.log(`Found ${frontendFiles.length} frontend files`);

            // Scan for backend files
            const backendFiles = await this.findFiles(workspaceRoot, ['.ts', '.js', '.py']);
            this.connection.console.log(`Found ${backendFiles.length} backend files`);

            // Extract API calls from frontend
            for (const file of frontendFiles) {
                const calls = await this.frontendAnalyzer.extractAPICalls(file);
                apiCalls.push(...calls);
            }

            // Extract endpoints from backend
            for (const file of backendFiles) {
                const eps = await this.backendAnalyzer.extractEndpoints(file);
                endpoints.push(...eps);
            }

            // Detect gaps
            gaps.push(...this.detectGaps(apiCalls, endpoints));

            this.connection.console.log(`Analysis complete: ${gaps.length} gaps, ${apiCalls.length} API calls, ${endpoints.length} endpoints`);

        } catch (error) {
            this.connection.console.error(`Analysis error: ${error}`);
        }

        const summary = this.calculateSummary(gaps);

        return {
            gaps,
            apiCalls,
            endpoints,
            timestamp: Date.now(),
            summary
        };
    }

    async analyzeFile(filePath: string): Promise<{ gaps: GapItem[] }> {
        this.connection.console.log(`Analyzing file: ${filePath}`);
        
        const gaps: GapItem[] = [];
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const ext = path.extname(filePath);

            // Simple pattern matching for demonstration
            if (['.tsx', '.ts', '.jsx', '.js'].includes(ext)) {
                // Look for fetch calls without error handling
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    if (line.includes('fetch(') && !lines.slice(Math.max(0, index - 3), index + 3).some(l => l.includes('catch'))) {
                        gaps.push({
                            type: 'suggestion',
                            severity: 'MEDIUM',
                            message: 'fetch() call without error handling',
                            file: filePath,
                            line: index + 1,
                            suggestedFix: 'Add .catch() or wrap in try-catch'
                        });
                    }
                });
            }
        } catch (error) {
            this.connection.console.error(`File analysis error: ${error}`);
        }

        return { gaps };
    }

    private async findFiles(dir: string, extensions: string[]): Promise<string[]> {
        const files: string[] = [];

        const walk = (currentDir: string) => {
            try {
                const entries = fs.readdirSync(currentDir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(currentDir, entry.name);
                    
                    // Skip node_modules, dist, build, .git
                    if (entry.isDirectory()) {
                        if (!['node_modules', 'dist', 'build', 'out', '.git', '.vscode'].includes(entry.name)) {
                            walk(fullPath);
                        }
                    } else {
                        const ext = path.extname(entry.name);
                        if (extensions.includes(ext)) {
                            files.push(fullPath);
                        }
                    }
                }
            } catch (error) {
                this.connection.console.error(`Error walking directory ${currentDir}: ${error}`);
            }
        };

        walk(dir);
        return files;
    }

    private detectGaps(apiCalls: APICall[], endpoints: Endpoint[]): GapItem[] {
        const gaps: GapItem[] = [];

        // Normalize endpoints for matching
        const normalizedEndpoints = endpoints.map(ep => ({
            ...ep,
            normalized: this.normalizeEndpoint(ep.path)
        }));

        // Check for orphaned API calls
        for (const call of apiCalls) {
            const normalizedCall = this.normalizeEndpoint(call.endpoint);
            const matchingEndpoint = normalizedEndpoints.find(ep => 
                ep.normalized === normalizedCall && 
                ep.method === call.method
            );

            if (!matchingEndpoint) {
                gaps.push({
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: `${call.method} ${call.endpoint} called but no endpoint exists`,
                    file: call.file,
                    line: call.line,
                    suggestedFix: 'Create backend endpoint'
                });
            }
        }

        // Check for unused endpoints
        for (const endpoint of endpoints) {
            const normalizedEndpoint = this.normalizeEndpoint(endpoint.path);
            const isCalled = apiCalls.some(call => 
                this.normalizeEndpoint(call.endpoint) === normalizedEndpoint &&
                call.method === endpoint.method
            );

            if (!isCalled) {
                gaps.push({
                    type: 'unused_endpoint',
                    severity: 'MEDIUM',
                    message: `${endpoint.method} ${endpoint.path} is never called`,
                    file: endpoint.file,
                    line: endpoint.line
                });
            }
        }

        return gaps;
    }

    private normalizeEndpoint(path: string): string {
        // Remove query parameters
        path = path.split('?')[0];
        
        // Normalize path parameters: /users/123 -> /users/:id, /users/${id} -> /users/:id
        path = path.replace(/\/\d+/g, '/:id');
        path = path.replace(/\/\$\{[^}]+\}/g, '/:id');
        path = path.replace(/\/:[a-zA-Z0-9_]+/g, '/:id');
        
        return path;
    }

    private calculateSummary(gaps: GapItem[]): { critical: number; high: number; medium: number; low: number } {
        return {
            critical: gaps.filter(g => g.severity === 'CRITICAL').length,
            high: gaps.filter(g => g.severity === 'HIGH').length,
            medium: gaps.filter(g => g.severity === 'MEDIUM').length,
            low: gaps.filter(g => g.severity === 'LOW').length
        };
    }
}
