import { OllamaService } from './OllamaService';
import { GapItem } from '../../models/types';
import {
    ArchitectureDiagram,
    DiagramLevel,
    DiagramType,
    DiagramNode,
    DiagramEdge,
    DiagramLegend,
    DiagramGenerationOptions,
    DiagramComparisonResult,
    UIUXDefect,
    DefectAnnotation,
    DiagramDifference
} from '../../models/diagram-types';

export class ArchitectureDiagramGenerator {
    private ollamaService: OllamaService;

    constructor(ollamaService: OllamaService) {
        this.ollamaService = ollamaService;
    }

    /**
     * Generate as-is architecture diagram showing current state with defects
     */
    public async generateAsIsDiagram(
        gaps: GapItem[],
        level: DiagramLevel,
        options?: Partial<DiagramGenerationOptions>
    ): Promise<ArchitectureDiagram> {
        const defaultOptions: DiagramGenerationOptions = {
            level,
            includeDefects: true,
            highlightProblematicAreas: true,
            showDataFlow: true,
            showUIPatterns: level === 'L3'
        };

        const finalOptions = { ...defaultOptions, ...options };

        // Extract architecture from gaps and code analysis
        const nodes = await this.extractNodes(gaps, level);
        const edges = await this.extractEdges(gaps, level);
        
        // Mark problematic nodes and edges
        this.markProblematicElements(nodes, edges, gaps);

        // Generate annotations
        const annotations = this.generateAnnotations(gaps, level);

        return {
            level,
            type: 'as-is',
            title: `As-Is Architecture (${level}) - Current State`,
            description: `Current architecture showing ${gaps.length} identified defects and issues`,
            nodes,
            edges,
            legend: this.generateLegend('as-is'),
            annotations,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Generate to-be architecture diagram showing proposed improvements
     */
    public async generateToBeDiagram(
        gaps: GapItem[],
        level: DiagramLevel,
        options?: Partial<DiagramGenerationOptions>
    ): Promise<ArchitectureDiagram> {
        const defaultOptions: DiagramGenerationOptions = {
            level,
            includeDefects: false,
            highlightProblematicAreas: false,
            showDataFlow: true,
            showUIPatterns: level === 'L3'
        };

        const finalOptions = { ...defaultOptions, ...options };

        // Extract base architecture
        const nodes = await this.extractNodes(gaps, level);
        const edges = await this.extractEdges(gaps, level);
        
        // Apply remediation to create improved architecture
        await this.applyRemediations(nodes, edges, gaps);

        // Generate improvement annotations
        const annotations = this.generateImprovementAnnotations(gaps, level);

        return {
            level,
            type: 'to-be',
            title: `To-Be Architecture (${level}) - Proposed State`,
            description: `Improved architecture with ${gaps.length} defects resolved`,
            nodes,
            edges,
            legend: this.generateLegend('to-be'),
            annotations,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Generate side-by-side comparison of as-is and to-be diagrams
     */
    public async generateComparison(
        gaps: GapItem[],
        level: DiagramLevel
    ): Promise<DiagramComparisonResult> {
        const asIsDiagram = await this.generateAsIsDiagram(gaps, level);
        const toBeDiagram = await this.generateToBeDiagram(gaps, level);
        
        const differences = this.calculateDifferences(asIsDiagram, toBeDiagram);
        const summary = await this.generateComparisonSummary(differences, gaps);

        return {
            asIsDiagram,
            toBeDiagram,
            differences,
            summary
        };
    }

    /**
     * Convert diagram to Mermaid syntax
     */
    public toMermaid(diagram: ArchitectureDiagram): string {
        let mermaid = `graph TB\n`;
        mermaid += `    %% ${diagram.title}\n`;
        mermaid += `    %% ${diagram.description}\n\n`;

        // Define nodes
        for (const node of diagram.nodes) {
            const shape = this.getNodeShape(node.type);
            const style = node.isProblematic ? ':::problematic' : '';
            const defectMarker = node.defects && node.defects.length > 0 ? ' ⚠️' : '';
            mermaid += `    ${node.id}${shape[0]}${node.label}${defectMarker}${shape[1]}${style}\n`;
        }

        mermaid += '\n';

        // Define edges
        for (const edge of diagram.edges) {
            const arrow = edge.isProblematic ? '-.->' : '-->';
            const label = edge.label ? `|${edge.label}|` : '';
            mermaid += `    ${edge.from} ${arrow}${label} ${edge.to}\n`;
        }

        // Add styles
        mermaid += '\n    classDef problematic fill:#ffcccc,stroke:#ff0000,stroke-width:2px\n';
        mermaid += '    classDef improved fill:#ccffcc,stroke:#00aa00,stroke-width:2px\n';
        mermaid += '    classDef new fill:#cce5ff,stroke:#0066cc,stroke-width:2px\n';

        // Add legend as comments
        mermaid += '\n    %% Legend:\n';
        for (const symbol of diagram.legend.symbols) {
            mermaid += `    %% ${symbol.icon}: ${symbol.description}\n`;
        }
        for (const color of diagram.legend.colors) {
            mermaid += `    %% ${color.color}: ${color.meaning}\n`;
        }

        return mermaid;
    }

    /**
     * Identify UI/UX specific defects from gaps
     */
    public identifyUIUXDefects(gaps: GapItem[]): UIUXDefect[] {
        const uiuxDefects: UIUXDefect[] = [];

        // Group gaps by file to identify patterns
        const fileGroups = this.groupGapsByFile(gaps);

        for (const [file, fileGaps] of Object.entries(fileGroups)) {
            // Check for component structure issues
            const orphanedCalls = fileGaps.filter(g => g.type === 'orphaned_component');
            if (orphanedCalls.length > 0) {
                uiuxDefects.push({
                    category: 'component_structure',
                    severity: orphanedCalls[0].severity,
                    description: `Component has ${orphanedCalls.length} orphaned API calls indicating structural issues`,
                    affectedComponents: [file],
                    recommendation: 'Implement missing backend endpoints or refactor component structure'
                });
            }

            // Check for data flow issues
            const typeMismatches = fileGaps.filter(g => g.type === 'type_mismatch');
            if (typeMismatches.length > 0) {
                uiuxDefects.push({
                    category: 'data_flow',
                    severity: typeMismatches[0].severity,
                    description: 'Type mismatches detected in data flow between frontend and backend',
                    affectedComponents: [file],
                    recommendation: 'Align type definitions between frontend and backend'
                });
            }
        }

        return uiuxDefects;
    }

    // Private helper methods

    private async extractNodes(gaps: GapItem[], level: DiagramLevel): Promise<DiagramNode[]> {
        const nodes: DiagramNode[] = [];
        const nodeMap = new Map<string, DiagramNode>();

        // Extract unique components and endpoints from gaps
        for (const gap of gaps) {
            const componentId = this.getComponentId(gap.file);
            
            if (!nodeMap.has(componentId)) {
                const node: DiagramNode = {
                    id: componentId,
                    label: this.getComponentLabel(gap.file, level),
                    type: this.determineNodeType(gap.file),
                    defects: []
                };
                nodeMap.set(componentId, node);
            }

            // Add defect annotations
            const node = nodeMap.get(componentId)!;
            if (!node.defects) {
                node.defects = [];
            }
            node.defects.push(this.gapToDefectAnnotation(gap));
        }

        return Array.from(nodeMap.values());
    }

    private async extractEdges(gaps: GapItem[], level: DiagramLevel): Promise<DiagramEdge[]> {
        const edges: DiagramEdge[] = [];
        const edgeMap = new Map<string, DiagramEdge>();

        for (const gap of gaps) {
            if (gap.type === 'orphaned_component') {
                // Extract API endpoint from gap message
                const endpoint = this.extractEndpoint(gap.message);
                if (endpoint) {
                    const fromId = this.getComponentId(gap.file);
                    const toId = this.getEndpointId(endpoint);
                    const edgeKey = `${fromId}->${toId}`;

                    if (!edgeMap.has(edgeKey)) {
                        edges.push({
                            from: fromId,
                            to: toId,
                            label: endpoint,
                            type: 'api-call',
                            isProblematic: true
                        });
                        edgeMap.set(edgeKey, edges[edges.length - 1]);
                    }
                }
            }
        }

        return edges;
    }

    private markProblematicElements(nodes: DiagramNode[], edges: DiagramEdge[], gaps: GapItem[]): void {
        // Mark nodes with defects as problematic
        for (const node of nodes) {
            if (node.defects && node.defects.length > 0) {
                node.isProblematic = true;
            }
        }

        // Edges are already marked during extraction
    }

    private async applyRemediations(nodes: DiagramNode[], edges: DiagramEdge[], gaps: GapItem[]): Promise<void> {
        // Remove defect annotations from nodes
        for (const node of nodes) {
            node.defects = [];
            node.isProblematic = false;
        }

        // Add new nodes for missing endpoints
        const orphanedGaps = gaps.filter(g => g.type === 'orphaned_component');
        for (const gap of orphanedGaps) {
            const endpoint = this.extractEndpoint(gap.message);
            if (endpoint) {
                const endpointId = this.getEndpointId(endpoint);
                
                // Check if endpoint node already exists
                const exists = nodes.some(n => n.id === endpointId);
                if (!exists) {
                    nodes.push({
                        id: endpointId,
                        label: `${endpoint}\n(NEW)`,
                        type: 'endpoint'
                    });
                }
            }
        }

        // Fix problematic edges
        for (const edge of edges) {
            edge.isProblematic = false;
        }
    }

    private generateAnnotations(gaps: GapItem[], level: DiagramLevel): string[] {
        const annotations: string[] = [];
        const criticalCount = gaps.filter(g => g.severity === 'CRITICAL').length;
        const highCount = gaps.filter(g => g.severity === 'HIGH').length;

        annotations.push(`${gaps.length} total defects identified`);
        if (criticalCount > 0) {
            annotations.push(`${criticalCount} CRITICAL issues requiring immediate attention`);
        }
        if (highCount > 0) {
            annotations.push(`${highCount} HIGH priority issues`);
        }

        // Add level-specific annotations
        if (level === 'L1') {
            annotations.push('High-level system overview showing major component issues');
        } else if (level === 'L2') {
            annotations.push('Component-level view showing interaction problems');
        } else if (level === 'L3') {
            annotations.push('Technical implementation showing detailed UI/UX patterns and defects');
        }

        return annotations;
    }

    private generateImprovementAnnotations(gaps: GapItem[], level: DiagramLevel): string[] {
        const annotations: string[] = [];
        
        annotations.push(`${gaps.length} defects resolved in this architecture`);
        
        const orphanedCount = gaps.filter(g => g.type === 'orphaned_component').length;
        if (orphanedCount > 0) {
            annotations.push(`${orphanedCount} missing endpoints implemented`);
        }

        const unusedCount = gaps.filter(g => g.type === 'unused_endpoint').length;
        if (unusedCount > 0) {
            annotations.push(`${unusedCount} unused endpoints removed or connected`);
        }

        // Add level-specific improvements
        if (level === 'L3') {
            annotations.push('Improved UI/UX patterns with proper state management and data flow');
        }

        return annotations;
    }

    private generateLegend(type: DiagramType): DiagramLegend {
        const legend: DiagramLegend = {
            symbols: [
                { icon: '[]', description: 'UI Component' },
                { icon: '()', description: 'Backend Service/Endpoint' },
                { icon: '[(', description: 'Database' },
                { icon: '{{}}', description: 'External Service' }
            ],
            colors: []
        };

        if (type === 'as-is') {
            legend.colors = [
                { color: 'Red border', meaning: 'Problematic component with defects' },
                { color: 'Dashed line', meaning: 'Broken or missing connection' },
                { color: '⚠️ icon', meaning: 'Has defects/warnings' }
            ];
        } else {
            legend.colors = [
                { color: 'Green border', meaning: 'Improved/fixed component' },
                { color: 'Blue border', meaning: 'New component/endpoint' },
                { color: 'Solid line', meaning: 'Working connection' }
            ];
        }

        return legend;
    }

    private calculateDifferences(asIs: ArchitectureDiagram, toBe: ArchitectureDiagram): DiagramDifference[] {
        const differences: DiagramDifference[] = [];

        // Compare nodes
        const asIsNodeIds = new Set(asIs.nodes.map(n => n.id));
        const toBeNodeIds = new Set(toBe.nodes.map(n => n.id));

        // Find added nodes
        for (const node of toBe.nodes) {
            if (!asIsNodeIds.has(node.id)) {
                differences.push({
                    type: 'added',
                    element: 'node',
                    description: `Added: ${node.label}`,
                    impact: 'high'
                });
            }
        }

        // Find removed nodes
        for (const node of asIs.nodes) {
            if (!toBeNodeIds.has(node.id)) {
                differences.push({
                    type: 'removed',
                    element: 'node',
                    description: `Removed: ${node.label}`,
                    impact: 'medium'
                });
            }
        }

        // Find modified nodes (those that were problematic but are now fixed)
        for (const asIsNode of asIs.nodes) {
            const toBeNode = toBe.nodes.find(n => n.id === asIsNode.id);
            if (toBeNode && asIsNode.isProblematic && !toBeNode.isProblematic) {
                differences.push({
                    type: 'modified',
                    element: 'node',
                    description: `Fixed: ${asIsNode.label}`,
                    impact: 'high'
                });
            }
        }

        return differences;
    }

    private async generateComparisonSummary(differences: DiagramDifference[], gaps: GapItem[]): Promise<string> {
        const added = differences.filter(d => d.type === 'added').length;
        const removed = differences.filter(d => d.type === 'removed').length;
        const modified = differences.filter(d => d.type === 'modified').length;

        let summary = `Architecture Comparison Summary:\n\n`;
        summary += `Total Changes: ${differences.length}\n`;
        summary += `- Added: ${added} new components/endpoints\n`;
        summary += `- Removed: ${removed} unused/problematic elements\n`;
        summary += `- Fixed: ${modified} existing components\n\n`;
        summary += `This remediation addresses ${gaps.length} identified defects.`;

        return summary;
    }

    private getNodeShape(type: string): [string, string] {
        switch (type) {
            case 'ui':
            case 'component':
                return ['[', ']'];
            case 'endpoint':
            case 'service':
                return ['(', ')'];
            case 'database':
                return ['[(', ')]'];
            case 'external':
                return ['{{', '}}'];
            default:
                return ['[', ']'];
        }
    }

    private getComponentId(filePath: string): string {
        // Extract component name from file path
        const fileName = filePath.split('/').pop() || filePath;
        return fileName.replace(/\.(tsx?|jsx?|py)$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    }

    private getComponentLabel(filePath: string, level: DiagramLevel): string {
        const fileName = filePath.split('/').pop() || filePath;
        const name = fileName.replace(/\.(tsx?|jsx?|py)$/, '');
        
        if (level === 'L1') {
            // Simplify for high-level view
            return name.split('.')[0];
        }
        return name;
    }

    private determineNodeType(filePath: string): DiagramNode['type'] {
        if (filePath.match(/\.(tsx|jsx)$/)) {
            return 'ui';
        } else if (filePath.match(/\.(ts|js)$/) && !filePath.includes('component')) {
            return 'service';
        } else if (filePath.includes('controller') || filePath.includes('route')) {
            return 'endpoint';
        }
        return 'component';
    }

    private getEndpointId(endpoint: string): string {
        return 'API_' + endpoint.replace(/[^a-zA-Z0-9]/g, '_');
    }

    private extractEndpoint(message: string): string | null {
        // Extract endpoint from gap message like "Missing /api/users endpoint"
        const match = message.match(/\/api\/[^\s]+/);
        return match ? match[0] : null;
    }

    private gapToDefectAnnotation(gap: GapItem): DefectAnnotation {
        return {
            type: gap.type,
            severity: gap.severity,
            message: gap.message,
            location: `${gap.file}:${gap.line}`
        };
    }

    private groupGapsByFile(gaps: GapItem[]): Record<string, GapItem[]> {
        const grouped: Record<string, GapItem[]> = {};
        for (const gap of gaps) {
            if (!grouped[gap.file]) {
                grouped[gap.file] = [];
            }
            grouped[gap.file].push(gap);
        }
        return grouped;
    }
}
