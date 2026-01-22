export interface GapItem {
    type: 'orphaned_component' | 'unused_endpoint' | 'type_mismatch' | 'missing_crud' | 'suggestion';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    file: string;
    line: number;
    suggestedFix?: string;
    relatedFiles?: string[];
}

export interface APICall {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    file: string;
    line: number;
    component?: string;
}

export interface Endpoint {
    path: string;
    method: string;
    file: string;
    line: number;
    handler: string;
    controller?: string;  // Added for RunGraphBuilder compatibility
}

export interface AnalysisResult {
    gaps: GapItem[];
    apiCalls: APICall[];
    endpoints: Endpoint[];
    timestamp: number;
    summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    calls?: number;  // Added for RunGraphBuilder compatibility
    linesAnalyzed?: number;  // Added for RunGraphBuilder compatibility
    durationMs?: number;  // Added for RunGraphBuilder compatibility
}
