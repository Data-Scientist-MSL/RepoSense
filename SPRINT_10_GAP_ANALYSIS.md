# Sprint 10: Gap Analysis - What's Real vs. What Needs Building

**Date**: January 21, 2026  
**Status**: ✅ ANALYSIS PHASE (No implementation)  
**Objective**: Identify gaps between Sprint 1-9 verification plan and actual implementation

---

## EXECUTIVE SUMMARY

The Sprint 9 verification plan describes a comprehensive 100+ feature platform. However, **the actual implementation is much more foundational**. This gap analysis identifies what's real, what's documented but not built, and what needs to be prioritized for Sprint 10+.

### Reality Check
- **What EXISTS**: Service interfaces, schemas, test frameworks (1,460 LOC)
- **What's DOCUMENTED**: Complete feature specs (2,890 LOC of design)
- **What's MISSING**: 90% of UI integration, most advanced analysis features, many user-facing capabilities

---

## PART 1: VERIFICATION AGAINST ACTUAL CODEBASE

### Sprint 1-3: Foundation (Claimed Complete)

#### ✅ BUILT: Run Orchestrator System
- [x] RunOrchestrator interface defined
- [x] RunRepository placeholder
- [x] Meta.json schema specified
- [x] State timeline concept documented
- **Reality**: Schema defined, not fully integrated into UI

**Gap Level**: 40% implemented (interfaces exist, integration missing)

#### ✅ BUILT: Graph Model
- [x] RunGraphBuilder service created
- [x] Node/Edge schemas defined
- [x] Stable ID generation conceptualized
- [x] Graph consistency tests written
- **Reality**: Model designed, scanners not implemented

**Gap Level**: 30% implemented (schemas solid, analysis engines missing)

#### ✅ BUILT: Report Generator
- [x] ReportGenerator service interfaces
- [x] Report JSON schema
- [x] HTML/MD rendering templates
- [x] Consistency validation tests
- **Reality**: Template structure exists, actual rendering missing

**Gap Level**: 35% implemented (output format defined, no content generation)

---

### Sprint 4-6: Features (Claimed Complete)

#### ⚠️ PARTIAL: Diagram Generator
- [x] DiagramGeneratorNew.ts created (300 LOC)
- [x] Mermaid generation logic outlined
- [x] Click-to-code linking specified
- ❌ Actual Mermaid rendering: NOT IMPLEMENTED
- ❌ SVG export: NOT IMPLEMENTED
- ❌ Interactive diagrams: NOT IMPLEMENTED

**Gap Level**: 25% implemented (structure exists, rendering missing)

---

#### ⚠️ PARTIAL: Evidence Service
- [x] EvidenceServiceNew.ts created (265 LOC)
- [x] Evidence indexing schema
- [x] Artifact path management
- ❌ Screenshot capture: NOT IMPLEMENTED
- ❌ Log collection: NOT IMPLEMENTED
- ❌ Video recording: NOT IMPLEMENTED
- ❌ Evidence gallery UI: NOT IMPLEMENTED

**Gap Level**: 30% implemented (indexing exists, capture missing)

---

#### ⚠️ PARTIAL: ChatBot Service
- [x] ChatBotServiceNew.ts created (369 LOC)
- [x] Intent types defined
- [x] Response schema
- ❌ Claude/LLM integration: NOT IMPLEMENTED
- ❌ Chat webview UI: NOT IMPLEMENTED
- ❌ Context awareness: NOT IMPLEMENTED
- ❌ Action invocation: NOT IMPLEMENTED

**Gap Level**: 20% implemented (intent structure exists, UI and LLM missing)

---

### Sprint 7-8: Production (Claimed Complete)

#### ⚠️ PARTIAL: Performance Optimizer
- [x] PerformanceOptimizerNew.ts created (453 LOC)
- [x] Caching interface with TTL
- [x] Lazy loading generator
- [x] Worker pool conceptualized
- ❌ Cache integration: NOT IMPLEMENTED
- ❌ Lazy load wiring: NOT IMPLEMENTED
- ❌ Worker pool: NOT IMPLEMENTED
- ❌ Performance monitoring: NOT IMPLEMENTED

**Gap Level**: 40% implemented (interfaces exist, execution missing)

---

#### ⚠️ PARTIAL: Production Hardening
- [x] ProductionHardeningNew.ts created (544 LOC)
- [x] Error recovery strategies
- [x] Circuit breaker pattern
- [x] Rate limiting tiers
- ❌ Error handling integration: NOT IMPLEMENTED
- ❌ Health checks wiring: NOT IMPLEMENTED
- ❌ Rate limiting enforcement: NOT IMPLEMENTED
- ❌ Deployment validation: NOT IMPLEMENTED

**Gap Level**: 35% implemented (patterns defined, integration missing)

---

### Sprint 9: Verification (Claimed Complete)

#### ✅ BUILT: Contract Validation Tool
- [x] RunValidatorNew.ts created (303 LOC)
- [x] Schema validation methods
- [x] Cross-reference checking
- [x] Error reporting
- **Status**: Designed, not integrated into CLI

**Gap Level**: 50% implemented (logic exists, CLI wrapper missing)

---

#### ✅ BUILT: Test Suite
- [x] sprint-9.verification.test.ts created (463 LOC)
- [x] 49+ test cases written
- [x] Acceptance criteria defined
- ❌ Tests can't run (dependencies missing)
- ❌ Fixtures not populated (no actual repos)
- ❌ Golden run suite not created

**Gap Level**: 60% implemented (test structures exist, fixtures missing)

---

#### ✅ BUILT: Documentation
- [x] Specifications written
- [x] Verification plan detailed
- [x] UX checklist created
- [x] Project status documented
- ❌ Actual implementation to test against: NOT THERE

**Gap Level**: 100% documented (no underlying implementation to verify)

---

## PART 2: FEATURE-BY-FEATURE GAP ANALYSIS

### Tier 1: Critical Path (Must Have for MVP)

#### Feature 1: Scan & Parse Source Code
**Claimed in**: Sprint 1-2  
**Actual Status**: ❌ NOT IMPLEMENTED

**What Exists**:
- `RunGraphBuilder` class with empty methods
- Graph schema defined
- Test cases outline expected behavior

**What's Missing**:
1. **AST Parsers** (0 LOC)
   - TypeScript parser integration
   - JavaScript parser
   - Python parser
   - Multi-language support

2. **Pattern Detectors** (0 LOC)
   - API call detection (fetch, axios, etc)
   - Route definition detection
   - Path extraction and normalization

3. **Confidence Scoring** (0 LOC)
   - Match quality metrics
   - False positive detection

**Effort**: 4-6 weeks (large complexity)  
**Blocker**: Without this, entire system non-functional

---

#### Feature 2: UI - Activity Bar & Sidebar
**Claimed in**: Sprint 1-9  
**Actual Status**: ❌ NOT IMPLEMENTED

**What Exists**:
- Types for sidebar views
- Command definitions
- Error handlers

**What's Missing**:
1. **Webview Components** (0 LOC)
   - React components for panels
   - Tree view for API health
   - Test explorer
   - Evidence gallery

2. **Event Handlers** (0 LOC)
   - Click to jump to source
   - Context menus
   - Drag/drop
   - Filtering/search

3. **Styling** (0 LOC)
   - CSS for dark/light theme
   - Icons and badges
   - Responsive layout

**Effort**: 3-4 weeks (moderate complexity)  
**Blocker**: Users can't interact with system without this

---

#### Feature 3: Report Generation & Display
**Claimed in**: Sprint 3  
**Actual Status**: ⚠️ 30% IMPLEMENTED

**What Exists**:
- Report JSON schema
- Report renderer templates

**What's Missing**:
1. **Report Content Generation** (0 LOC)
   - Calculate totals from graph
   - Categorize gaps by severity
   - Generate coverage metrics
   - Create trends

2. **HTML Rendering** (0 LOC)
   - Dynamic HTML generation
   - Interactive tables/charts
   - Click handlers

3. **Export Formats** (0 LOC)
   - PDF generation
   - Markdown rendering
   - ZIP bundling

**Effort**: 2-3 weeks (straightforward)  
**Dependency**: Requires working graph + scanning

---

#### Feature 4: ChatBot Backend Integration
**Claimed in**: Sprint 6  
**Actual Status**: ⚠️ 15% IMPLEMENTED

**What Exists**:
- Intent types defined
- Response schema
- Context structure

**What's Missing**:
1. **LLM Integration** (0 LOC)
   - Claude API calls
   - Prompt engineering
   - Token counting
   - Rate limiting

2. **Chat UI** (0 LOC)
   - Webview chat interface
   - Message display
   - Input handling
   - Suggested actions

3. **Action Execution** (0 LOC)
   - Map chat actions to commands
   - Context passing
   - Result capture

**Effort**: 2-3 weeks (Claude API straightforward)  
**Dependency**: Requires graph and report data

---

#### Feature 5: Test Generation
**Claimed in**: Sprint 5-7  
**Actual Status**: ❌ NOT IMPLEMENTED

**What Exists**:
- Test generation request interface
- Test output schema

**What's Missing**:
1. **Template Engine** (0 LOC)
   - CRUD test generation
   - Validation test generation
   - Error case generation

2. **AI Generation** (0 LOC)
   - Claude API integration
   - Prompt design
   - Test parsing

3. **Safe Apply** (0 LOC)
   - Diff generation
   - Preview UI
   - Atomic application
   - Rollback

**Effort**: 3-4 weeks (complex logic)  
**Dependency**: Requires working graph

---

### Tier 2: Advanced Features (Nice to Have)

#### Feature 6: Diagram Generation & Export
**Claimed in**: Sprint 4  
**Actual Status**: ⚠️ 25% IMPLEMENTED

**What's Missing**:
- Mermaid rendering engine
- SVG export
- Interactive elements
- Performance optimization

**Effort**: 1-2 weeks  
**Dependency**: Requires graph

---

#### Feature 7: Evidence Collection & Display
**Claimed in**: Sprint 5  
**Actual Status**: ⚠️ 20% IMPLEMENTED

**What's Missing**:
- Screenshot capture (Playwright)
- Log collection
- Coverage integration
- Evidence gallery UI

**Effort**: 2-3 weeks  
**Dependency**: Test executor must work first

---

#### Feature 8: Security Analysis
**Claimed in**: Feature List  
**Actual Status**: ❌ 0% IMPLEMENTED

**What's Missing**:
- Taint analysis engine
- Security pattern database
- Vulnerability detection
- Recommendation generation

**Effort**: 3-4 weeks  
**Complexity**: High (data flow analysis)

---

#### Feature 9: Mutation Testing
**Claimed in**: Feature List  
**Actual Status**: ❌ 0% IMPLEMENTED

**What's Missing**:
- Mutation generator
- Test runner integration
- Mutation score calculation
- Weak test identification

**Effort**: 2-3 weeks  
**Complexity**: Moderate

---

#### Feature 10: Symbolic Execution
**Claimed in**: Feature List  
**Actual Status**: ❌ 0% IMPLEMENTED

**What's Missing**:
- Symbolic engine
- Path exploration
- Input generation
- Coverage calculation

**Effort**: 4-6 weeks  
**Complexity**: Very High

---

### Tier 3: Enterprise Features (Aspirational)

#### Feature 11: Multi-Repo Analysis
- ❌ NOT STARTED
- Effort: 2-3 weeks
- Complexity: Moderate

#### Feature 12: Compliance Reporting
- ❌ NOT STARTED
- Effort: 2-3 weeks
- Complexity: Low

#### Feature 13: CI/CD Integration
- ⚠️ 20% STARTED
- Effort: 1-2 weeks
- Complexity: Low

#### Feature 14: JetBrains Plugin
- ❌ NOT STARTED
- Effort: 3-4 weeks
- Complexity: Moderate

#### Feature 15: Performance Profiling
- ❌ NOT STARTED
- Effort: 2-3 weeks
- Complexity: High

---

## PART 3: CRITICAL MISSING INFRASTRUCTURE

### A. Language Parsers
**Status**: ❌ NOT IMPLEMENTED
**Components Missing**:
- TypeScript/JavaScript parser
- Python parser
- Java parser
- C# parser

**Impact**: System cannot scan any code  
**Effort**: 2-3 weeks total  
**Dependencies**: External (use existing libraries)

### B. VS Code Extension API Integration
**Status**: ⚠️ 30% IMPLEMENTED
**Components Missing**:
- Activation events
- Command handlers
- File watchers
- Decoration providers
- Webview hosting

**Impact**: UI non-functional  
**Effort**: 2-3 weeks  
**Dependencies**: None

### C. Backend Server Infrastructure
**Status**: ❌ NOT IMPLEMENTED
**Components Missing**:
- Express server setup
- Request routing
- Session management
- Authentication (if needed)
- Error handling middleware

**Impact**: Cannot process requests from extension  
**Effort**: 1 week  
**Dependencies**: None

### D. Database/Storage Layer
**Status**: ❌ NOT IMPLEMENTED
**Components Missing**:
- Run metadata storage
- Graph persistence
- Report caching
- Evidence storage

**Impact**: Data lost on restart  
**Effort**: 1 week (if using filesystem)  
**Dependencies**: None (can use .reposense folder)

### E. Test Executor Engine
**Status**: ❌ NOT IMPLEMENTED
**Components Missing**:
- Jest integration
- Pytest integration
- Mocha integration
- Test runner orchestration
- Coverage collector

**Impact**: Cannot run/capture tests  
**Effort**: 2-3 weeks  
**Complexity**: Moderate

### F. LLM Integration Layer
**Status**: ❌ NOT IMPLEMENTED
**Components Missing**:
- Claude API wrapper
- Token counting
- Rate limiting
- Prompt templates
- Response parsing

**Impact**: ChatBot non-functional  
**Effort**: 1 week  
**Dependency**: Anthropic SDK (trivial)

---

## PART 4: INTEGRATION GAPS

### Gap 1: Scanner → Graph Pipeline
**Status**: ❌ NOT CONNECTED

```
Scanner Output
    ↓
[MISSING: Integration Layer]
    ↓
Graph Model
```

**Missing**: Data transformation code (~500 LOC)  
**Effort**: 1 week

---

### Gap 2: Graph → Report Pipeline
**Status**: ⚠️ 20% CONNECTED

```
Graph Model
    ↓
Report Schema (EXISTS)
    ↓
[MISSING: Content Generation] (~300 LOC)
    ↓
HTML/PDF Output (NOT IMPLEMENTED)
```

**Effort**: 1-2 weeks

---

### Gap 3: UI ← → Backend Communication
**Status**: ❌ NOT IMPLEMENTED

```
Webview (NOT BUILT)
    ↔ [MISSING: IPC/REST API]
Backend Server (NOT BUILT)
    ↔ [MISSING: Database Layer]
Filesystem (.reposense/)
```

**Missing**: 
- WebSocket/REST server
- Message routing
- State management
- Persistence layer

**Effort**: 2-3 weeks

---

### Gap 4: Test Generation → Apply Pipeline
**Status**: ❌ NOT CONNECTED

```
ChatBot Request
    ↓
[MISSING: Claude Integration]
    ↓
Test Generation (Schema exists)
    ↓
[MISSING: Safe Apply] 
    ↓
[MISSING: File Write + Validation]
    ↓
Source File
```

**Missing**: 3-4 weeks of integration work

---

### Gap 5: Evidence Collection Pipeline
**Status**: ❌ NOT IMPLEMENTED

```
Test Execution
    ↓
[MISSING: Screenshot Capture]
[MISSING: Log Collection]
[MISSING: Network Interception]
    ↓
Evidence Index (Schema exists)
    ↓
[MISSING: Evidence Gallery UI]
    ↓
User
```

**Missing**: 2-3 weeks of implementation

---

## PART 5: PRIORITIZED BUILD ORDER FOR SPRINT 10+

### Sprint 10: Foundation (Week 1-2)

#### Phase 10.1: Backend Infrastructure
**Deliverables** (~2 weeks):
1. Express server setup
2. .reposense filesystem structure
3. CLI entry point
4. Basic command routing

**Code Volume**: ~800 LOC  
**Priority**: CRITICAL (blocks everything)

---

#### Phase 10.2: Basic Scanning
**Deliverables** (~2 weeks):
1. TypeScript/JavaScript parser
2. API call pattern detector
3. Route definition detector
4. Stable ID generation

**Code Volume**: ~1,200 LOC  
**Priority**: CRITICAL (core functionality)

---

### Sprint 11: Core UI (Week 3-4)

#### Phase 11.1: Extension Bootstrap
**Deliverables** (~1 week):
1. Extension activation
2. Command palette
3. Status bar setup
4. Basic command handlers

**Code Volume**: ~600 LOC  
**Priority**: HIGH (enables UI)

---

#### Phase 11.2: Sidebar Views
**Deliverables** (~2 weeks):
1. Webview components (React)
2. API Contract Health tree
3. Test Explorer tree
4. Evidence gallery

**Code Volume**: ~2,000 LOC  
**Priority**: HIGH (user interaction)

---

### Sprint 12: Report & Visualization (Week 5-6)

#### Phase 12.1: Report Generation
**Deliverables** (~1 week):
1. Report content generation
2. HTML rendering
3. Report webview
4. Sorting/filtering

**Code Volume**: ~1,000 LOC  
**Priority**: HIGH

---

#### Phase 12.2: Diagram Generation
**Deliverables** (~1 week):
1. Mermaid generation
2. SVG export
3. Interactive rendering
4. Click-to-source

**Code Volume**: ~800 LOC  
**Priority**: MEDIUM

---

### Sprint 13: Intelligence (Week 7-8)

#### Phase 13.1: Test Generation
**Deliverables** (~1.5 weeks):
1. Template engine
2. AI generation (Claude)
3. Diff generation
4. Safe apply

**Code Volume**: ~1,500 LOC  
**Priority**: HIGH

---

#### Phase 13.2: ChatBot Integration
**Deliverables** (~1 week):
1. Claude API wrapper
2. Chat webview UI
3. Intent routing
4. Action execution

**Code Volume**: ~1,200 LOC  
**Priority**: MEDIUM

---

### Sprint 14: Advanced Features (Week 9-10)

#### Phase 14.1: Evidence Collection
**Deliverables** (~1.5 weeks):
1. Screenshot capture (Playwright)
2. Log collection
3. Coverage integration
4. Evidence gallery UI

**Code Volume**: ~1,500 LOC  
**Priority**: MEDIUM

---

#### Phase 14.2: Performance & Hardening
**Deliverables** (~1.5 weeks):
1. Performance optimization
2. Error recovery
3. Rate limiting
4. Health checks

**Code Volume**: ~1,200 LOC  
**Priority**: MEDIUM

---

### Sprint 15+: Enterprise Features

#### Phase 15.1: Security Analysis
- Taint analysis engine
- Vulnerability detection
- Code Volume: ~1,500 LOC

#### Phase 15.2: Mutation Testing
- Mutation generator
- Score calculation
- Code Volume: ~1,000 LOC

#### Phase 15.3: Multi-Repo Support
- Cross-repo analysis
- Dependency tracking
- Code Volume: ~1,200 LOC

#### Phase 15.4: Compliance & CI/CD
- Compliance templates
- CI pipeline integration
- Code Volume: ~1,000 LOC

---

## PART 6: COMPREHENSIVE GAP TABLE

| Feature | Tier | Claimed | Actual | Gap % | Effort | Sprint |
|---------|------|---------|--------|-------|--------|--------|
| **Core** | | | | | | |
| Scanner & Parsers | 1 | Sprint 2 | ❌ 0% | 100% | 2-3w | 10 |
| Graph Model | 1 | Sprint 2 | ⚠️ 30% | 70% | 1w | 10 |
| Report Generation | 1 | Sprint 3 | ⚠️ 30% | 70% | 1-2w | 12 |
| UI Sidebar | 1 | Sprints 1-9 | ❌ 0% | 100% | 2-3w | 11 |
| **Feature** | | | | | | |
| Diagram Generation | 2 | Sprint 4 | ⚠️ 25% | 75% | 1-2w | 12 |
| Test Generation | 2 | Sprint 5-7 | ❌ 5% | 95% | 2-3w | 13 |
| Evidence Collection | 2 | Sprint 5 | ⚠️ 20% | 80% | 2-3w | 14 |
| ChatBot | 2 | Sprint 6 | ⚠️ 15% | 85% | 2-3w | 13 |
| **Advanced** | | | | | | |
| Security Analysis | 3 | Docs | ❌ 0% | 100% | 3-4w | 15 |
| Mutation Testing | 3 | Docs | ❌ 0% | 100% | 2-3w | 15 |
| Symbolic Execution | 3 | Docs | ❌ 0% | 100% | 4-6w | 16 |
| Multi-Repo Support | 3 | Docs | ❌ 0% | 100% | 2-3w | 15 |
| Compliance Reports | 3 | Docs | ❌ 0% | 100% | 2-3w | 15 |
| CI/CD Integration | 3 | Docs | ⚠️ 20% | 80% | 1-2w | 14 |

---

## PART 7: CRITICAL SUCCESS FACTORS

### Blocking Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│ Everything Depends On: Backend Server + Scanner             │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: Graph Building (report, diagrams, chat all need)    │
└─────────────────────────────────────────────────────────────┘
    ↙           ↓           ↘
  Report    Diagrams     ChatBot
    ↓           ↓           ↓
  Display    Display      LLM
    ↓           ↓           ↓
┌─────────────────────────────────────────────────────────────┐
│ Tier 2: UI Components (all need webview infrastructure)     │
└─────────────────────────────────────────────────────────────┘
```

### Must-Do First
1. Express backend server
2. Filesystem scanner (TypeScript + JavaScript)
3. Graph builder integration
4. Basic CLI commands

### Must-Do Second
1. Webview infrastructure
2. Sidebar tree views
3. Report webview
4. Report content generation

### Can Parallelize After That
- Diagram generation
- Test generation
- ChatBot
- Evidence collection

---

## PART 8: HONEST ASSESSMENT

### What Works
✅ Service interfaces and schemas  
✅ Database schema definitions  
✅ Test frameworks and test cases  
✅ Comprehensive documentation  
✅ Type definitions throughout

### What Doesn't Work
❌ No actual scanning (no parsers)  
❌ No UI (no webview, no components)  
❌ No backend server  
❌ No file I/O integration  
❌ No LLM integration  
❌ No test generation  
❌ No evidence collection  
❌ No report rendering  

### What It Really Is
- **Designed**: 100% (specifications complete)
- **Architected**: 80% (structure sound)
- **Implemented**: 15-20% (mostly interfaces)
- **Integrated**: 5% (barely connected)
- **Tested**: 30% (tests exist but can't run)
- **Production-Ready**: 0% (not runnable)

---

## PART 9: REALISTIC PROJECT TIMELINE

### Current State (End of Sprint 9)
- 4,590 LOC of code (mostly interfaces)
- 2,360 LOC of documentation
- 0 working features

### Sprint 10-12 Estimate (6 weeks)
- **Deliverable**: Basic working system
- **Features**: Scan → Report → ChatBot (simple flow)
- **Code**: ~5,000 LOC (real implementation)
- **Status**: MVP (runnable, limited features)

### Sprint 13-14 Estimate (4 weeks)
- **Deliverable**: Enhanced system
- **Features**: Test generation, evidence, diagrams
- **Code**: ~4,000 LOC
- **Status**: Feature-complete

### Sprint 15+ (Advanced)
- **Deliverable**: Enterprise capabilities
- **Features**: Security, mutation, compliance
- **Code**: ~6,000 LOC
- **Status**: Full platform

### Total Project Time
- **Current**: 9 sprints (planning/design)
- **Remaining to MVP**: 6 sprints (Sprint 10-12)
- **Remaining to Complete**: 10 sprints total (Sprint 10-15)
- **Total to Production**: ~15-16 sprints (~6 months)

---

## PART 10: RECOMMENDED SPRINT 10 FOCUS

**Sprint 10: Build the Foundation**

### Must Deliver
1. **Backend Server** (1 week)
   - Express setup
   - Basic CLI
   - .reposense folder structure
   - Data persistence

2. **Source Code Scanning** (1 week)
   - TypeScript/JavaScript parser
   - API call detection
   - Route detection
   - Stable ID generation

3. **Report Generation** (partial)
   - Report content calculation
   - Basic report output
   - JSON export

### Success Criteria
- `reposense scan` produces .reposense/runs/<runId>/graph.json
- Graph contains >80% of actual endpoints
- Report can be generated from graph
- No UI needed yet (CLI testing only)

### Output
- ~2,000 LOC of real implementation
- Fully working backend
- Non-trivial test coverage
- Documentation

---

## SIGN-OFF

**Gap Analysis Status**: ✅ COMPLETE

**Key Findings**:
1. Sprint 1-9 created specifications and interfaces (~70% complete)
2. Actual implementation is ~15-20% complete
3. 6+ weeks of real work needed to reach MVP
4. 10+ weeks needed for full feature set
5. Foundation work must happen in Sprint 10

**Recommendation**: Sprint 10 should focus entirely on backend infrastructure and scanning engine. UI can wait until Sprint 11 when graph data exists.

---

**Next Document**: SPRINT_10_BUILD_PLAN.md (when ready to implement)
