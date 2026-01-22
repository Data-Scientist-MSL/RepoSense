import { Connection } from 'vscode-languageserver/node';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { AnalysisResult, GapItem, APICall, Endpoint } from '../models/types';
import { FrontendAnalyzer } from '../../services/analysis/FrontendAnalyzer';
import { BackendAnalyzer } from '../../services/analysis/BackendAnalyzer';
import { GapItem as OrchestrationGapItem, GapType, GapSeverity, AnalysisArtifact } from '../../models/RunOrchestrator';

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
                // Add stable call IDs
                const callsWithIds = calls.map(call => ({
                    ...call,
                    callId: this.hashAPICall(call)
                }));
                apiCalls.push(...callsWithIds);
            }

            // Extract endpoints from backend
            for (const file of backendFiles) {
                const eps = await this.backendAnalyzer.extractEndpoints(file);
                // Add stable endpoint IDs
                const epsWithIds = eps.map(ep => ({
                    ...ep,
                    endpointId: this.hashEndpoint(ep)
                }));
                endpoints.push(...epsWithIds);
            }

            // Detect gaps and add priority scoring
            const rawGaps = this.detectGaps(apiCalls, endpoints);
            const scoredGaps = this.scoreGaps(rawGaps, apiCalls, endpoints, workspaceRoot);

            gaps.push(...scoredGaps);

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

    // ========================================================================
    // Stable ID & Priority Scoring (RunOrchestrator integration)
    // ========================================================================

    private hashAPICall(call: APICall): string {
        const data = `${call.method}|${call.endpoint}|${call.file}|${call.line}|call`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    private hashEndpoint(ep: Endpoint): string {
        const data = `${ep.method}|${ep.path}|${ep.file}|${ep.line}|endpoint`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    private hashGap(gap: GapItem): string {
        const data = `${gap.type}|${gap.message}|${gap.file}|${gap.line}|${gap.severity}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    private scoreGaps(
        gaps: GapItem[],
        apiCalls: any[],
        endpoints: any[],
        workspaceRoot: string
    ): GapItem[] {
        // Count gap frequencies and affected files
        const gapFrequencies = new Map<string, number>();
        const gapFiles = new Map<string, Set<string>>();

        for (const gap of gaps) {
            const gapKey = `${gap.type}|${gap.message}`;
            gapFrequencies.set(gapKey, (gapFrequencies.get(gapKey) ?? 0) + 1);

            if (!gapFiles.has(gapKey)) {
                gapFiles.set(gapKey, new Set());
            }
            gapFiles.get(gapKey)!.add(gap.file);
        }

        // Enhance gaps with priority scoring
        return gaps.map(gap => {
            const gapKey = `${gap.type}|${gap.message}`;
            const frequency = gapFrequencies.get(gapKey) ?? 1;
            const blastRadius = gapFiles.get(gapKey)?.size ?? 1;

            // Priority score: 0-100
            // Factor 1: severity weight (40%)
            const severityWeights: Record<string, number> = {
                CRITICAL: 40,
                HIGH: 30,
                MEDIUM: 20,
                LOW: 10
            };
            const severityScore = severityWeights[gap.severity] || 0;

            // Factor 2: frequency weight (35%)
            const frequencyScore = Math.min(35, frequency * 5);

            // Factor 3: blast radius weight (25%)
            const blastScore = Math.min(25, blastRadius * 2);

            const priorityScore = Math.round(severityScore + frequencyScore + blastScore);

            return {
                ...gap,
                gapId: this.hashGap(gap),
                priorityScore: Math.min(100, priorityScore),
                frequency,
                blastRadius,
                lastDetected: Date.now(),
                status: 'OPEN',
                linkedTests: [],
                linkedPatches: [],
                linkedExecutions: []
            };
        });
    }
}
