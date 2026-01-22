/**
 * RepoSense Report and Diagram Models
 * ====================================
 * Canonical schemas for the Run Graph, Report, and Diagram Registry.
 * Single source of truth for both interactive dashboards and exports.
 *
 * Version: 1.0
 * Status: Production-ready
 */

// ============================================================================
// 1. RUN GRAPH (Canonical Single Source of Truth)
// ============================================================================

/**
 * RepoSense Run Graph
 * 
 * A deterministic, normalized representation of the entire analysis:
 * - All discovered code entities (calls, endpoints, tests)
 * - All relationships between them (calls, coverage, remediation)
 * - Metadata needed for reports, diagrams, and evidence tracing
 * 
 * Generated once per run, immutable after creation.
 */
export interface RunGraph {
  runId: string;
  timestamp: string; // ISO 8601
  repositoryRoot: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

/**
 * Graph Node Types
 */
export type GraphNodeType =
  | 'FRONTEND_CALL'    // Frontend code calling an endpoint
  | 'BACKEND_ENDPOINT' // API endpoint definition
  | 'TEST'             // Test case
  | 'EVIDENCE'         // Artifact (screenshot, log, video)
  | 'REMEDIATION'      // Proposed fix
  | 'MODULE';          // Package/folder

/**
 * Node in the run graph
 */
export interface GraphNode {
  id: string;                    // Unique ID (hash of normalized content)
  type: GraphNodeType;
  
  // Basic info
  label: string;                 // Human-readable name
  description?: string;
  
  // Location
  file?: string;                 // Relative file path
  line?: number;
  column?: number;
  
  // Normalized identity (for matching across runs)
  normalized?: {
    method?: string;             // HTTP method (GET, POST, etc.)
    path?: string;               // Normalized path (/users/:id not /users/123)
    moduleName?: string;         // Package or folder
  };
  
  // Node-type specific fields
  frontend?: {
    moduleName: string;
    methodName: string;
    callTarget?: string;         // What it calls
  };
  
  endpoint?: {
    controller: string;          // Class/file
    method: string;              // HTTP method
    path: string;                // Route
    isUsed: boolean;             // Called from frontend?
  };
  
  test?: {
    framework: string;           // Playwright, Jest, Cypress, etc.
    testName: string;
    tags?: string[];             // e.g., ['critical', 'smoke']
  };
  
  evidence?: {
    artifactType: 'SCREENSHOT' | 'VIDEO' | 'LOG' | 'JUNIT';
    artifactPath: string;        // Relative to .reposense/runs/<runId>/
    associatedTestId?: string;
  };
  
  remediation?: {
    gapId: string;               // What gap this fixes
    type: 'CODE_PATCH' | 'TEST_GENERATION';
    diffPath?: string;           // Relative path to patch file
    estimatedEffort: 'S' | 'M' | 'L';
  };
  
  module?: {
    moduleName: string;
    moduleType: 'FRONTEND' | 'BACKEND' | 'SHARED';
  };
  
  // Metadata
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence?: number;           // 0-1, how sure are we about this node?
  tags?: string[];
}

/**
 * Graph Edge Types
 */
export type GraphEdgeType =
  | 'CALLS'              // Frontend call → Endpoint
  | 'ENDPOINT_TESTED_BY' // Endpoint → Test
  | 'TEST_PRODUCES'      // Test → Evidence
  | 'GAP_FIXES'          // Remediation → Gap (fixed by this)
  | 'FIX_VERIFIED_BY'    // Remediation → Test run that verified it
  | 'DEPENDS_ON'         // Module → Module
  | 'MENTIONED_IN';      // Gap → File (where it's referenced)

/**
 * Edge in the run graph
 */
export interface GraphEdge {
  id: string;                    // Unique ID
  type: GraphEdgeType;
  sourceNodeId: string;
  targetNodeId: string;
  
  // Metadata
  weight?: number;               // 0-1, strength of relationship
  count?: number;                // How many times called? (for CALLS edges)
  lastObserved?: string;         // ISO 8601
  tags?: string[];
  
  // Edge-type specific
  callDetails?: {
    callCount: number;
    lastCallTime?: string;
    frequency?: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  
  testCoverageDetails?: {
    passed: boolean;
    confidence: number;           // How confident this test covers the endpoint?
  };
  
  evidenceDetails?: {
    evidenceCount: number;
    types: string[];              // ['SCREENSHOT', 'LOG', 'VIDEO']
  };
}

/**
 * Graph metadata
 */
export interface GraphMetadata {
  nodeCount: number;
  edgeCount: number;
  
  // Aggregate statistics
  statistics: {
    totalEndpoints: number;
    usedEndpoints: number;
    unusedEndpoints: number;
    untestedEndpoints: number;
    totalTests: number;
    totalGaps: number;
    
    // Coverage
    endpointCoveragePercent: number;
    linesOfCodeAnalyzed: number;
  };
  
  // Source info
  sourceAnalysis: {
    analysisEngine: string;       // "BackendAnalyzer", "FrontendAnalyzer"
    timestamp: string;
    durationMs: number;
  };
  
  // Quality indicators
  quality: {
    astCoveragePercent: number;   // % of code parsed as AST vs pattern-matched
    normalizationConfidence: number; // How confident are we in path normalization?
    notes?: string[];             // e.g., ["Dynamic URL builders not fully supported"]
  };
}

// ============================================================================
// 2. REPORT MODEL (Structured Document)
// ============================================================================

/**
 * Structured report model that can render to:
 * - Interactive WebView (React components)
 * - Markdown (git-friendly)
 * - HTML/PDF (executive share)
 */
export interface ReportDocument {
  runId: string;
  timestamp: string;
  
  // Header
  title: string;
  description?: string;
  
  // Sections (ordered)
  sections: ReportSection[];
  
  // Metadata
  generatedBy: string;           // "RepoSense v2.0"
  buildInfo?: {
    repositoryUrl?: string;
    branch?: string;
    commitHash?: string;
  };
}

export type ReportSectionType =
  | 'EXECUTIVE_SUMMARY'
  | 'API_HEALTH'
  | 'TEST_COVERAGE'
  | 'EVIDENCE_TRACEABILITY'
  | 'REMEDIATION_PLAN'
  | 'ARCHITECTURE_DIAGRAMS'
  | 'APPENDIX';

export interface ReportSection {
  id: string;
  type: ReportSectionType;
  title: string;
  description?: string;
  content: ReportContent[];
}

export type ReportContentType =
  | 'TEXT'
  | 'METRIC_CARD'
  | 'TABLE'
  | 'LIST'
  | 'DIAGRAM'
  | 'EVIDENCE_CHAIN'
  | 'ACTION_BUTTONS';

export interface ReportContent {
  id: string;
  type: ReportContentType;
  
  // Text content
  text?: {
    body: string;              // Markdown
    emphasis?: 'NORMAL' | 'CRITICAL' | 'SUCCESS';
  };
  
  // Metric card (e.g., "92 gaps found")
  metricCard?: {
    label: string;
    value: string | number;
    unit?: string;             // "%", "files", etc.
    trend?: {
      direction: 'UP' | 'DOWN' | 'STABLE';
      percentChange: number;
      previousValue?: number;
    };
    icon?: string;             // emoji or icon name
    severity?: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  };
  
  // Table
  table?: {
    headers: string[];
    rows: (string | number | boolean)[][];
    sortableColumns?: string[];
    filterableColumns?: string[];
  };
  
  // List (for gaps, issues, etc.)
  list?: {
    items: ListItem[];
    layout?: 'BULLET' | 'NUMBERED' | 'COMPACT_CARD';
  };
  
  // Diagram reference
  diagram?: {
    diagramId: string;         // Reference to diagrams.json
    title: string;
    description?: string;
    mermaidSource?: string;    // Inline Mermaid if small
  };
  
  // Evidence chain (gap → test → run → artifact)
  evidenceChain?: {
    title: string;
    chain: ChainLink[];
  };
  
  // Action buttons (CTAs)
  actionButtons?: {
    buttons: ActionButton[];
  };
}

export interface ListItem {
  title: string;
  description?: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  metadata?: Record<string, string | number>;
  linkedNodeId?: string;       // Link back to run graph node
}

export interface ChainLink {
  label: string;
  nodeId?: string;             // Graph node ID
  artifactPath?: string;       // Evidence artifact
  timestamp?: string;
}

export interface ActionButton {
  id: string;
  label: string;
  action: 'GENERATE_TEST' | 'OPEN_FILE' | 'EXPORT' | 'RERUN' | 'CHAT';
  params?: Record<string, unknown>;
}

// ============================================================================
// 3. DIAGRAM REGISTRY
// ============================================================================

/**
 * Registry of all diagrams generated in a run
 * Tracks metadata, inputs, and confidence
 */
export interface DiagramRegistry {
  runId: string;
  diagrams: DiagramEntry[];
}

export interface DiagramEntry {
  id: string;                    // e.g., "api-flow", "system-context"
  title: string;
  description?: string;
  
  // Rendering
  diagramType: 'MERMAID' | 'SVG' | 'PNG';
  source: string;               // Path relative to .reposense/runs/<runId>/diagrams/
  
  // Generation metadata
  generatedAt: string;           // ISO 8601
  durationMs?: number;
  
  // Quality indicators
  confidence: number;            // 0-1, how confident is this diagram accurate?
  inputGraphNodesUsed: number;   // How many nodes from graph.json?
  inputGraphEdgesUsed: number;
  
  // Limitations and notes
  quality: {
    isComplete: boolean;         // All entities shown, or filtered?
    coverage: number;            // % of graph entities included
    limitations?: string[];      // e.g., "Dynamic URL builders not fully resolved"
    assumptions?: string[];      // e.g., "Assumes X = Y based on naming"
  };
  
  // Interactivity
  interactive: {
    clickableNodes: string[];    // Graph node IDs that are clickable
    tooltips: boolean;           // Show hover tooltips?
    linkedToEvidence: boolean;   // Can click through to evidence?
  };
}

// ============================================================================
// 4. RUN SUMMARY (Quick Stats)
// ============================================================================

/**
 * Quick summary for dashboards and exports
 */
export interface RunSummary {
  runId: string;
  timestamp: string;
  
  // Gap summary
  gaps: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  
  // Coverage summary
  coverage: {
    endpointCoverage: number;    // 0-100%
    testCount: number;
    passingTests: number;
    failingTests: number;
  };
  
  // Remediation summary
  remediation: {
    proposedFixes: number;
    estimatedHoursToDo: number;
  };
  
  // Risk assessment
  riskScore: number;             // 0-100, where 100 is critical risk
  recommendation: string;        // "READY_TO_SHIP" | "NEEDS_WORK" | "CRITICAL"
}

// ============================================================================
// 5. EXPORT MODELS (For portability)
// ============================================================================

/**
 * Everything needed to recreate a run report elsewhere
 */
export interface RunExportPackage {
  runId: string;
  timestamp: string;
  
  // Core data
  graph: RunGraph;
  report: ReportDocument;
  diagrams: DiagramRegistry;
  summary: RunSummary;
  
  // Artifacts (references, not embedded)
  artifactManifest: ArtifactManifest;
}

export interface ArtifactManifest {
  evidenceArtifacts: {
    path: string;
    type: string;               // screenshot, video, log
    associatedNodeId?: string;
  }[];
  
  remediationPatches: {
    path: string;
    gapId: string;
  }[];
  
  testFiles: {
    path: string;
    framework: string;
  }[];
}

// ============================================================================
// 6. TRACEABILITY & AUDIT
// ============================================================================

/**
 * Immutable record of what produced what
 * Used for compliance and debugging
 */
export interface RunAuditTrail {
  runId: string;
  startTime: string;
  endTime: string;
  
  phases: AuditPhase[];
}

export interface AuditPhase {
  phase: 'SCAN' | 'PLAN' | 'GENERATE' | 'EXECUTE' | 'REPORT';
  startTime: string;
  endTime: string;
  durationMs: number;
  
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  message?: string;
  
  // What was produced
  outputArtifacts: string[];     // File paths
  
  // Error handling
  errors?: string[];
  warnings?: string[];
}

// ============================================================================
// 7. DELTA & TREND (Comparing runs)
// ============================================================================

/**
 * Comparison between two runs (for trend analysis)
 */
export interface RunDelta {
  previousRunId: string;
  currentRunId: string;
  
  // Gap changes
  gapsDelta: {
    added: number;
    removed: number;
    unchanged: number;
    severity_shifted: number;    // Moved to CRITICAL, etc.
  };
  
  // Coverage changes
  coverageDelta: {
    previousPercent: number;
    currentPercent: number;
    percentChange: number;
    testsAdded: number;
  };
  
  // Trend
  trend: 'IMPROVING' | 'DEGRADING' | 'STABLE';
  recommendation: string;
}

// ============================================================================
// TYPE EXPORTS for convenience
// ============================================================================

export type {
  RunGraph,
  GraphNode,
  GraphEdge,
  ReportDocument,
  ReportSection,
  ReportContent,
  DiagramRegistry,
  DiagramEntry,
  RunSummary,
};
