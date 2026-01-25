# SPRINT 11: BUILD CONTRACT
**Engineering Grade • UI-Truthfulness Focused • Artifact-Driven**

---

## EXECUTIVE SUMMARY

**Objective**: Convert RepoSense from "features exist but aren't integrated" → **"UI reads artifacts only, chatbot unified, deltas real, fixtures deterministic"**

**Scope**: 8 modules (~2,200 LOC), refactor 3 existing UI panels  
**Timeline**: 12 business days  
**Definition of Done**: Sprint 9 Workstream A + B pass 100%, AC1-AC5 met  
**Dependency**: Sprint 10 must complete first (`.reposense/` artifacts must exist)

---

## CRITICAL CONTEXT: THE DRIFT PROBLEM

### What Sprint 1-9 Created (According to Review)

✅ VS Code extension bootstrap  
✅ Analysis pipeline (AnalysisEngine, FrontendAnalyzer, BackendAnalyzer)  
✅ Report UI + LLM report generator  
✅ Diagram generation (2 versions — **DRIFT**)  
✅ Evidence model (spec-heavy, not integrated)  
✅ Chat UI + OllamaService (directly embedded — **DRIFT**)  
✅ Performance optimizer spec  
✅ Hardening patterns  

### The Drift Risks Identified

❌ **Two diagram generators** (DiagramGeneratorNew + ArchitectureDiagramGenerator)  
❌ **Two chatbot paths** (ChatPanel→Ollama direct + ChatBotServiceNew spec)  
❌ **UI pulls from runtime** (not from `.reposense/` artifacts)  
❌ **Fixtures are specs** (not real deterministic repos)  
❌ **No active-run context** (UI doesn't know which run it's showing)  
❌ **Delta/trends undefined** (no run-to-run comparison)  

### Sprint 11's Job

**Pick one path for each**, make UI **artifact-driven**, and **unify the chatbot into a command-driven assistant**.

---

## PART 1: ARCHITECTURE

### The New Data Flow (Sprint 11)

```
.reposense/runs/<runId>/
├── meta.json
├── scan.json
├── graph.json
├── report/report.json
├── diagrams/diagrams.json
├── diagrams/*.mmd
├── delta/delta.json          ← NEW
└── evidence/evidence-index.json (stub if not ready)
    ↓
RunContextService (which run am I looking at?)
    ↓ provides activeRunId, metadata
    ↓
ArtifactReader (read files from disk)
    ↓ provides Graph, Report, Diagrams, Delta
    ↓
UI Panels (render from artifacts, NO recompute)
    ├─ GapAnalysisProvider (graph only)
    ├─ ReportPanel (report.json only)
    └─ DiagramPanel (mmd + diagrams.json only)

ChatPanel
    ↓
ChatOrchestrator (unified backend)
    ├─ IntentRouter (EXPLAIN, PLAN, GENERATE, EXECUTE, AUDIT)
    ├─ CommandInvoker (map to real VS Code commands)
    └─ Returns: response with runId + nodeId links + actions
```

### Modules to Build/Refactor (8 Total)

| # | Module | Type | LOC | Purpose | Critical? |
|---|--------|------|-----|---------|-----------|
| 1 | RunContextService | NEW | 250 | Track active run + metadata | ⚠️ YES |
| 2 | ArtifactReader | NEW | 300 | Load + validate artifacts | ⚠️ YES |
| 3 | GapAnalysisProvider | REFACTOR | 400 | Read graph.json, not runtime | YES |
| 4 | ReportPanel | REFACTOR | 300 | Read report.json only | YES |
| 5 | DiagramUI | REFACTOR | 250 | Read .mmd files only | YES |
| 6 | DeltaEngine | NEW | 350 | Compare runs → delta.json | YES |
| 7 | ChatOrchestrator | NEW/REFACTOR | 400 | Unify chat backend | ⚠️ YES |
| 8 | IntentRouter+Invoker | NEW | 350 | Intent → command mapping | ⚠️ YES |

**Total**: ~2,600 LOC

---

## PART 2: MODULE SPECIFICATIONS

### Module 1: RunContextService (NEW)

**File**: `src/services/run/RunContextService.ts`

**Purpose**: Single source of truth for "which run are we looking at?"

```typescript
// src/services/run/RunContextService.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface RunContext {
  activeRunId: string | null;
  latestSuccessfulRunId: string | null;
  workspaceFolder: string;
}

export class RunContextService {
  private context: vscode.ExtensionContext;
  private workspace: vscode.WorkspaceFolder;
  private runMetadata: Map<string, RunMetadata> = new Map();

  constructor(context: vscode.ExtensionContext, workspace: vscode.WorkspaceFolder) {
    this.context = context;
    this.workspace = workspace;
  }

  /**
   * Get the currently active run ID.
   * Priority: explicit selection > latest successful run > null
   */
  async getActiveRunId(): Promise<string | null> {
    // Check workspace state for explicit selection
    const stored = this.context.workspaceState.get<string>('activeRunId');
    if (stored) {
      return stored;
    }

    // Fall back to latest successful run
    return await this.getLatestSuccessfulRunId();
  }

  /**
   * Set the active run ID.
   * Triggers refresh of all artifacts.
   */
  async setActiveRunId(runId: string): Promise<void> {
    await this.context.workspaceState.update('activeRunId', runId);

    // Fire event: active run changed
    this.onActiveRunChanged.fire({ runId });
  }

  /**
   * Find the most recent run with status=COMPLETE.
   */
  async getLatestSuccessfulRunId(): Promise<string | null> {
    const runsDir = path.join(this.workspace.uri.fsPath, '.reposense', 'runs');
    
    if (!fs.existsSync(runsDir)) {
      return null;
    }

    const runs = fs.readdirSync(runsDir)
      .filter(f => fs.statSync(path.join(runsDir, f)).isDirectory())
      .map(runId => ({ runId, time: this.parseRunTime(runId) }))
      .sort((a, b) => (b.time?.getTime() ?? 0) - (a.time?.getTime() ?? 0));

    for (const { runId } of runs) {
      try {
        const meta = await this.loadMeta(runId);
        if (meta.status === 'COMPLETE') {
          return runId;
        }
      } catch {
        // Skip invalid runs
      }
    }

    return null;
  }

  /**
   * Load meta.json for a run.
   * Caches result for performance.
   */
  async loadMeta(runId: string): Promise<RunMetadata> {
    if (this.runMetadata.has(runId)) {
      return this.runMetadata.get(runId)!;
    }

    const metaPath = path.join(
      this.workspace.uri.fsPath,
      '.reposense',
      'runs',
      runId,
      'meta.json'
    );

    if (!fs.existsSync(metaPath)) {
      throw new Error(`meta.json not found for run ${runId}`);
    }

    const content = fs.readFileSync(metaPath, 'utf-8');
    const meta: RunMetadata = JSON.parse(content);

    this.runMetadata.set(runId, meta);
    return meta;
  }

  /**
   * Get context for current active run.
   */
  async getCurrentContext(): Promise<RunContext> {
    return {
      activeRunId: await this.getActiveRunId(),
      latestSuccessfulRunId: await this.getLatestSuccessfulRunId(),
      workspaceFolder: this.workspace.uri.fsPath,
    };
  }

  // Event emitter for external listeners
  onActiveRunChanged = new vscode.EventEmitter<{ runId: string }>();

  private parseRunTime(runId: string): Date | null {
    // Parse runId format: "run-20260121-153022" or similar
    const match = runId.match(/run-(\d{8})-(\d{6})/);
    if (!match) return null;

    const [, dateStr, timeStr] = match;
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6));
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(timeStr.substring(0, 2));
    const min = parseInt(timeStr.substring(2, 4));
    const sec = parseInt(timeStr.substring(4, 6));

    return new Date(year, month - 1, day, hour, min, sec);
  }
}

export interface RunMetadata {
  runId: string;
  startTime: string;
  endTime?: string;
  status: 'RUNNING' | 'COMPLETE' | 'FAILED';
  error?: { message: string; stack: string };
  artifacts: {
    meta: string;
    scan: string;
    graph: string;
    report: string;
    diagrams: string;
  };
}
```

---

### Module 2: ArtifactReader (NEW)

**File**: `src/services/run/ArtifactReader.ts`

**Purpose**: Load and validate artifacts from `.reposense/runs/<id>/`

```typescript
// src/services/run/ArtifactReader.ts

import * as fs from 'fs';
import * as path from 'path';

export class ArtifactReader {
  constructor(private runsDir: string) {}

  /**
   * Read graph.json from a run.
   * Validates structure before returning.
   */
  async readGraph(runId: string): Promise<Graph> {
    const filePath = path.join(this.runsDir, runId, 'graph.json');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`graph.json not found for run ${runId}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const graph: Graph = JSON.parse(content);

    // Validate
    if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      throw new Error('Invalid graph.json structure');
    }

    return graph;
  }

  /**
   * Read report.json from a run.
   */
  async readReport(runId: string): Promise<Report> {
    const filePath = path.join(this.runsDir, runId, 'report', 'report.json');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`report.json not found for run ${runId}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const report: Report = JSON.parse(content);

    return report;
  }

  /**
   * Read diagrams index.
   */
  async readDiagramsIndex(runId: string): Promise<DiagramsIndex> {
    const filePath = path.join(this.runsDir, runId, 'diagrams', 'diagrams.json');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`diagrams.json not found for run ${runId}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const index: DiagramsIndex = JSON.parse(content);

    return index;
  }

  /**
   * Read a specific Mermaid diagram.
   */
  async readMermaid(runId: string, fileName: string): Promise<string> {
    const filePath = path.join(this.runsDir, runId, 'diagrams', `${fileName}.mmd`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`${fileName}.mmd not found for run ${runId}`);
    }

    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Read delta.json if it exists.
   * Returns null if run has no delta (e.g., first run).
   */
  async readDelta(runId: string): Promise<Delta | null> {
    const filePath = path.join(this.runsDir, runId, 'delta', 'delta.json');
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Read evidence index if it exists (stub for now).
   */
  async readEvidenceIndex(runId: string): Promise<EvidenceIndex | null> {
    const filePath = path.join(this.runsDir, runId, 'evidence', 'evidence-index.json');
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }
}

// Type definitions
export interface Graph {
  version: string;
  generatedAt: string;
  nodeCount: number;
  edgeCount: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics: {
    totalEndpoints: number;
    totalCallSites: number;
    orphanCount: number;
    connectedEdges: number;
  };
}

export interface Report {
  version: string;
  generatedAt: string;
  statistics: {
    totalEndpoints: number;
    totalCallSites: number;
    totalEdges: number;
    orphanEndpoints: number;
    orphanCalls: number;
    coverageRatio: number;
  };
  gapAnalysis: {
    orphanEndpoints: any[];
    orphanCalls: any[];
    unreachableAreas: any[];
  };
}

export interface Delta {
  baseRunId: string;
  currentRunId: string;
  generatedAt: string;
  gapDelta: {
    added: string[];
    removed: string[];
    unchanged: string[];
  };
  totalsDelta: {
    gaps: { base: number; current: number; change: number };
    matched: { base: number; current: number; change: number };
  };
  trendDirection: 'IMPROVING' | 'DEGRADING' | 'STABLE';
}
```

---

### Module 3: GapAnalysisProvider REFACTOR

**File**: `src/providers/GapAnalysisProvider.ts`

**Key Change**: Instead of calling `AnalysisEngine.scan()`, read `graph.json` from artifacts.

```typescript
// Before (Sprint 9)
async updateGapTree() {
  const analysis = await analyzeRepository(); // Live scan
  const nodes = analysis.endpoints.map(e => ({ label: e.method }));
  this.treeData = nodes;
}

// After (Sprint 11)
async updateGapTree() {
  try {
    const context = await this.runContextService.getCurrentContext();
    
    if (!context.activeRunId) {
      // No run: show empty state
      this.treeData = [{ label: 'No artifacts. Run Scan to start.' }];
      return;
    }

    // Read from artifact only
    const graph = await this.artifactReader.readGraph(context.activeRunId);
    
    // Transform graph nodes into tree items
    const orphans = graph.nodes.filter(n => n.isOrphan);
    const connected = graph.nodes.filter(n => !n.isOrphan);

    this.treeData = [
      { label: `Connected (${connected.length})`, children: connected.map(this.nodeToTreeItem) },
      { label: `Orphaned (${orphans.length})`, children: orphans.map(this.nodeToTreeItem) },
    ];
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to load gaps: ${error.message}`);
  }
}
```

**Acceptance**:
- No scan runs during tree refresh
- Click a gap → navigate to source code via stored `path` + `line`
- Missing artifacts show empty state

---

### Module 4: ReportPanel REFACTOR

**File**: `src/providers/ReportPanel.ts`

**Key Change**: Remove sample data, read `report.json` only.

```typescript
// Before (Sprint 9)
getWebviewContent() {
  // Return HTML with hardcoded sample metrics
  return `<div>${sampleReport.coverage}%</div>`;
}

// After (Sprint 11)
async getWebviewContent() {
  try {
    const context = await this.runContextService.getCurrentContext();
    
    if (!context.activeRunId) {
      // Empty state
      return this.renderEmptyState();
    }

    // Read from artifact only
    const report = await this.artifactReader.readReport(context.activeRunId);
    
    // Render from report data, not sample
    return this.renderReportHTML(report);
  } catch (error) {
    return this.renderErrorState(error.message);
  }
}

renderReportHTML(report: Report): string {
  return `
    <h2>Coverage: ${(report.statistics.coverageRatio * 100).toFixed(1)}%</h2>
    <p>Endpoints: ${report.statistics.totalEndpoints}</p>
    <p>Orphaned: ${report.statistics.orphanEndpoints}</p>
  `;
}
```

**Acceptance**:
- No sample report once artifacts exist
- Shows "Run Scan" CTA if no artifacts
- Accurate totals from artifact

---

### Module 5: DiagramUI REFACTOR

**File**: `src/providers/DiagramPanel.ts` (or equivalent)

**Key Change**: Render pre-generated `.mmd`, not runtime generation.

```typescript
async displayDiagrams() {
  try {
    const context = await this.runContextService.getCurrentContext();
    
    if (!context.activeRunId) {
      this.renderEmptyState();
      return;
    }

    // List diagrams from diagrams.json
    const index = await this.artifactReader.readDiagramsIndex(context.activeRunId);

    for (const diagram of index.diagrams) {
      // Read pre-generated Mermaid
      const mermaidContent = await this.artifactReader.readMermaid(
        context.activeRunId,
        diagram.name
      );

      // Render using Mermaid library
      this.renderMermaidDiagram(mermaidContent, diagram.name);
    }
  } catch (error) {
    this.renderErrorState(error.message);
  }
}
```

**Acceptance**:
- No diagram generation in render path
- Uses `.mmd` files from disk
- Mermaid library renders, not custom code

---

### Module 6: DeltaEngine (NEW)

**File**: `src/services/delta/DeltaEngine.ts`

**Purpose**: Compare two runs and produce `delta.json`.

```typescript
// src/services/delta/DeltaEngine.ts

import * as fs from 'fs';
import * as path from 'path';

export class DeltaEngine {
  /**
   * Compare two runs and generate delta.json.
   * Stores result in current run's delta/ folder.
   */
  async computeDelta(
    runsDir: string,
    baseRunId: string,
    currentRunId: string
  ): Promise<Delta> {
    // Load graphs for both runs
    const baseGraph = this.loadGraph(runsDir, baseRunId);
    const currentGraph = this.loadGraph(runsDir, currentRunId);

    // Extract gap IDs
    const baseOrphans = new Set(
      baseGraph.nodes.filter(n => n.isOrphan).map(n => n.id)
    );
    const currentOrphans = new Set(
      currentGraph.nodes.filter(n => n.isOrphan).map(n => n.id)
    );

    // Compute delta
    const added = Array.from(currentOrphans).filter(id => !baseOrphans.has(id));
    const removed = Array.from(baseOrphans).filter(id => !currentOrphans.has(id));
    const unchanged = Array.from(baseOrphans).filter(id => currentOrphans.has(id));

    // Load reports for statistics
    const baseReport = this.loadReport(runsDir, baseRunId);
    const currentReport = this.loadReport(runsDir, currentRunId);

    // Compute trend
    const trendDirection = this.computeTrend(baseReport, currentReport);

    const delta: Delta = {
      baseRunId,
      currentRunId,
      generatedAt: new Date().toISOString(),
      gapDelta: { added, removed, unchanged },
      totalsDelta: {
        gaps: {
          base: baseReport.statistics.orphanEndpoints,
          current: currentReport.statistics.orphanEndpoints,
          change: currentReport.statistics.orphanEndpoints - baseReport.statistics.orphanEndpoints,
        },
        matched: {
          base: baseReport.statistics.totalEndpoints - baseReport.statistics.orphanEndpoints,
          current: currentReport.statistics.totalEndpoints - currentReport.statistics.orphanEndpoints,
          change:
            (currentReport.statistics.totalEndpoints - currentReport.statistics.orphanEndpoints) -
            (baseReport.statistics.totalEndpoints - baseReport.statistics.orphanEndpoints),
        },
      },
      trendDirection,
    };

    // Persist to delta/delta.json
    const deltaDir = path.join(runsDir, currentRunId, 'delta');
    const deltaFile = path.join(deltaDir, 'delta.json');

    if (!fs.existsSync(deltaDir)) {
      fs.mkdirSync(deltaDir, { recursive: true });
    }

    fs.writeFileSync(deltaFile, JSON.stringify(delta, null, 2), 'utf-8');

    return delta;
  }

  private computeTrend(baseReport: Report, currentReport: Report): 'IMPROVING' | 'DEGRADING' | 'STABLE' {
    const baseGaps = baseReport.statistics.orphanEndpoints;
    const currentGaps = currentReport.statistics.orphanEndpoints;

    const baseMatched = baseReport.statistics.totalEndpoints - baseGaps;
    const currentMatched = currentReport.statistics.totalEndpoints - currentGaps;

    // Improving: gaps decrease AND matched increases
    if (currentGaps < baseGaps && currentMatched > baseMatched) {
      return 'IMPROVING';
    }

    // Degrading: gaps increase OR matched decreases
    if (currentGaps > baseGaps || currentMatched < baseMatched) {
      return 'DEGRADING';
    }

    return 'STABLE';
  }

  private loadGraph(runsDir: string, runId: string): Graph {
    const filePath = path.join(runsDir, runId, 'graph.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  private loadReport(runsDir: string, runId: string): Report {
    const filePath = path.join(runsDir, runId, 'report', 'report.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
}

export interface Delta {
  baseRunId: string;
  currentRunId: string;
  generatedAt: string;
  gapDelta: {
    added: string[];
    removed: string[];
    unchanged: string[];
  };
  totalsDelta: {
    gaps: { base: number; current: number; change: number };
    matched: { base: number; current: number; change: number };
  };
  trendDirection: 'IMPROVING' | 'DEGRADING' | 'STABLE';
}
```

---

### Module 7: ChatOrchestrator (NEW/REFACTOR)

**File**: `src/services/chat/ChatOrchestrator.ts`

**Purpose**: Unified backend for chat, enforcing response contract.

```typescript
// src/services/chat/ChatOrchestrator.ts

import { IntentRouter } from './IntentRouter';
import { CommandInvoker } from './CommandInvoker';
import { RunContextService } from '../run/RunContextService';
import { ArtifactReader } from '../run/ArtifactReader';

export interface ChatInput {
  message: string;
  selectedNodeId?: string;
  selectedFile?: string;
}

export interface ChatResponse {
  text: string;
  runId: string;                    // MANDATORY: which run this is about
  nodeLinks: Array<{ nodeId: string; label: string }>;  // at least 1 when applicable
  suggestedActions: Array<{
    label: string;
    commandId: string;
    args?: any;
  }>;
  sourceLinks?: Array<{ path: string; line: number }>;
}

export class ChatOrchestrator {
  private intentRouter: IntentRouter;
  private commandInvoker: CommandInvoker;
  private runContextService: RunContextService;
  private artifactReader: ArtifactReader;

  constructor(
    intentRouter: IntentRouter,
    commandInvoker: CommandInvoker,
    runContextService: RunContextService,
    artifactReader: ArtifactReader
  ) {
    this.intentRouter = intentRouter;
    this.commandInvoker = commandInvoker;
    this.runContextService = runContextService;
    this.artifactReader = artifactReader;
  }

  /**
   * Main entry point for chat messages.
   * Returns response guaranteed to have runId, links, and actions.
   */
  async handleMessage(input: ChatInput): Promise<ChatResponse> {
    try {
      // Get context
      const context = await this.runContextService.getCurrentContext();

      if (!context.activeRunId) {
        return {
          text: 'No active run. Please run "Scan Repository" first.',
          runId: 'unknown',
          nodeLinks: [],
          suggestedActions: [
            { label: 'Run Scan', commandId: 'reposense.scan', args: {} }
          ],
        };
      }

      // Route intent
      const intent = await this.intentRouter.detectIntent(input.message);

      // Load artifacts if needed
      let graph: Graph | null = null;
      let report: Report | null = null;

      if (['EXPLAIN', 'PLAN', 'AUDIT'].includes(intent.type)) {
        graph = await this.artifactReader.readGraph(context.activeRunId);
        report = await this.artifactReader.readReport(context.activeRunId);
      }

      // Generate response based on intent
      let responseText: string;
      let nodeLinks: Array<{ nodeId: string; label: string }> = [];
      let suggestedActions: Array<{ label: string; commandId: string; args?: any }> = [];
      let sourceLinks: Array<{ path: string; line: number }> | undefined;

      switch (intent.type) {
        case 'EXPLAIN':
          ({ responseText, nodeLinks, suggestedActions, sourceLinks } =
            await this.intentRouter.handleExplain(input, graph!, report!));
          break;

        case 'PLAN':
          ({ responseText, nodeLinks, suggestedActions } =
            await this.intentRouter.handlePlan(input, graph!, report!));
          break;

        case 'GENERATE':
          ({ responseText, suggestedActions } =
            await this.intentRouter.handleGenerate(input));
          break;

        case 'EXECUTE':
          ({ responseText, suggestedActions } =
            await this.intentRouter.handleExecute(input, this.commandInvoker));
          break;

        case 'AUDIT':
          ({ responseText, nodeLinks, suggestedActions } =
            await this.intentRouter.handleAudit(input, graph!));
          break;

        default:
          responseText = 'I did not understand that. Try: explain, plan, generate, execute, or audit.';
      }

      // Enforce contract: ensure runId, at least 1 action
      if (!suggestedActions.length) {
        suggestedActions.push({ label: 'View Report', commandId: 'reposense.openReport' });
      }

      return {
        text: responseText,
        runId: context.activeRunId,    // MANDATORY
        nodeLinks,                       // Can be empty, but tracked
        suggestedActions,               // Always ≥1
        sourceLinks,
      };
    } catch (error) {
      return {
        text: `Error: ${error.message}`,
        runId: (await this.runContextService.getCurrentContext()).activeRunId || 'unknown',
        nodeLinks: [],
        suggestedActions: [
          { label: 'Try Again', commandId: 'reposense.chat.retry' }
        ],
      };
    }
  }
}
```

---

### Module 8: IntentRouter + CommandInvoker (NEW)

**File**: `src/services/chat/IntentRouter.ts` + `CommandInvoker.ts`

```typescript
// src/services/chat/IntentRouter.ts

export type IntentType = 'EXPLAIN' | 'PLAN' | 'GENERATE' | 'EXECUTE' | 'AUDIT';

export interface Intent {
  type: IntentType;
  confidence: number;
  entities: Record<string, any>;
}

export class IntentRouter {
  /**
   * Detect intent from user message.
   */
  async detectIntent(message: string): Promise<Intent> {
    const lower = message.toLowerCase();

    // Simple keyword-based routing (can be replaced with ML later)
    if (lower.includes('explain') || lower.includes('what is') || lower.includes('tell me')) {
      return { type: 'EXPLAIN', confidence: 0.9, entities: {} };
    }

    if (lower.includes('plan') || lower.includes('how do') || lower.includes('steps')) {
      return { type: 'PLAN', confidence: 0.9, entities: {} };
    }

    if (lower.includes('generate') || lower.includes('create') || lower.includes('write')) {
      return { type: 'GENERATE', confidence: 0.9, entities: {} };
    }

    if (lower.includes('run') || lower.includes('execute') || lower.includes('do')) {
      return { type: 'EXECUTE', confidence: 0.8, entities: {} };
    }

    if (lower.includes('audit') || lower.includes('check') || lower.includes('verify')) {
      return { type: 'AUDIT', confidence: 0.8, entities: {} };
    }

    return { type: 'EXPLAIN', confidence: 0.5, entities: {} };
  }

  /**
   * Handle EXPLAIN intent.
   */
  async handleExplain(
    input: ChatInput,
    graph: Graph,
    report: Report
  ): Promise<{
    responseText: string;
    nodeLinks: Array<{ nodeId: string; label: string }>;
    suggestedActions: Array<{ label: string; commandId: string }>;
    sourceLinks?: Array<{ path: string; line: number }>;
  }> {
    // If user asked about a specific gap/node
    const orphans = graph.nodes.filter(n => n.isOrphan);

    if (input.selectedNodeId) {
      const node = graph.nodes.find(n => n.id === input.selectedNodeId);
      if (node) {
        return {
          responseText: `This is an orphaned endpoint: ${node.method} ${node.path}. It has no incoming calls from the codebase.`,
          nodeLinks: [{ nodeId: node.id, label: `${node.method} ${node.path}` }],
          suggestedActions: [
            { label: 'View Code', commandId: 'reposense.viewSource', args: { nodeId: node.id } },
            { label: 'Generate Test', commandId: 'reposense.generateTest', args: { nodeId: node.id } },
          ],
          sourceLinks: [{ path: node.path, line: node.line }],
        };
      }
    }

    // Generic explanation
    return {
      responseText: `Your codebase has ${orphans.length} orphaned endpoints (not called by any client code). The report shows ${report.statistics.totalEndpoints} total endpoints with ${(report.statistics.coverageRatio * 100).toFixed(1)}% coverage.`,
      nodeLinks: orphans.slice(0, 3).map(n => ({ nodeId: n.id, label: `${n.method} ${n.path}` })),
      suggestedActions: [
        { label: 'View All Orphans', commandId: 'reposense.filterOrphans' },
        { label: 'Generate Remediation', commandId: 'reposense.generateRemediation' },
      ],
    };
  }

  // ... handlePlan, handleGenerate, handleExecute, handleAudit ...
}

// CommandInvoker maps intent actions to real VS Code commands
export class CommandInvoker {
  constructor(private context: vscode.ExtensionContext) {}

  async invoke(
    commandId: string,
    args?: any
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const result = await vscode.commands.executeCommand(commandId, args);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
```

---

## PART 3: ACCEPTANCE CRITERIA (Must All Pass)

### AC1 — UI Truthfulness

**Test**: Gap view, report panel, diagrams panel render from artifacts.

```bash
Given: .reposense/runs/<runId>/ exists with all artifacts
When: User opens Gap tree, Report panel, Diagram panel
Then:
  ✓ All data comes from artifacts (no live scan during render)
  ✓ No mock/sample data once artifacts exist
  ✓ Missing artifacts show empty state with "Run Scan" CTA
```

**Acceptance**: All 3 panels pass this test

---

### AC2 — Run Awareness

**Test**: Active runId is visible and switching it updates everything.

```bash
Given: Multiple runs in .reposense/runs/
When: User switches active run via "Switch Run" command
Then:
  ✓ Active runId displayed in UI
  ✓ All panels refresh to show new run's artifacts
  ✓ Gaps, report, diagrams change
```

**Acceptance**: Switching run updates all panels

---

### AC3 — Chatbot Integrity

**Test**: 10 consecutive chat messages all include runId, node links, and actions.

```typescript
for (let i = 0; i < 10; i++) {
  const response = await orchestrator.handleMessage({ message: `test message ${i}` });
  
  assert(response.runId !== 'unknown', 'Must cite runId');
  
  if (response.message.includes('gap') || response.message.includes('endpoint')) {
    assert(response.nodeLinks.length > 0, 'Must have node links for gap-related responses');
  }
  
  assert(response.suggestedActions.length >= 1, 'Must have at least 1 action');
}
```

**Acceptance**: All 10 responses pass

---

### AC4 — Delta Generation

**Test**: After modifying repo, new run produces correct delta.json.

```bash
Given: First run with 10 endpoints, 2 orphans
When: Add endpoint, remove orphan, run again
And: DeltaEngine.computeDelta(base, current)
Then:
  ✓ added contains new endpoint ID
  ✓ removed contains deleted orphan ID
  ✓ trendDirection = 'IMPROVING' (orphans decreased)
  ✓ delta.json written to current run
```

**Acceptance**: Delta computed correctly, trend is accurate

---

### AC5 — Golden Fixture Suite Runnable

**Test**: Workstream B fixtures execute deterministically.

```bash
Given: Fixture repos under src/test/fixtures/repos/*
When: FixtureSuite.runFixtures()
Then:
  ✓ simple-rest: 4 endpoints, 1 orphan detected
  ✓ dynamic-params: path variants normalize correctly
  ✓ mixed-patterns: middleware chains captured
```

**Acceptance**: All Workstream B tests execute and produce expected outputs

---

## PART 4: IMPLEMENTATION SEQUENCE (No Ambiguity)

### Phase 1: Foundation (Days 1-2)

**Day 1**: Implement RunContextService
- Track active run
- Resolve latest successful run
- Unit tests

**Day 2**: Implement ArtifactReader
- Load graph, report, diagrams, delta from disk
- Validate structure
- Unit tests

---

### Phase 2: UI Refactoring (Days 3-5)

**Day 3**: GapAnalysisProvider refactor
- Remove live scan
- Read graph.json
- Test with real fixtures

**Day 4**: ReportPanel refactor
- Remove sample data
- Read report.json
- Empty state when no artifacts

**Day 5**: DiagramUI refactor
- Remove diagram generation
- Render .mmd files
- Use diagrams.json index

---

### Phase 3: Chat Unification (Days 6-7)

**Day 6**: ChatOrchestrator + IntentRouter
- Implement intent detection
- Implement handlers (EXPLAIN, PLAN, GENERATE, etc.)
- Enforce response contract

**Day 7**: CommandInvoker + ChatPanel wiring
- Map intents to VS Code commands
- Wire ChatPanel to orchestrator (not direct Ollama)
- Test response contract

---

### Phase 4: Delta + Fixtures (Days 8-9)

**Day 8**: DeltaEngine
- Compare runs
- Generate delta.json
- Compute trend
- "Compare Runs" command

**Day 9**: Golden fixtures finalized
- Checked-in repos or deterministic generator
- Ensure Workstream B is runnable

---

### Phase 5: Integration + Testing (Days 10-12)

**Day 10**: End-to-end integration
- All modules working together
- RunContextService + panels + chat
- Manual testing

**Day 11**: Sprint 9 suite execution
- Run Workstream A (must pass)
- Run Workstream B (must pass)
- Run AC tests

**Day 12**: Polish + documentation
- Code review
- Edge case handling
- Final AC sign-off

---

## PART 5: ZERO DRIFT ENFORCEMENT

### Rule R1: Single Source of Truth

✅ **After Sprint 11**:
- One ChatOrchestrator (no ChatPanel→Ollama direct calls)
- One diagram rendering path (no two generators)
- All UI panels read `.reposense/` (no runtime recompute)

### Rule R2: Contract Enforcement

✅ **Every chat response must include**:
- `runId` (which analysis this refers to)
- `nodeLinks` (if gap/endpoint related)
- `suggestedActions` (≥1 always)

### Rule R3: Artifact-Driven UI

✅ **No UI can generate or recompute**:
- Do not call AnalysisEngine from UI
- Do not generate diagrams in render
- Do not sample default metrics

### Rule R4: Active Run Context

✅ **Every UI refresh must**:
- Get active runId from RunContextService
- Show empty state if runId is null
- Refresh when active run changes

---

## PART 6: SUCCESS METRICS

### Must-Have (Definition of Done)

✅ AC1: UI reads artifacts only  
✅ AC2: Run switching works  
✅ AC3: Chat responses validated (runId, links, actions)  
✅ AC4: Delta computed correctly  
✅ AC5: Workstream B executes  

### Nice-to-Have (Bonus)

⚡ Workstream C (UX) tests mostly passing  
⚡ "View Evidence" UI stub implemented  
⚡ Performance optimizations (caching)  

---

## PART 7: RISK MITIGATION

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Chat not unified** | Medium | High | Daily review of chat refactor |
| **UI still recomputes** | Medium | High | Grep codebase for AnalysisEngine calls in UI |
| **Fixtures not deterministic** | Low | Medium | Test fixtures twice, compare outputs |
| **Delta logic wrong** | Medium | Medium | Unit tests with known base/current pairs |
| **Scope creep** | High | High | Hard scope in this contract |

---

**Sprint 11 Build Contract: APPROVED**  
**Timeline**: 12 business days  
**Dependency**: Sprint 10 must be 100% complete  
**Success**: AC1-AC5 all passing, zero drift confirmed
