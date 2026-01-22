export type DiagramLevel = 'L1' | 'L2' | 'L3';
export type DiagramType = 'as-is' | 'to-be';
export type DiagramFormat = 'mermaid' | 'png' | 'svg';

export interface DiagramNode {
    id: string;
    label: string;
    type: 'component' | 'endpoint' | 'database' | 'external' | 'ui' | 'service';
    defects?: DefectAnnotation[];
    isProblematic?: boolean;
}

export interface DiagramEdge {
    from: string;
    to: string;
    label?: string;
    type?: 'api-call' | 'data-flow' | 'dependency' | 'user-interaction';
    isProblematic?: boolean;
}

export interface DefectAnnotation {
    type: 'orphaned_component' | 'unused_endpoint' | 'type_mismatch' | 'missing_crud' | 'suggestion' |
          'performance' | 'accessibility' | 'state_management' | 'rendering';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    location?: string;
}

export interface ArchitectureDiagram {
    level: DiagramLevel;
    type: DiagramType;
    title: string;
    description: string;
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    legend: DiagramLegend;
    annotations: string[];
    generatedAt: string;
}

export interface DiagramLegend {
    symbols: {
        icon: string;
        description: string;
    }[];
    colors: {
        color: string;
        meaning: string;
    }[];
}

export interface DiagramGenerationOptions {
    level: DiagramLevel;
    includeDefects: boolean;
    highlightProblematicAreas: boolean;
    showDataFlow: boolean;
    showUIPatterns: boolean;
}

export interface DiagramComparisonResult {
    asIsDiagram: ArchitectureDiagram;
    toBeDiagram: ArchitectureDiagram;
    differences: DiagramDifference[];
    summary: string;
}

export interface DiagramDifference {
    type: 'added' | 'removed' | 'modified';
    element: 'node' | 'edge';
    description: string;
    impact: 'high' | 'medium' | 'low';
}

export interface UIUXDefect {
    category: 'component_structure' | 'state_management' | 'data_flow' | 
              'accessibility' | 'performance' | 'user_interaction' | 'rendering';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    affectedComponents: string[];
    recommendation: string;
}
