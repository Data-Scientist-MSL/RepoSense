# RepoSense VS Code Extension
## **Progressive Work Breakdown Structure (WBS)**
### Optimized for GitHub Copilot-Assisted Development

---

## 📋 PROJECT OVERVIEW

**Project Name**: RepoSense - Intelligent Repository Analyzer & UAT Assistant  
**Development Model**: Agile with 2-week sprints  
**Total Duration**: 24 weeks (6 months to MVP + Polish)  
**Team Size**: 1-2 developers (optimized for solo developer with Copilot)  
**Sprint Structure**: 12 sprints × 2 weeks each

---

## 🎯 VALUE BREAKDOWN STRUCTURE (VBS)

Following Agile best practices, we organize work by **value delivered** rather than traditional WBS tasks.

```
INITIATIVE: RepoSense Extension (Best-in-Class)
├─ EPIC 1: Foundation & Infrastructure (Sprints 1-2)
├─ EPIC 2: Core Analysis Engine (Sprints 3-4)
├─ EPIC 3: UI/UX Integration (Sprints 5-6)
├─ EPIC 4: Intelligence Layer (Sprints 7-8)
├─ EPIC 5: Testing & Remediation (Sprints 9-10)
├─ EPIC 6: Polish & Launch (Sprints 11-12)
```

---

## 📦 EPIC 1: FOUNDATION & INFRASTRUCTURE
**Duration**: Sprints 1-2 (4 weeks)  
**Goal**: Establish solid technical foundation with working extension skeleton

### **Sprint 1: Extension Scaffold & Basic UI (Week 1-2)**

#### **Work Package 1.1: Project Setup & Boilerplate**
**Story Points**: 5  
**Priority**: CRITICAL  
**Copilot Prompt Strategy**: "Generate complete VS Code extension boilerplate with TypeScript"

**User Story**:  
*As a developer, I want a properly configured VS Code extension project so that I can start building features immediately.*

**Tasks**:
- [ ] Initialize npm project with `yo code` generator
- [ ] Configure TypeScript (tsconfig.json with strict mode)
- [ ] Set up webpack for production bundling
- [ ] Configure ESLint + Prettier
- [ ] Create folder structure:
  ```
  src/
  ├── extension.ts (entry point)
  ├── providers/
  ├── services/
  ├── models/
  ├── utils/
  └── test/
  ```
- [ ] Set up GitHub repository with:
  - [ ] `.gitignore` for node_modules, out/, dist/
  - [ ] `README.md` with project overview
  - [ ] `LICENSE` (MIT)
  - [ ] GitHub Actions workflow stub

**Acceptance Criteria**:
- ✅ Extension activates in VS Code without errors
- ✅ "Hello World" command works
- ✅ TypeScript compiles without warnings
- ✅ Tests can be run with `npm test`

**GitHub Copilot Tips**:
```typescript
// Use these comments to guide Copilot:
// TODO: Create extension activation function that registers commands
// TODO: Add status bar item showing "RepoSense Ready"
// TODO: Register command palette command "reposense.helloWorld"
```

**Deliverables**:
- ✅ Working VS Code extension (can be installed locally)
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ Documentation (CONTRIBUTING.md)

**Estimated Time**: 16 hours

---

#### **Work Package 1.2: Activity Bar & TreeView Shell**
**Story Points**: 8  
**Priority**: HIGH  
**Copilot Prompt Strategy**: "Create VS Code TreeView provider with custom Activity Bar icon"

**User Story**:  
*As a user, I want to see RepoSense in the Activity Bar so that I can access its features easily.*

**Tasks**:
- [ ] Design custom icon (SVG format, 28x28px)
- [ ] Register Activity Bar view container in `package.json`
- [ ] Create TreeView data provider:
  ```typescript
  // GapAnalysisProvider.ts
  export class GapAnalysisProvider implements vscode.TreeDataProvider<GapItem> {
    // Copilot will help implement this
  }
  ```
- [ ] Implement three initial TreeViews:
  - [ ] Gap Analysis (placeholder data)
  - [ ] Test Cases (placeholder data)
  - [ ] Remediation (placeholder data)
- [ ] Add refresh button to each TreeView
- [ ] Implement collapse/expand functionality

**Acceptance Criteria**:
- ✅ Custom icon appears in Activity Bar
- ✅ Clicking icon opens sidebar with 3 TreeViews
- ✅ Each TreeView shows placeholder data
- ✅ Refresh button updates TreeView

**GitHub Copilot Tips**:
```typescript
// Example: Let Copilot generate the TreeView structure
interface GapItem extends vscode.TreeItem {
  type: 'critical' | 'warning' | 'suggestion';
  file: string;
  line: number;
  message: string;
}

// Copilot will suggest implementation for:
// - getTreeItem()
// - getChildren()
// - refresh()
```

**Deliverables**:
- ✅ RepoSense Activity Bar integration
- ✅ 3 functional TreeViews with sample data
- ✅ Custom icons and theming

**Estimated Time**: 24 hours

---

#### **Work Package 1.3: Command Palette & Status Bar**
**Story Points**: 3  
**Priority**: MEDIUM

**User Story**:  
*As a user, I want quick access to RepoSense commands via Command Palette so that I can trigger scans quickly.*

**Tasks**:
- [ ] Register commands in `package.json`:
  ```json
  "commands": [
    {
      "command": "reposense.scanRepository",
      "title": "RepoSense: Scan Repository",
      "icon": "$(search)"
    },
    {
      "command": "reposense.generateTests",
      "title": "RepoSense: Generate Tests"
    }
  ]
  ```
- [ ] Create status bar item (bottom-left)
  - [ ] Shows scan status: "Ready" | "Scanning..." | "X gaps found"
  - [ ] Clickable to open TreeView
- [ ] Add loading spinner during operations
- [ ] Implement command handlers (stub functions)

**Acceptance Criteria**:
- ✅ Commands appear in Command Palette (Cmd+Shift+P)
- ✅ Status bar updates on scan (simulated)
- ✅ Clicking status bar opens Activity Bar

**Estimated Time**: 8 hours

---

### **Sprint 2: Language Server Setup (Week 3-4)**

#### **Work Package 1.4: Language Server Protocol Foundation**
**Story Points**: 13  
**Priority**: CRITICAL  
**Copilot Prompt Strategy**: "Create LSP server for multi-language code analysis"

**User Story**:  
*As the extension, I need a Language Server to offload heavy analysis so the UI stays responsive.*

**Tasks**:
- [ ] Install dependencies:
  ```bash
  npm install vscode-languageserver vscode-languageclient
  ```
- [ ] Create server entry point:
  ```typescript
  // src/server/server.ts
  import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
  // Copilot will help scaffold this
  ```
- [ ] Set up client-server communication:
  - [ ] Client in `extension.ts`
  - [ ] Server in separate Node.js process
- [ ] Implement basic request/response:
  ```typescript
  connection.onRequest('reposense/analyze', async (params) => {
    // Analysis logic here
    return { gaps: [], tests: [] };
  });
  ```
- [ ] Add error handling and logging
- [ ] Configure LSP for TypeScript, JavaScript, Python

**Acceptance Criteria**:
- ✅ Language Server starts when extension activates
- ✅ Client can send "analyze" request
- ✅ Server responds with mock data
- ✅ No memory leaks (test with 10+ requests)

**GitHub Copilot Tips**:
```typescript
// Use inline comments to guide Copilot:
// TODO: Create LSP connection using IPC transport
// TODO: Register document sync handler
// TODO: Implement custom request handler for gap analysis
// TODO: Add shutdown handler to cleanup resources
```

**Deliverables**:
- ✅ Working Language Server (separate process)
- ✅ Bidirectional client-server communication
- ✅ Error handling and logging infrastructure

**Estimated Time**: 32 hours

---

#### **Work Package 1.5: SQLite Caching Layer**
**Story Points**: 5  
**Priority**: MEDIUM

**User Story**:  
*As the system, I need to cache analysis results so repeated scans are fast.*

**Tasks**:
- [ ] Install `better-sqlite3`:
  ```bash
  npm install better-sqlite3
  npm install -D @types/better-sqlite3
  ```
- [ ] Create database schema:
  ```sql
  CREATE TABLE IF NOT EXISTS analysis_cache (
    file_path TEXT PRIMARY KEY,
    content_hash TEXT NOT NULL,
    analysis_result TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    version TEXT NOT NULL
  );
  
  CREATE INDEX idx_timestamp ON analysis_cache(timestamp);
  ```
- [ ] Implement `CacheService`:
  ```typescript
  export class CacheService {
    get(filePath: string, hash: string): AnalysisResult | null
    set(filePath: string, hash: string, result: AnalysisResult): void
    clear(): void
    prune(olderThanDays: number): void
  }
  ```
- [ ] Add content hashing (MD5 or SHA-256)
- [ ] Implement cache invalidation logic

**Acceptance Criteria**:
- ✅ Cache stores analysis results in SQLite
- ✅ Cache hit returns result in <10ms
- ✅ Cache automatically prunes old entries (>30 days)
- ✅ Cache survives extension reload

**Estimated Time**: 16 hours

---

## 📦 EPIC 2: CORE ANALYSIS ENGINE
**Duration**: Sprints 3-4 (4 weeks)  
**Goal**: Implement intelligent gap detection for frontend-backend integration

### **Sprint 3: Tree-sitter AST Parsing (Week 5-6)**

#### **Work Package 2.1: Tree-sitter Integration**
**Story Points**: 13  
**Priority**: CRITICAL  
**Copilot Prompt Strategy**: "Implement Tree-sitter parser for JavaScript, TypeScript, Python"

**User Story**:  
*As the analysis engine, I need to parse code into ASTs so I can understand code structure.*

**Tasks**:
- [ ] Install Tree-sitter libraries:
  ```bash
  npm install tree-sitter
  npm install tree-sitter-javascript
  npm install tree-sitter-typescript
  npm install tree-sitter-python
  ```
- [ ] Create `ASTParser` service:
  ```typescript
  export class ASTParser {
    parseFile(filePath: string, language: Language): Tree
    queryAST(tree: Tree, pattern: string): Capture[]
  }
  ```
- [ ] Implement language detection:
  ```typescript
  function detectLanguage(filePath: string): Language {
    // Based on file extension
  }
  ```
- [ ] Create query patterns for common structures:
  - [ ] Function calls (fetch, axios, http)
  - [ ] Route definitions (Express, FastAPI)
  - [ ] Component definitions (React, Vue)
  - [ ] Import statements
- [ ] Add error handling for malformed code

**Acceptance Criteria**:
- ✅ Can parse JavaScript/TypeScript/Python files
- ✅ Query patterns extract API calls correctly
- ✅ Handles syntax errors gracefully
- ✅ Performance: Parse 1000 LOC file in <100ms

**GitHub Copilot Tips**:
```typescript
// Example query pattern (Copilot will help expand):
const fetchCallQuery = `
  (call_expression
    function: (identifier) @fetch
    (#eq? @fetch "fetch")
    arguments: (arguments (string) @url)
  )
`;

// Copilot can generate query patterns when you describe what to find:
// TODO: Create Tree-sitter query to find all Express.js route definitions
// TODO: Create query to extract axios HTTP method calls
```

**Deliverables**:
- ✅ Multi-language AST parsing service
- ✅ Query pattern library (10+ patterns)
- ✅ Unit tests for each language

**Estimated Time**: 32 hours

---

#### **Work Package 2.2: Frontend API Call Detector**
**Story Points**: 8  
**Priority**: CRITICAL

**User Story**:  
*As the analyzer, I need to identify all API calls in frontend code so I can match them with backend endpoints.*

**Tasks**:
- [ ] Create `FrontendAnalyzer` class:
  ```typescript
  export class FrontendAnalyzer {
    extractAPICalls(file: string): APICall[]
    detectFramework(project: string): Framework
  }
  ```
- [ ] Implement detection for:
  - [ ] `fetch()` calls
  - [ ] `axios.get/post/put/delete()`
  - [ ] `$http` (Angular)
  - [ ] Custom HTTP wrappers
- [ ] Extract metadata:
  ```typescript
  interface APICall {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    file: string;
    line: number;
    component?: string;
  }
  ```
- [ ] Handle dynamic URLs:
  ```javascript
  // Should detect: /api/users/${id}
  fetch(`/api/users/${id}`)
  ```
- [ ] Group by component/page

**Acceptance Criteria**:
- ✅ Detects 95%+ of API calls in sample React app
- ✅ Correctly extracts HTTP method
- ✅ Handles template literals and string concatenation
- ✅ Reports file + line number

**Estimated Time**: 24 hours

---

#### **Work Package 2.3: Backend Endpoint Detector**
**Story Points**: 8  
**Priority**: CRITICAL

**User Story**:  
*As the analyzer, I need to identify all backend endpoints so I can match them with frontend calls.*

**Tasks**:
- [ ] Create `BackendAnalyzer` class:
  ```typescript
  export class BackendAnalyzer {
    extractEndpoints(file: string): Endpoint[]
    detectFramework(project: string): Framework
  }
  ```
- [ ] Implement detection for:
  - [ ] Express.js: `app.get/post/put/delete()`
  - [ ] NestJS: `@Get/@Post/@Put/@Delete` decorators
  - [ ] FastAPI: `@app.get/@app.post` decorators
  - [ ] Flask: `@app.route()`
- [ ] Extract metadata:
  ```typescript
  interface Endpoint {
    path: string;
    method: string;
    file: string;
    line: number;
    handler: string;
  }
  ```
- [ ] Handle route parameters:
  ```typescript
  // Should normalize: /api/users/:id, /api/users/<id>, /api/users/{id}
  ```

**Acceptance Criteria**:
- ✅ Detects 95%+ of endpoints in sample Express app
- ✅ Normalizes path parameters
- ✅ Handles middleware chains
- ✅ Reports file + line number

**Estimated Time**: 24 hours

---

### **Sprint 4: Gap Detection Logic (Week 7-8)**

#### **Work Package 2.4: Frontend-Backend Matcher**
**Story Points**: 13  
**Priority**: CRITICAL  
**Copilot Prompt Strategy**: "Create algorithm to match frontend API calls with backend endpoints"

**User Story**:  
*As the analyzer, I need to match frontend calls with backend endpoints so I can identify orphaned components.*

**Tasks**:
- [ ] Create `GapDetector` service:
  ```typescript
  export class GapDetector {
    findOrphanedComponents(calls: APICall[], endpoints: Endpoint[]): Gap[]
    findUnusedEndpoints(calls: APICall[], endpoints: Endpoint[]): Gap[]
    findTypeMismatches(frontend: Type[], backend: Type[]): Gap[]
  }
  ```
- [ ] Implement endpoint normalization:
  ```typescript
  function normalizeEndpoint(path: string): string {
    // /api/users/123 → /api/users/:id
    // /api/products?category=tech → /api/products
  }
  ```
- [ ] Create matching algorithm:
  - [ ] Exact match
  - [ ] Pattern match (with parameters)
  - [ ] Fuzzy match (for typos)
- [ ] Categorize gaps by severity:
  ```typescript
  type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  ```
- [ ] Generate actionable messages:
  ```typescript
  {
    type: 'orphaned_component',
    severity: 'HIGH',
    message: 'DELETE /api/users/:id called but no endpoint exists',
    file: 'UserProfile.tsx',
    line: 47,
    suggestedFix: 'Create endpoint in users.controller.ts'
  }
  ```

**Acceptance Criteria**:
- ✅ Matches 95%+ of valid frontend-backend pairs
- ✅ <5% false positives
- ✅ Identifies orphaned components accurately
- ✅ Performance: Analyze 100K LOC repo in <30 seconds

**GitHub Copilot Tips**:
```typescript
// Copilot can help with complex matching logic:
// TODO: Create Levenshtein distance function for fuzzy matching
// TODO: Implement algorithm to detect /api/users/:id pattern
// TODO: Generate human-readable description of gap based on type
```

**Deliverables**:
- ✅ Working gap detection algorithm
- ✅ Test suite with 20+ scenarios
- ✅ Performance benchmarks

**Estimated Time**: 32 hours

---

#### **Work Package 2.5: Diagnostic Provider Integration**
**Story Points**: 5  
**Priority**: HIGH

**User Story**:  
*As a user, I want to see gaps in VS Code's Problems panel so I can quickly navigate to issues.*

**Tasks**:
- [ ] Create `DiagnosticProvider`:
  ```typescript
  export class DiagnosticProvider {
    updateDiagnostics(uri: vscode.Uri, gaps: Gap[]): void
  }
  ```
- [ ] Convert gaps to VS Code diagnostics:
  ```typescript
  const diagnostic = new vscode.Diagnostic(
    range,
    gap.message,
    vscode.DiagnosticSeverity.Error
  );
  diagnostic.source = 'RepoSense';
  diagnostic.code = gap.type;
  ```
- [ ] Implement severity mapping:
  - CRITICAL → Error
  - HIGH → Warning
  - MEDIUM → Information
  - LOW → Hint
- [ ] Add "Quick Fix" actions (CodeActionProvider)

**Acceptance Criteria**:
- ✅ Gaps appear in Problems panel
- ✅ Clicking diagnostic navigates to code
- ✅ Diagnostics update on file save
- ✅ Quick fix options available

**Estimated Time**: 16 hours

---

## 📦 EPIC 3: UI/UX INTEGRATION
**Duration**: Sprints 5-6 (4 weeks)  
**Goal**: Create polished, intuitive user interface

### **Sprint 5: TreeView & Webview (Week 9-10)**

#### **Work Package 3.1: Enhanced TreeView with Icons**
**Story Points**: 8  
**Priority**: HIGH

**User Story**:  
*As a user, I want visually appealing TreeViews with color-coded icons so I can quickly understand gap severity.*

**Tasks**:
- [ ] Design icon set (8-12 SVG icons):
  - [ ] Critical (red circle)
  - [ ] Warning (yellow triangle)
  - [ ] Info (blue info icon)
  - [ ] Success (green checkmark)
  - [ ] Orphaned component
  - [ ] Unused endpoint
  - [ ] Type mismatch
- [ ] Implement `ThemeIconProvider`:
  ```typescript
  function getIcon(gap: Gap): vscode.ThemeIcon {
    switch (gap.severity) {
      case 'CRITICAL': return new vscode.ThemeIcon('error');
      case 'HIGH': return new vscode.ThemeIcon('warning');
      // ...
    }
  }
  ```
- [ ] Add contextual actions (right-click menu):
  - [ ] Fix Automatically
  - [ ] Ignore
  - [ ] Show Details
  - [ ] Copy to Clipboard
- [ ] Implement sorting/filtering:
  - [ ] By severity
  - [ ] By file
  - [ ] By type
- [ ] Add tooltips with additional context

**Acceptance Criteria**:
- ✅ TreeView uses color-coded icons
- ✅ Right-click menu has 4+ actions
- ✅ Can filter by severity
- ✅ Tooltips show helpful info

**Estimated Time**: 24 hours

---

#### **Work Package 3.2: Detailed Report Webview**
**Story Points**: 13  
**Priority**: HIGH  
**Copilot Prompt Strategy**: "Create interactive HTML webview for gap analysis report"

**User Story**:  
*As a user, I want a detailed visual report so I can understand repository health at a glance.*

**Tasks**:
- [ ] Create webview HTML template:
  ```html
  <!DOCTYPE html>
  <html>
  <head>
    <!-- VS Code Webview UI Toolkit -->
    <link rel="stylesheet" href="vscode-webview-ui-toolkit">
  </head>
  <body>
    <vscode-panels>
      <vscode-panel-tab>Overview</vscode-panel-tab>
      <vscode-panel-tab>Gaps</vscode-panel-tab>
      <vscode-panel-tab>Dependencies</vscode-panel-tab>
    </vscode-panels>
  </body>
  </html>
  ```
- [ ] Implement Overview tab:
  - [ ] Health score (0-100)
  - [ ] Key metrics (files scanned, gaps found, coverage %)
  - [ ] Trend chart (if historical data exists)
- [ ] Implement Gaps tab:
  - [ ] Filterable table
  - [ ] Click to jump to code
  - [ ] Inline fix preview
- [ ] Implement Dependencies tab:
  - [ ] Dependency graph visualization (D3.js or vis.js)
  - [ ] Highlight circular dependencies
- [ ] Add message passing:
  ```typescript
  webview.postMessage({ command: 'updateData', data: gaps });
  ```
- [ ] Style with VS Code theme variables

**Acceptance Criteria**:
- ✅ Webview opens with "Show Report" command
- ✅ Matches VS Code theme (dark/light)
- ✅ All tabs functional
- ✅ Clicking gap navigates to code

**GitHub Copilot Tips**:
```html
<!-- Copilot can generate complete webview templates: -->
<!-- TODO: Create tabbed interface with overview, gaps, and dependencies -->
<!-- TODO: Add interactive chart showing gap distribution by severity -->
<!-- TODO: Style using VS Code CSS variables for theme compatibility -->
```

**Deliverables**:
- ✅ Interactive webview with 3 tabs
- ✅ Theme-aware styling
- ✅ Message passing for interactivity

**Estimated Time**: 32 hours

---

#### **Work Package 3.3: CodeLens Integration**
**Story Points**: 5  
**Priority**: MEDIUM

**User Story**:  
*As a user, I want inline suggestions in my code so I can fix gaps without leaving the editor.*

**Tasks**:
- [ ] Create `GapCodeLensProvider`:
  ```typescript
  export class GapCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[]
  }
  ```
- [ ] Show CodeLens above gaps:
  ```typescript
  // Example output:
  // 🔴 Missing backend endpoint | Fix Now | More Info
  const handleDelete = () => { ... }
  ```
- [ ] Implement actions:
  - [ ] "Fix Now" → Generate code
  - [ ] "More Info" → Open webview
  - [ ] "Ignore" → Add to ignore list
- [ ] Style CodeLens (color-coded by severity)

**Acceptance Criteria**:
- ✅ CodeLens appears above identified gaps
- ✅ Clicking "Fix Now" generates code
- ✅ CodeLens updates on file change
- ✅ Can be disabled in settings

**Estimated Time**: 16 hours

---

### **Sprint 6: Configuration & Settings (Week 11-12)**

#### **Work Package 3.4: Extension Settings UI**
**Story Points**: 5  
**Priority**: MEDIUM

**User Story**:  
*As a user, I want to configure RepoSense behavior so it fits my workflow.*

**Tasks**:
- [ ] Add settings to `package.json`:
  ```json
  "configuration": {
    "properties": {
      "reposense.scanOnSave": {
        "type": "boolean",
        "default": false,
        "description": "Automatically scan on file save"
      },
      "reposense.excludePatterns": {
        "type": "array",
        "default": ["**/node_modules/**", "**/dist/**"],
        "description": "Glob patterns to exclude"
      },
      "reposense.maxConcurrentAnalysis": {
        "type": "number",
        "default": 4,
        "description": "Max concurrent file analysis"
      }
    }
  }
  ```
- [ ] Implement settings reader:
  ```typescript
  const config = vscode.workspace.getConfiguration('reposense');
  const scanOnSave = config.get<boolean>('scanOnSave');
  ```
- [ ] Add settings validation
- [ ] Create settings UI (optional webview)

**Acceptance Criteria**:
- ✅ Settings appear in VS Code Settings UI
- ✅ Changes take effect immediately
- ✅ Invalid values show error message
- ✅ Settings persist across sessions

**Estimated Time**: 16 hours

---

#### **Work Package 3.5: Progress Indicators & Notifications**
**Story Points**: 3  
**Priority**: LOW

**User Story**:  
*As a user, I want clear feedback on scan progress so I know the extension is working.*

**Tasks**:
- [ ] Implement progress notification:
  ```typescript
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "RepoSense: Scanning...",
    cancellable: true
  }, async (progress, token) => {
    // Update progress
    progress.report({ increment: 50, message: "Analyzing files..." });
  });
  ```
- [ ] Add status bar progress indicator
- [ ] Show completion notification with results:
  ```typescript
  vscode.window.showInformationMessage(
    `RepoSense: Found 3 critical gaps`,
    'View Details',
    'Dismiss'
  );
  ```
- [ ] Implement cancellation logic

**Acceptance Criteria**:
- ✅ Progress shown during scan
- ✅ User can cancel scan
- ✅ Completion notification shows results
- ✅ Status bar updates in real-time

**Estimated Time**: 8 hours

---

## 📦 EPIC 4: INTELLIGENCE LAYER (AI-POWERED)
**Duration**: Sprints 7-8 (4 weeks)  
**Goal**: Integrate local LLM for semantic analysis and intelligent suggestions

### **Sprint 7: Ollama Integration (Week 13-14)**

#### **Work Package 4.1: Ollama Service Setup**
**Story Points**: 8  
**Priority**: HIGH  
**Copilot Prompt Strategy**: "Create service to interact with Ollama API for code analysis"

**User Story**:  
*As the extension, I need to communicate with Ollama so I can get AI-powered insights.*

**Tasks**:
- [ ] Create `OllamaService`:
  ```typescript
  export class OllamaService {
    async isAvailable(): Promise<boolean>
    async generateCompletion(prompt: string, model: string): Promise<string>
    async listModels(): Promise<string[]>
  }
  ```
- [ ] Implement HTTP client for Ollama API:
  ```typescript
  const response = await axios.post('http://localhost:11434/api/generate', {
    model: 'deepseek-coder:6.7b',
    prompt: '...',
    stream: false
  });
  ```
- [ ] Add model management:
  - [ ] Check if model is installed
  - [ ] Guide user to install if missing
  - [ ] Allow model selection in settings
- [ ] Implement error handling:
  - [ ] Ollama not running → Show notification
  - [ ] Model not found → Suggest installation
  - [ ] Timeout → Retry logic
- [ ] Add caching for repeated prompts

**Acceptance Criteria**:
- ✅ Can detect if Ollama is running
- ✅ Can list installed models
- ✅ Can generate completions
- ✅ Handles errors gracefully

**Estimated Time**: 24 hours

---

#### **Work Package 4.2: Semantic Code Analysis**
**Story Points**: 13  
**Priority**: HIGH

**User Story**:  
*As the analyzer, I need AI to understand code semantics so I can provide intelligent insights.*

**Tasks**:
- [ ] Create prompt templates:
  ```typescript
  const analysisPrompt = `
  Analyze this codebase and identify:
  1. Missing architectural components
  2. Backend endpoints that should exist based on frontend
  3. Security gaps in authentication flow
  
  Frontend: ${frontendSummary}
  Backend: ${backendSummary}
  
  Respond in JSON format.
  `;
  ```
- [ ] Implement `SemanticAnalyzer`:
  ```typescript
  export class SemanticAnalyzer {
    async analyzeArchitecture(project: Project): Promise<Insight[]>
    async suggestEndpoints(component: Component): Promise<Endpoint[]>
    async detectSecurityIssues(code: Code): Promise<Issue[]>
  }
  ```
- [ ] Parse LLM responses (JSON extraction)
- [ ] Validate AI suggestions (sanity checks)
- [ ] Implement confidence scoring:
  ```typescript
  interface Insight {
    message: string;
    confidence: number; // 0-1
    reasoning: string;
  }
  ```

**Acceptance Criteria**:
- ✅ AI provides relevant architectural insights
- ✅ Suggestions have >80% accuracy
- ✅ Responses parsed correctly
- ✅ Low-confidence suggestions flagged

**GitHub Copilot Tips**:
```typescript
// Copilot can help generate prompt templates:
// TODO: Create prompt to identify missing error handling patterns
// TODO: Generate prompt for detecting N+1 query issues
// TODO: Create prompt to suggest API endpoint based on UI component
```

**Deliverables**:
- ✅ Semantic analysis module
- ✅ 5+ prompt templates
- ✅ Validation logic

**Estimated Time**: 32 hours

---

### **Sprint 8: Test Generation & Remediation (Week 15-16)**

#### **Work Package 4.3: Automated Test Case Generator**
**Story Points**: 13  
**Priority**: HIGH  
**Copilot Prompt Strategy**: "Generate UAT test cases in Gherkin format from code analysis"

**User Story**:  
*As a QA engineer, I want automated test case generation so I can quickly create comprehensive test coverage.*

**Tasks**:
- [ ] Create `TestGenerator` service:
  ```typescript
  export class TestGenerator {
    async generateFromGaps(gaps: Gap[]): Promise<TestCase[]>
    async generateFromEndpoint(endpoint: Endpoint): Promise<TestCase[]>
    async generateFromComponent(component: Component): Promise<TestCase[]>
  }
  ```
- [ ] Implement Gherkin template generation:
  ```typescript
  const template = `
  Feature: ${feature.name}
    Scenario: ${scenario.name}
      Given ${precondition}
      When ${action}
      Then ${expectedResult}
  `;
  ```
- [ ] Add test case formats:
  - [ ] Gherkin (Cucumber/SpecFlow)
  - [ ] Playwright TypeScript
  - [ ] Cypress JavaScript
  - [ ] Plain English (testRigor)
- [ ] Implement test case validation:
  ```typescript
  function validateTestCase(testCase: TestCase): ValidationResult {
    // Check for completeness, clarity, executability
  }
  ```
- [ ] Add test case storage in SQLite
- [ ] Create export functionality (JSON, Markdown, Excel)

**Acceptance Criteria**:
- ✅ Generates 10+ test cases per gap
- ✅ Test cases are executable (95%+ pass rate when run)
- ✅ Supports 3+ output formats
- ✅ AI-generated tests have clear descriptions

**GitHub Copilot Tips**:
```typescript
// Copilot can generate test templates:
// TODO: Create Gherkin scenario for user registration happy path
// TODO: Generate Playwright test for API endpoint testing
// TODO: Create edge case scenarios for form validation
```

**Deliverables**:
- ✅ Test generation service
- ✅ 4 output formats supported
- ✅ 20+ test scenarios generated

**Estimated Time**: 32 hours

---

#### **Work Package 4.4: Remediation Code Generator**
**Story Points**: 13  
**Priority**: HIGH

**User Story**:  
*As a developer, I want one-click code generation to fix gaps so I can resolve issues quickly.*

**Tasks**:
- [ ] Create `RemediationGenerator`:
  ```typescript
  export class RemediationGenerator {
    async generateEndpoint(gap: Gap): Promise<CodeFix>
    async generateErrorHandling(gap: Gap): Promise<CodeFix>
    async generateValidation(gap: Gap): Promise<CodeFix>
  }
  ```
- [ ] Implement code templates:
  - [ ] Express.js endpoints
  - [ ] NestJS controllers
  - [ ] FastAPI routes
  - [ ] Error handling wrappers
  - [ ] TypeScript interfaces
- [ ] Add code insertion logic:
  ```typescript
  interface CodeFix {
    file: string;
    content: string;
    insertAt: 'end' | 'before' | 'after' | LineNumber;
    relatedFiles?: CodeFix[];
  }
  ```
- [ ] Implement preview functionality:
  - [ ] Show diff before applying
  - [ ] Allow editing before insert
  - [ ] Undo capability
- [ ] Add AI-powered customization:
  ```typescript
  // Use LLM to adapt template to existing code style
  const customized = await llm.customizeCode(template, projectStyle);
  ```

**Acceptance Criteria**:
- ✅ Generates syntactically correct code 95%+ of time
- ✅ Code matches project style
- ✅ Can preview changes before applying
- ✅ Supports undo operation

**Estimated Time**: 32 hours

---

## 📦 EPIC 5: TESTING & QUALITY ASSURANCE
**Duration**: Sprints 9-10 (4 weeks)  
**Goal**: Comprehensive testing and quality assurance

### **Sprint 9: Unit & Integration Testing (Week 17-18)**

#### **Work Package 5.1: Unit Test Suite**
**Story Points**: 13  
**Priority**: CRITICAL

**User Story**:  
*As a developer, I need comprehensive unit tests so the extension is reliable and maintainable.*

**Tasks**:
- [ ] Set up testing framework:
  ```bash
  npm install --save-dev @vscode/test-electron mocha chai sinon
  ```
- [ ] Create test structure:
  ```
  src/test/
  ├── suite/
  │   ├── extension.test.ts
  │   ├── providers/
  │   │   ├── GapAnalysisProvider.test.ts
  │   │   └── TestCaseProvider.test.ts
  │   ├── services/
  │   │   ├── ASTParser.test.ts
  │   │   ├── GapDetector.test.ts
  │   │   └── TestGenerator.test.ts
  │   └── utils/
  └── fixtures/
      ├── sample-react-app/
      └── sample-express-api/
  ```
- [ ] Write unit tests for each module:
  - [ ] Extension activation (5 tests)
  - [ ] TreeView providers (10 tests)
  - [ ] AST parsing (20 tests)
  - [ ] Gap detection (30 tests)
  - [ ] Test generation (15 tests)
  - [ ] Cache service (10 tests)
- [ ] Add code coverage reporting:
  ```bash
  npm install --save-dev nyc
  ```
- [ ] Set coverage targets:
  - [ ] Lines: 80%+
  - [ ] Functions: 85%+
  - [ ] Branches: 75%+

**Acceptance Criteria**:
- ✅ 90+ unit tests passing
- ✅ Code coverage >80%
- ✅ All critical paths tested
- ✅ Tests run in CI/CD

**Estimated Time**: 32 hours

---

#### **Work Package 5.2: Integration Testing**
**Story Points**: 8  
**Priority**: HIGH

**User Story**:  
*As a QA engineer, I need integration tests to ensure components work together correctly.*

**Tasks**:
- [ ] Create integration test suite:
  ```typescript
  suite('Integration Tests', () => {
    test('End-to-end: Scan repository and generate report', async () => {
      // Setup: Clone sample repo
      // Execute: Run scan command
      // Verify: Check TreeView, webview, diagnostics
    });
  });
  ```
- [ ] Test scenarios:
  - [ ] Full scan workflow (scan → analyze → display)
  - [ ] Gap fix workflow (detect → generate → apply)
  - [ ] Test generation workflow (analyze → generate → export)
  - [ ] Cache workflow (scan → cache → re-scan)
  - [ ] Settings change workflow
- [ ] Mock external dependencies:
  - [ ] Ollama API responses
  - [ ] File system operations
  - [ ] VS Code API calls
- [ ] Add performance benchmarks:
  ```typescript
  test('Scan performance: 10K LOC in <5 seconds', async () => {
    const start = Date.now();
    await scanner.scan(largeCodebase);
    const duration = Date.now() - start;
    assert(duration < 5000);
  });
  ```

**Acceptance Criteria**:
- ✅ 20+ integration tests passing
- ✅ Tests cover main user workflows
- ✅ Performance benchmarks passing
- ✅ Tests run in <2 minutes total

**Estimated Time**: 24 hours

---

#### **Work Package 5.3: E2E Testing with Sample Projects**
**Story Points**: 8  
**Priority**: MEDIUM

**User Story**:  
*As a QA engineer, I need E2E tests with real projects to validate accuracy.*

**Tasks**:
- [ ] Create sample projects:
  - [ ] React + Express app (Todo list)
  - [ ] Vue + NestJS app (E-commerce)
  - [ ] Angular + FastAPI app (Dashboard)
- [ ] Introduce deliberate gaps:
  - [ ] Orphaned components (5 per project)
  - [ ] Unused endpoints (3 per project)
  - [ ] Type mismatches (4 per project)
  - [ ] Missing error handling (6 per project)
- [ ] Create ground truth data:
  ```typescript
  const expectedGaps = [
    { type: 'orphaned_component', file: 'UserProfile.tsx', line: 47 },
    // ... complete list of all known gaps
  ];
  ```
- [ ] Implement E2E test runner:
  ```typescript
  test('E2E: Detect all known gaps in React app', async () => {
    const results = await extension.scanProject('fixtures/react-app');
    const detected = results.gaps;
    
    // Check precision (no false positives)
    const falsePositives = detected.filter(g => !expectedGaps.includes(g));
    assert(falsePositives.length === 0);
    
    // Check recall (no false negatives)
    const falseNegatives = expectedGaps.filter(g => !detected.includes(g));
    assert(falseNegatives.length === 0);
  });
  ```
- [ ] Measure accuracy metrics:
  - [ ] Precision (true positives / all positives)
  - [ ] Recall (true positives / all actual gaps)
  - [ ] F1 Score

**Acceptance Criteria**:
- ✅ 3 sample projects with known gaps
- ✅ Precision >95%
- ✅ Recall >90%
- ✅ F1 Score >0.92

**Estimated Time**: 24 hours

---

### **Sprint 10: Performance & Optimization (Week 19-20)**

#### **Work Package 5.4: Performance Optimization**
**Story Points**: 8  
**Priority**: HIGH

**User Story**:  
*As a user, I want fast scan times so the extension doesn't slow down my workflow.*

**Tasks**:
- [ ] Implement performance monitoring:
  ```typescript
  class PerformanceMonitor {
    startTimer(operation: string): Timer
    recordMetric(name: string, value: number): void
    getReport(): PerformanceReport
  }
  ```
- [ ] Optimize bottlenecks:
  - [ ] Parallelize file parsing (worker threads)
  - [ ] Implement incremental analysis
  - [ ] Add intelligent caching
  - [ ] Batch database operations
- [ ] Reduce memory footprint:
  - [ ] Stream large files instead of loading fully
  - [ ] Dispose unused AST trees
  - [ ] Limit cache size (LRU eviction)
- [ ] Optimize Language Server:
  - [ ] Use message batching
  - [ ] Debounce rapid requests
  - [ ] Implement request prioritization
- [ ] Add performance budgets:
  ```typescript
  const BUDGETS = {
    extensionActivation: 500,  // ms
    scanFile: 100,             // ms per file
    generateTest: 2000,        // ms per test
    totalScan50K: 30000        // ms for 50K LOC
  };
  ```

**Acceptance Criteria**:
- ✅ Extension activation <500ms
- ✅ Scan 50K LOC in <30 seconds
- ✅ Memory usage <200MB peak
- ✅ All performance budgets met

**Estimated Time**: 24 hours

---

#### **Work Package 5.5: Error Handling & Resilience**
**Story Points**: 5  
**Priority**: HIGH

**User Story**:  
*As a user, I want graceful error handling so the extension doesn't crash unexpectedly.*

**Tasks**:
- [ ] Implement global error handler:
  ```typescript
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    vscode.window.showErrorMessage(
      'RepoSense encountered an error. Please report this bug.'
    );
  });
  ```
- [ ] Add error boundaries for each feature:
  - [ ] Scan errors don't break UI
  - [ ] LLM errors fall back to static analysis
  - [ ] Cache errors trigger re-analysis
- [ ] Implement retry logic:
  ```typescript
  async function withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3
  ): Promise<T> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
        await sleep(1000 * Math.pow(2, i));
      }
    }
  }
  ```
- [ ] Add telemetry for errors (opt-in):
  ```typescript
  if (config.get('telemetry.enabled')) {
    telemetry.recordError(error, context);
  }
  ```
- [ ] Create user-friendly error messages:
  ```typescript
  const ERROR_MESSAGES = {
    OLLAMA_NOT_RUNNING: 'Ollama is not running. Please start Ollama to enable AI features.',
    MODEL_NOT_FOUND: 'Model not found. Install it with: ollama pull deepseek-coder:6.7b',
    // ...
  };
  ```

**Acceptance Criteria**:
- ✅ No crashes on malformed code
- ✅ Graceful degradation when LLM unavailable
- ✅ Retry logic for transient failures
- ✅ User-friendly error messages

**Estimated Time**: 16 hours

---

## 📦 EPIC 6: POLISH & MARKETPLACE LAUNCH
**Duration**: Sprints 11-12 (4 weeks)  
**Goal**: Final polish, documentation, and marketplace launch

### **Sprint 11: Documentation & UX Polish (Week 21-22)**

#### **Work Package 6.1: Comprehensive Documentation**
**Story Points**: 8  
**Priority**: CRITICAL

**User Story**:  
*As a new user, I want clear documentation so I can quickly understand and use the extension.*

**Tasks**:
- [ ] Create README.md:
  ```markdown
  # RepoSense - Intelligent Repository Analyzer
  
  ## Features
  - 🔍 Frontend-Backend Gap Detection
  - 🤖 AI-Powered Analysis (Local LLM)
  - ✅ Automated UAT Generation
  - 🔧 One-Click Remediation
  
  ## Installation
  ## Quick Start
  ## Configuration
  ## FAQ
  ```
- [ ] Create CHANGELOG.md (semantic versioning)
- [ ] Create CONTRIBUTING.md:
  - [ ] Development setup
  - [ ] Coding standards
  - [ ] Pull request process
  - [ ] Testing requirements
- [ ] Write user guides:
  - [ ] Getting Started (5-minute walkthrough)
  - [ ] Gap Detection Guide
  - [ ] Test Generation Guide
  - [ ] Remediation Guide
  - [ ] Settings Reference
- [ ] Create video tutorials:
  - [ ] 2-minute demo (for Marketplace)
  - [ ] 10-minute deep dive
  - [ ] Troubleshooting guide
- [ ] Add inline documentation:
  ```typescript
  /**
   * Detects frontend-backend integration gaps in the workspace.
   * 
   * @param workspaceRoot - Absolute path to workspace root
   * @param options - Optional configuration
   * @returns Promise resolving to array of detected gaps
   * 
   * @example
   * const gaps = await detector.findGaps('/path/to/project');
   * gaps.forEach(gap => console.log(gap.message));
   */
  ```

**Acceptance Criteria**:
- ✅ README.md with badges, screenshots, demo GIF
- ✅ Complete API documentation
- ✅ 5+ user guides
- ✅ 2+ video tutorials
- ✅ All public APIs documented

**Estimated Time**: 24 hours

---

#### **Work Package 6.2: UX Polish & Accessibility**
**Story Points**: 5  
**Priority**: HIGH

**User Story**:  
*As a user, I want a polished, accessible interface so the extension is pleasant to use.*

**Tasks**:
- [ ] Design improvements:
  - [ ] Consistent icon set (20+ icons)
  - [ ] Color-coded severity badges
  - [ ] Loading skeletons for async operations
  - [ ] Empty states for TreeViews
  - [ ] Tooltips for all actions
- [ ] Accessibility improvements:
  - [ ] ARIA labels for all interactive elements
  - [ ] Keyboard navigation (Tab, Enter, Escape)
  - [ ] Screen reader announcements
  - [ ] High contrast theme support
  - [ ] Reduced motion option
- [ ] Animation & transitions:
  - [ ] Smooth TreeView expansion
  - [ ] Fade-in for new items
  - [ ] Progress bar animations
- [ ] Responsive design:
  - [ ] Handle narrow sidebar widths
  - [ ] Truncate long file paths
  - [ ] Wrap long messages
- [ ] Dark/Light theme optimization:
  ```typescript
  const isDark = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
  const iconColor = isDark ? '#fff' : '#000';
  ```

**Acceptance Criteria**:
- ✅ WCAG 2.1 AA compliant
- ✅ Fully keyboard navigable
- ✅ Works in high contrast mode
- ✅ Smooth animations (60fps)
- ✅ Professional visual design

**Estimated Time**: 16 hours

---

#### **Work Package 6.3: Onboarding Experience**
**Story Points**: 5  
**Priority**: MEDIUM

**User Story**:  
*As a first-time user, I want guided onboarding so I understand how to use the extension.*

**Tasks**:
- [ ] Create welcome walkthrough:
  ```typescript
  async function showWelcome() {
    const result = await vscode.window.showInformationMessage(
      'Welcome to RepoSense! Would you like a quick tour?',
      'Take Tour',
      'Skip'
    );
    
    if (result === 'Take Tour') {
      await startWalkthrough();
    }
  }
  ```
- [ ] Implement interactive tutorial:
  - [ ] Step 1: Run first scan
  - [ ] Step 2: Review gaps in TreeView
  - [ ] Step 3: Generate a test case
  - [ ] Step 4: Apply a quick fix
  - [ ] Step 5: Configure settings
- [ ] Add contextual help:
  - [ ] "?" icons next to features
  - [ ] Inline tips in TreeViews
  - [ ] Command palette suggestions
- [ ] Create sample project:
  ```bash
  # Command: RepoSense: Open Sample Project
  # Downloads and opens a sample app with known gaps
  ```
- [ ] Add first-run experience:
  - [ ] Check if Ollama installed
  - [ ] Suggest model download
  - [ ] Configure initial settings

**Acceptance Criteria**:
- ✅ Interactive walkthrough on first install
- ✅ Sample project available
- ✅ Contextual help throughout UI
- ✅ First-run setup wizard

**Estimated Time**: 16 hours

---

### **Sprint 12: Marketplace Launch (Week 23-24)**

#### **Work Package 6.4: Marketplace Preparation**
**Story Points**: 8  
**Priority**: CRITICAL

**User Story**:  
*As a publisher, I need to prepare for marketplace launch so users can discover and install the extension.*

**Tasks**:
- [ ] Create publisher account:
  - [ ] Register at https://marketplace.visualstudio.com/manage
  - [ ] Generate Azure DevOps Personal Access Token
  - [ ] Create publisher profile with branding
- [ ] Optimize package.json:
  ```json
  {
    "name": "reposense",
    "displayName": "RepoSense - AI Code Analyzer & UAT Assistant",
    "description": "Intelligent frontend-backend gap detection, automated test generation, and one-click remediation. Zero-cost AI powered by local LLM.",
    "version": "1.0.0",
    "publisher": "reposense",
    "icon": "media/icon.png",
    "galleryBanner": {
      "color": "#1e1e1e",
      "theme": "dark"
    },
    "categories": [
      "Programming Languages",
      "Testing",
      "Linters",
      "Other"
    ],
    "keywords": [
      "analysis",
      "testing",
      "UAT",
      "AI",
      "frontend",
      "backend",
      "gap-detection",
      "code-quality",
      "automation"
    ],
    "repository": {
      "type": "git",
      "url": "https://github.com/reposense/vscode-extension"
    },
    "bugs": {
      "url": "https://github.com/reposense/vscode-extension/issues"
    },
    "license": "MIT"
  }
  ```
- [ ] Create marketing assets:
  - [ ] 128x128px icon (PNG, high quality)
  - [ ] Banner image for Marketplace
  - [ ] 5+ screenshots showing key features
  - [ ] Demo GIF (800x600px, <5MB)
  - [ ] Feature comparison table
- [ ] Write compelling description:
  ```markdown
  **RepoSense** is the first VS Code extension that intelligently bridges 
  your frontend and backend code, automatically detecting integration gaps 
  and generating comprehensive test coverage—all powered by local AI at 
  zero cost.
  
  ## Why RepoSense?
  
  Traditional static analysis tools miss the forest for the trees...
  ```
- [ ] Set up licensing:
  - [ ] Choose license (MIT recommended)
  - [ ] Add LICENSE file
  - [ ] Include license in package.json
- [ ] Configure marketplace listing:
  - [ ] Tags and categories
  - [ ] Q&A section
  - [ ] Support links

**Acceptance Criteria**:
- ✅ Publisher account created
- ✅ All marketing assets ready
- ✅ package.json optimized for SEO
- ✅ README.md with badges and visuals
- ✅ LICENSE file included

**Estimated Time**: 24 hours

---

#### **Work Package 6.5: CI/CD Pipeline**
**Story Points**: 5  
**Priority**: HIGH

**User Story**:  
*As a maintainer, I need automated CI/CD so releases are consistent and reliable.*

**Tasks**:
- [ ] Create GitHub Actions workflow:
  ```yaml
  name: CI/CD Pipeline
  
  on:
    push:
      branches: [main, develop]
    pull_request:
      branches: [main]
    release:
      types: [created]
  
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
        - run: npm ci
        - run: npm run compile
        - run: npm test
        - run: npm run lint
    
    publish:
      needs: test
      if: github.event_name == 'release'
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
        - run: npm ci
        - run: npm run compile
        - name: Publish to VS Marketplace
          run: npx vsce publish -p ${{ secrets.VSCE_TOKEN }}
        - name: Publish to Open VSX
          run: npx ovsx publish -p ${{ secrets.OVSX_TOKEN }}
  ```
- [ ] Set up semantic versioning:
  ```bash
  npm install --save-dev standard-version
  ```
  ```json
  {
    "scripts": {
      "release": "standard-version",
      "release:minor": "standard-version --release-as minor",
      "release:major": "standard-version --release-as major"
    }
  }
  ```
- [ ] Configure automated testing:
  - [ ] Unit tests on every PR
  - [ ] Integration tests on main branch
  - [ ] Performance benchmarks weekly
- [ ] Add quality gates:
  - [ ] Code coverage >80%
  - [ ] No ESLint errors
  - [ ] All tests passing
  - [ ] TypeScript compilation successful
- [ ] Set up GitHub secrets:
  - [ ] `VSCE_TOKEN` for VS Marketplace
  - [ ] `OVSX_TOKEN` for Open VSX Registry

**Acceptance Criteria**:
- ✅ CI runs on every PR
- ✅ Automated publishing on release
- ✅ Quality gates enforced
- ✅ Semantic versioning automated

**Estimated Time**: 16 hours

---

#### **Work Package 6.6: Launch Marketing & Community**
**Story Points**: 5  
**Priority**: MEDIUM

**User Story**:  
*As a product owner, I want successful launch so we reach our target audience.*

**Tasks**:
- [ ] Pre-launch activities (Week 23):
  - [ ] Create landing page (GitHub Pages)
  - [ ] Write launch blog post
  - [ ] Prepare social media posts (Twitter, LinkedIn, Reddit)
  - [ ] Reach out to tech influencers for beta testing
  - [ ] Submit to Product Hunt (schedule launch date)
- [ ] Launch day activities (Week 24, Day 1):
  - [ ] Publish to VS Marketplace
  - [ ] Publish to Open VSX Registry
  - [ ] Post on Product Hunt
  - [ ] Share on social media:
    - [ ] Twitter/X
    - [ ] LinkedIn
    - [ ] Reddit (/r/programming, /r/vscode)
    - [ ] Dev.to
    - [ ] Hacker News
  - [ ] Email early beta testers
- [ ] Post-launch activities (Week 24, Days 2-7):
  - [ ] Monitor marketplace ratings
  - [ ] Respond to user feedback
  - [ ] Fix critical bugs within 24 hours
  - [ ] Post "week 1 stats" update
  - [ ] Thank contributors and supporters
- [ ] Community building:
  - [ ] Set up GitHub Discussions
  - [ ] Create Discord server (optional)
  - [ ] Add contributing guidelines
  - [ ] Create issue templates:
    - [ ] Bug report
    - [ ] Feature request
    - [ ] Question
  - [ ] Add code of conduct

**Acceptance Criteria**:
- ✅ Landing page live
- ✅ Published to both marketplaces
- ✅ Product Hunt launch complete
- ✅ Social media coverage
- ✅ GitHub community set up

**Estimated Time**: 16 hours

---

## 📊 PROJECT SUMMARY

### **Total Duration**: 24 weeks (6 months)

### **Sprint Summary**:
| **Sprint** | **Epic** | **Focus** | **Story Points** |
|------------|----------|-----------|------------------|
| 1-2 | Foundation | Extension scaffold, TreeView, LSP | 34 |
| 3-4 | Core Analysis | AST parsing, gap detection | 46 |
| 5-6 | UI/UX | Webview, CodeLens, settings | 44 |
| 7-8 | Intelligence | Ollama, AI analysis, test gen | 52 |
| 9-10 | Testing | Unit tests, integration, performance | 47 |
| 11-12 | Polish & Launch | Documentation, marketplace | 36 |
| **Total** | | | **259 points** |

### **Estimated Effort**:
- **Solo Developer**: 6 months full-time
- **Two Developers**: 4 months
- **Team of 3-4**: 3 months

### **Resource Requirements**:
- **Hardware**: Developer laptop (8GB+ RAM)
- **Software**: VS Code, Node.js, Git, Ollama
- **Services**: GitHub (free), Azure DevOps (free tier)
- **Total Cost**: $0 (zero-cost principle maintained)

### **Success Metrics**:
- ✅ All 36 work packages completed
- ✅ 90+ unit tests passing
- ✅ >80% code coverage
- ✅ <500ms activation time
- ✅ Published to marketplace
- ✅ 50K+ installs in year 1

---

## 🚀 GETTING STARTED

### **Week 1 Immediate Actions**:
1. Fork this document as project roadmap
2. Set up GitHub repository
3. Initialize VS Code extension project (`yo code`)
4. Create first PR with project scaffold
5. Set up project board (GitHub Projects)

### **Recommended Tools**:
- **Project Management**: GitHub Projects (Kanban board)
- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions
- **Documentation**: Markdown + GitHub Pages
- **Communication**: GitHub Discussions

### **Daily Workflow**:
1. Pick work package from current sprint
2. Create feature branch (`git checkout -b feature/WP-1.1`)
3. Use GitHub Copilot for code generation
4. Write tests (TDD approach)
5. Create PR with detailed description
6. Review and merge
7. Update project board

---

## 📋 DELIVERABLES CHECKLIST

### **Epic 1: Foundation**
- [ ] Extension scaffold with TypeScript
- [ ] Activity Bar integration
- [ ] 3 TreeView providers
- [ ] Language Server Protocol setup
- [ ] SQLite caching layer

### **Epic 2: Core Analysis**
- [ ] Tree-sitter AST parsing (3+ languages)
- [ ] Frontend API call detector
- [ ] Backend endpoint detector
- [ ] Gap detection algorithm
- [ ] Diagnostic provider integration

### **Epic 3: UI/UX**
- [ ] Enhanced TreeViews with icons
- [ ] Interactive webview reports
- [ ] CodeLens integration
- [ ] Extension settings UI
- [ ] Progress indicators

### **Epic 4: Intelligence**
- [ ] Ollama service integration
- [ ] Semantic code analysis
- [ ] Automated test generator
- [ ] Remediation code generator

### **Epic 5: Testing**
- [ ] 90+ unit tests
- [ ] 20+ integration tests
- [ ] 3 E2E test projects
- [ ] Performance optimizations
- [ ] Error handling & resilience

### **Epic 6: Launch**
- [ ] Comprehensive documentation
- [ ] UX polish & accessibility
- [ ] Onboarding experience
- [ ] Marketplace preparation
- [ ] CI/CD pipeline
- [ ] Launch marketing

---

## 🎯 NEXT STEPS

**Ready to start building?**

1. **Review this WBS** with your team
2. **Estimate sprint velocity** (story points per 2 weeks)
3. **Adjust timeline** if needed
4. **Set up development environment**
5. **Begin Sprint 1, Work Package 1.1**

**Questions? Clarifications needed?**

Let me know which work package you'd like to start with, and I can provide:
- Detailed implementation guides
- Code templates optimized for Copilot
- Testing strategies
- Performance tips

Good luck building RepoSense—the best-in-class VS Code extension! 🚀