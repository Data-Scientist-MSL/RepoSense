/**
 * Report and Diagram Models
 * ==========================
 * 
 * Type contracts for Reports + Diagrams Bridge.
 * Single source of truth data model: graph.json
 * 
 * Version: 1.0
 * Status: Production-ready
 */

// ============================================================================
// RUN GRAPH MODELS
// ============================================================================

/**
 * RunGraph Interface
 * 
 * Canonical representation of a complete analysis run.
 * Immutable after creation, serves as source for reports, diagrams, and ChatBot.
 */
export interface RunGraph {
  runId: string;
  timestamp: string;
  repositoryRoot: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

/**
 * GraphNode Types: 6 types representing entities in the system
 */
export type GraphNodeType =
  | 'BACKEND_ENDPOINT'
  | 'FRONTEND_CALL'
  | 'TEST'
  | 'EVIDENCE'
  | 'REMEDIATION'
  | 'MODULE';

/**
 * GraphNode
 * 
 * Base structure for all entities in the graph
 */
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  description?: string;
  file?: string;
  line?: number;
  
  // Type-specific fields
  normalized?: {
    moduleName?: string;
    pathNormalized?: string;
  };
  
  // Type-specific properties
  endpoint?: {
    controller: string;
    method: string;
    path: string;
    isUsed: boolean;
  };
  
  frontend?: {
    moduleName: string;
    methodName: string;
    callTarget: string;
  };
  
  test?: {
    framework: string;
    testName: string;
    tags?: string[];
  };
  
  evidence?: {
    artifactType: 'SCREENSHOT' | 'VIDEO' | 'LOG' | 'JUNIT';
    artifactPath: string;
    associatedTestId?: string;
  };
  
  remediation?: {
    gapId: string;
    type: 'CODE_PATCH' | 'TEST_GENERATION';
    diffPath?: string;
    estimatedEffort: 'S' | 'M' | 'L';
  };
  
  module?: {
    moduleName: string;
    containedNodeIds?: string[];
  };
  
  // Quality indicators
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  tags?: string[];
}

/**
 * GraphEdge Types: 7 types representing relationships
 */
export type GraphEdgeType =
  | 'CALLS'
  | 'ENDPOINT_TESTED_BY'
  | 'TEST_PRODUCES'
  | 'GAP_FIXES'
  | 'DEPENDS_ON'
  | 'CONTAINS'
  | 'SAME_AS';

/**
 * GraphEdge
 * 
 * Represents relationships between nodes
 */
export interface GraphEdge {
  id: string;
  type: GraphEdgeType;
  sourceNodeId: string;
  targetNodeId: string;
  weight?: number;
  
  // Type-specific fields
  count?: number;
  callDetails?: {
    callCount: number;
    frequency: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  testCoverageDetails?: {
    passed: boolean;
    confidence: number;
  };
}

/**
 * GraphMetadata
 * 
 * Statistics and quality indicators for the graph
 */
export interface GraphMetadata {
  nodeCount: number;
  edgeCount: number;
  statistics: {
    totalEndpoints: number;
    usedEndpoints: number;
    unusedEndpoints: number;
    untestedEndpoints: number;
    totalTests: number;
    totalGaps: number;
    endpointCoveragePercent: number;
    linesOfCodeAnalyzed: number;
  };
  sourceAnalysis: {
    analysisEngine: string;
    timestamp: string;
    durationMs: number;
  };
  quality: {
    astCoveragePercent: number;
    normalizationConfidence: number;
    notes?: string[];
  };
}

// ============================================================================
// REPORT MODELS
// ============================================================================

/**
 * ReportDocument Interface
 * 
 * Structured representation of an analysis report.
 * Can be rendered as: WebView, Markdown, HTML, or PDF
 */
export interface ReportDocument {
  runId: string;
  timestamp: string;
  repositoryRoot: string;
  sections: ReportSection[];
  metadata: {
    totalSections: number;
    generatedAt: string;
    generatorVersion: string;
  };
}

/**
 * Report Section Types: 6 main sections
 */
export type ReportSectionType =
  | 'EXECUTIVE_SUMMARY'
  | 'API_HEALTH'
  | 'TEST_COVERAGE'
  | 'EVIDENCE_TRACEABILITY'
  | 'REMEDIATION_PLAN'
  | 'ARCHITECTURE_DIAGRAMS';

/**
 * ReportSection
 * 
 * A section within a report
 */
export interface ReportSection {
  id: string;
  type: ReportSectionType;
  title: string;
  description?: string;
  content: ReportContent[];
}

/**
 * Report Content Types
 */
export type ReportContentType =
  | 'TEXT'
  | 'METRIC_CARD'
  | 'TABLE'
  | 'LIST'
  | 'DIAGRAM'
  | 'EVIDENCE_CHAIN'
  | 'ACTION_BUTTONS';

/**
 * ReportContent
 * 
 * Base structure for report content
 */
export interface ReportContent {
  type: ReportContentType;
  contentId: string;
  
  // Text content
  markdown?: string;
  
  // Metric card
  metricCard?: {
    label: string;
    value: string | number;
    unit?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  
  // Table content
  table?: {
    headers: string[];
    rows: Array<Record<string, string | number>>;
  };
  
  // List content
  list?: {
    items: Array<{
      text: string;
      severity?: string;
      link?: string;
    }>;
    ordered?: boolean;
  };
  
  // Diagram reference
  diagram?: {
    diagramId: string;
    title: string;
    mermaidSource?: string;
  };
  
  // Evidence chain
  evidenceChain?: {
    gapId: string;
    linkedTests: string[];
    linkedArtifacts: Array<{
      type: string;
      path: string;
      label: string;
    }>;
  };
  
  // Action buttons
  actionButtons?: Array<{
    label: string;
    action: string;
    params?: Record<string, any>;
  }>;
}

// ============================================================================
// DIAGRAM MODELS
// ============================================================================

/**
 * Diagram Types: 3 main diagram types
 */
export type DiagramType =
  | 'SYSTEM_CONTEXT'
  | 'API_FLOW'
  | 'COVERAGE_MAP';

/**
 * Diagram
 * 
 * Represents a single diagram generated from the run graph
 */
export interface Diagram {
  id: string;
  type: DiagramType;
  title: string;
  description?: string;
  mermaidSource: string;
  
  metadata: {
    nodeCount?: number;
    edgeCount?: number;
    generatedAt: string;
    [key: string]: any;
  };
  
  confidence: number;
  qualityScore: number;
  
  clickableNodes: Array<{
    nodeId: string;
    sourceFile: string;
    lineNumber: number;
    label: string;
  }>;
  
  exportFormats: Array<'SVG' | 'PNG' | 'PDF'>;
}

/**
 * DiagramRegistry
 * 
 * Container for all diagrams in a run
 */
export interface DiagramRegistry {
  diagrams: Diagram[];
}

// ============================================================================
// RUN EXPORT MODELS
// ============================================================================

/**
 * RunSummary
 * 
 * High-level summary of a run
 */
export interface RunSummary {
  runId: string;
  timestamp: string;
  status: 'PASSED' | 'FAILED' | 'PARTIAL';
  totalEndpoints: number;
  testedEndpoints: number;
  totalGaps: number;
  criticalGaps: number;
  testCoveragePercent: number;
}

/**
 * RunExportPackage
 * 
 * Complete package for exporting a run
 */
export interface RunExportPackage {
  graph: RunGraph;
  report: ReportDocument;
  diagrams: DiagramRegistry;
  summary: RunSummary;
  exportDate: string;
  exportFormat: 'JSON' | 'HTML' | 'MARKDOWN' | 'PDF';
}

/**
 * RunAuditTrail
 * 
 * Immutable record of what happened in a run
 */
export interface RunAuditTrail {
  runId: string;
  timestamp: string;
  
  events: Array<{
    timestamp: string;
    event: string;
    details?: Record<string, any>;
  }>;
  
  analysisPhaseEndTime: string;
  reportGenerationEndTime: string;
  diagramGenerationEndTime: string;
  
  totalDurationMs: number;
}

/**
 * RunDelta
 * 
 * Differences between two runs (for trending)
 */
export interface RunDelta {
  previousRunId: string;
  currentRunId: string;
  
  endpointDiff: {
    added: number;
    removed: number;
    changed: number;
  };
  
  testCoverageDiff: {
    previousPercent: number;
    currentPercent: number;
    percentagePointChange: number;
    direction: 'UP' | 'DOWN' | 'STABLE';
  };
  
  gapsDiff: {
    newGaps: number;
    resolvedGaps: number;
    escalatedGaps: number;
  };
}

// ============================================================================
// TYPE EXPORTS (already exported via interface declarations above)
// ============================================================================

// Types are already exported via their declarations above
// This section serves as documentation of public exports
