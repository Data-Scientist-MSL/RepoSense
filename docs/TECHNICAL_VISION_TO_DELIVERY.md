# RepoSense: Technical Vision → Delivery Roadmap

**Mapping Deep Technical Capabilities to 8-Week Delivery Sprints**

---

## Overview

The [RepoSense: Deep Technical Analysis](./reposense_sensing_techniques.md) document defines what RepoSense *should* become: a comprehensive diagnostic engine. This document maps those capabilities into the 8-week delivery sprint plan, prioritizing by ROI and execution feasibility.

---

## Phase-to-Sprint Mapping

### PHASE 1: Foundation (Months 1-3) = Sprints 0-2

**Technical Vision**: Multi-language AST parser, CFG construction, basic static analysis rules, API detection

**What We're Delivering**:

| Sprint | Technical Component | Delivery Output | Evidence |
|--------|-------------------|-----------------|----------|
| **0** | Storage contracts + type system | `.reposense/` storage model, RunGraph types | StorageModels.ts, ReportAndDiagramModels.ts |
| **1** | Run backbone + graph model | Immutable runs, RunGraph construction | RunGraphBuilder.ts, RunIndexService.ts |
| **2** | API discovery (frontend + backend) | Call graph extraction, endpoint detection | (Sprint 2 deliverable) |

**Technical Techniques Used**:
- **AST Parsing**: Extract frontend API calls (fetch, axios)
- **Route Detection**: Identify backend endpoints
- **Call Graph**: Match frontend → backend calls
- **API Coverage**: Report matched/orphaned/unused endpoints

**Success Criteria**:
- Frontend: Identify 95%+ of API calls
- Backend: Identify 100% of endpoints
- Matching: <5% false positives

---

### PHASE 2: Advanced Analysis (Months 4-6) = Sprints 3-4

**Technical Vision**: Taint analysis, interprocedural analysis, OpenAPI validation, call graph construction

**What We're Delivering**:

| Sprint | Technical Component | Delivery Output | Evidence |
|--------|-------------------|-----------------|----------|
| **3** | Report generation + taint basics | Beautiful reports from RunGraph | ReportGenerator.ts (Sprint 3) |
| **4** | Diagram generation + call chains | Mermaid diagrams, interactive visualization | DiagramGenerator.ts |

**Technical Techniques Used**:
- **Interprocedural Analysis**: Build complete call chains
- **Taint Analysis** (Preview): Identify user-input sources
- **Data Flow**: Track variable usage through call chain
- **Diagram Generation**: Visualize system context from call graph

**Success Criteria**:
- Reports render in <2s
- Diagrams are clickable (link to source)
- Call chains accurate for 90%+ of paths

---

### PHASE 3: Testing Intelligence (Months 7-9) = Sprints 5-7

**Technical Vision**: Coverage analysis, mutation testing, test generation (symbolic + concolic)

**What We're Delivering**:

| Sprint | Technical Component | Delivery Output | Evidence |
|--------|-------------------|-----------------|----------|
| **5** | Evidence collection (test → artifact) | Evidence index, artifact linking | EvidenceDiscoveryService.ts |
| **6** | ChatBot v1 (evidence queries) | Natural language evidence queries | ChatBotService.ts (Sprint 6) |
| **7** | Safe code generation | Generated tests + patches with proof | TestGenerator.ts, RemediationEngine.ts (Sprint 7) |

**Technical Techniques Used**:
- **Coverage Analysis**: Statement + branch coverage metrics
- **Test Generation** (Basic): Template-based test creation
- **Mutation Testing** (Future): Mutation score calculation
- **Evidence Index**: Gap → Test → Artifact traceability
- **Symbolic Execution** (Sprint 7+): Path-constrained test generation

**Success Criteria**:
- Evidence retrieval <500ms
- ChatBot responses accurate + actionable
- Generated tests have >75% mutation score

---

### PHASE 4: Evidence & Reporting (Months 10-12) = Sprint 8

**Technical Vision**: Immutable runs, audit-ready reports, continuous validation integration

**What We're Delivering**:

| Sprint | Technical Component | Delivery Output | Evidence |
|--------|-------------------|-----------------|----------|
| **8** | Enterprise mode + CI/CD integration | Production-ready system with audit trail | CLI mode, CI integration |

**Technical Techniques Used**:
- **Immutable Runs**: Timestamped, reproducible analysis
- **Audit Trail**: Complete evidence chain (who, what, when)
- **Risk Scoring**: Severity × Likelihood × Impact
- **Export/Archive**: Portable evidence bundles

**Success Criteria**:
- Runs are fully reproducible
- Audit trail captures complete lineage
- Export format supports compliance needs

---

## Capability Expansion Timeline

### Sprint 0-2: Foundation (Weeks 1-3)
```
✓ Storage model locked
✓ Basic AST parsing (pattern matching)
✓ API call detection (regex-based)
✓ Type system complete
```

### Sprint 3-4: Reports & Diagrams (Weeks 4-6)
```
✓ Call graph visualization
✓ Report generation from graph
✓ Diagram generation (Mermaid)
✓ Interactive clickable elements
```

### Sprint 5-6: Evidence & ChatBot (Weeks 7-8)
```
✓ Evidence index creation
✓ Gap → Test → Artifact linking
✓ ChatBot v1 (intent-driven)
✓ Natural language queries
```

### Sprint 7: Safe Generation (Week 9)
```
✓ Test generation (template-based, advancing to symbolic)
✓ Code patches with mutation validation
✓ Evidence of fix verification
✓ Audit trail of all changes
```

### Sprint 8: Enterprise (Week 10)
```
✓ CI/CD integration
✓ Immutable run history
✓ Compliance reporting
✓ Continuous validation
```

---

## Technique Prioritization: By Sprint

### Priority 1 (Sprints 0-2): Foundation Techniques
**Why First**: Required before any analysis can be performed

- **AST Parsing** → Structural code understanding
- **Call Graph** → Dependency mapping
- **API Matching** → Frontend-backend alignment
- **Storage Model** → Evidence persistence

**Tools/Libraries**:
- `@babel/parser` (JavaScript/TypeScript AST)
- `libcst` (Python AST)
- TreeSitter (multi-language fallback)

---

### Priority 2 (Sprints 3-4): Report Generation
**Why Second**: Leverage foundation to produce user-visible output

- **Report Generation** → Structured analysis output
- **Diagram Generation** → Visual representation
- **Interactive Elements** → Source code linking
- **Data Flow Visualization** → Dependency tracking

**Tools/Libraries**:
- `mermaid` (diagram generation)
- `plotly` / custom (chart rendering)
- `d3.js` (interactive visualization)

---

### Priority 3 (Sprints 5-6): Evidence & Discovery
**Why Third**: Build on storage + analysis to create traceability

- **Evidence Index** → Gap linking to tests
- **Taint Analysis** (preview) → Input source tracking
- **ChatBot Integration** → Natural language queries
- **Artifact Discovery** → Find proof by question

**Tools/Libraries**:
- `sqlite` (evidence index storage)
- Custom taint engine (advanced)
- LLM (ChatBot queries)

---

### Priority 4 (Sprint 7): Test Generation
**Why Fourth**: Generate tests based on proven need

- **Symbolic Execution** (basic) → Path enumeration
- **Test Templates** → Test generation framework
- **Mutation Validation** → Ensure tests kill mutants
- **Evidence Capture** → Record test execution artifacts

**Tools/Libraries**:
- `KLEE` or custom symbolic engine
- `jest` / `playwright` (test runners)
- `mutmut` / `Stryker` (mutation testing)

---

### Priority 5 (Sprint 8): Advanced Techniques (Future)
**Why Last**: Polish + enterprise features

- **Concolic Testing** → Hybrid symbolic execution
- **Risk Scoring** → Prioritize findings
- **Continuous Validation** → Run in CI/CD
- **Compliance Export** → Audit-ready formats

**Tools/Libraries**:
- Symbolic engine + SMT solver
- Custom risk engine
- GitHub Actions / GitLab CI integration

---

## NOT in 8-Week Delivery (Future Work)

**These are valuable but out of scope for Sprint 0-8:**

1. **Full Taint Analysis**
   - Current: Preview (identify user inputs)
   - Future: Complete source-to-sink tracking
   - Effort: 4+ weeks
   - Value: High (security)

2. **Mutation Testing Suite**
   - Current: None
   - Future: Full mutation score reporting
   - Effort: 3+ weeks
   - Value: Very High (test quality)

3. **Concolic Testing**
   - Current: None
   - Future: Hybrid symbolic/concrete execution
   - Effort: 6+ weeks
   - Value: High (comprehensive coverage)

4. **Architecture Violation Detection**
   - Current: None (will have call graph)
   - Future: Layering + circular dependency detection
   - Effort: 2+ weeks
   - Value: Medium

5. **Compliance Reporting**
   - Current: Basic audit trail
   - Future: SOC2, ISO27001, HIPAA formats
   - Effort: 2+ weeks
   - Value: High (enterprise)

---

## Sprint-by-Sprint Implementation Details

### Sprint 0: Contracts Locked

**Techniques Needed**: None (infrastructure)

**Types Created**:
- `RunGraph` (nodes, edges, metadata)
- `ReportDocument` (sections, content types)
- `Diagram` (Mermaid + metadata)
- `RunMeta`, `RunIndex` (storage)

**Evidence**: 
- `StorageModels.ts` ✓
- `ReportAndDiagramModels.ts` ✓

---

### Sprint 1: Run Backbone

**Techniques Needed**:
- Basic pattern matching (file scanning)
- Call graph stub (placeholder)

**Implementation**:
- `RunGraphBuilder` creates RunGraph from analysis
- `RunIndexService` registers runs
- Stub implementations for graph construction

**Evidence**:
- `RunGraphBuilder.ts` ✓
- `RunIndexService.ts` ✓

---

### Sprint 2: Graph Model

**Techniques Needed**:
- **AST Parsing**: Extract functions, calls
- **Call Graph**: Match frontend → backend
- **API Matching**: Coverage analysis

**Implementation**:
```typescript
// In AnalysisEngine:
1. Parse backend files → extract endpoints
2. Parse frontend files → extract API calls
3. Build call graph connecting them
4. Populate RunGraph.nodes + RunGraph.edges
```

**Evidence**:
- API coverage report
- Call graph visualization
- Gap → Endpoint mapping

---

### Sprint 3-4: Reports & Diagrams

**Techniques Needed**:
- **Interprocedural Analysis**: Complete call chains
- **Data Flow**: Variable tracking through calls
- **Visualization**: Mermaid diagram generation

**Implementation**:
```typescript
// ReportGenerator:
1. Read RunGraph
2. Extract key metrics (coverage, gaps, endpoints)
3. Build report sections (executive summary, details)
4. Render to JSON + MD + HTML

// DiagramGenerator:
1. Read RunGraph
2. Generate 3 Mermaid diagrams (system context, API flow, coverage map)
3. Export as SVG + PNG
```

**Evidence**:
- Beautiful report (HTML/PDF)
- Clickable diagrams
- Visual representation of system

---

### Sprint 5: Evidence Collection

**Techniques Needed**:
- **Evidence Index**: Link gaps to tests
- **Artifact Storage**: Store screenshots, videos, logs
- **Discovery Service**: Query evidence by gap/endpoint/test

**Implementation**:
```typescript
// EvidenceDiscoveryService:
1. Load evidence index (gap → test → artifact mapping)
2. Query by gap ID
3. Return: test case + proof (screenshots + network trace)

// Integration:
- After test execution, capture evidence
- Link back to gap in evidence index
- Make discoverable by ChatBot + UI
```

**Evidence**:
- Evidence index (gap → artifact)
- Evidence manifest (checksums)
- Screenshot/video/log storage

---

### Sprint 6: ChatBot v1

**Techniques Needed**:
- **Intent Routing**: Map user questions to queries
- **Query Execution**: Use discovery services
- **Natural Language Responses**: Format findings

**Implementation**:
```typescript
// ChatBotService:
User: "Show evidence for gap-123"
  → Intent: EXPLAIN_GAP
  → Query: evidenceDiscovery.findEvidenceForGap('gap-123')
  → Response: "Gap proven by test X with screenshot Y"

User: "What endpoints are untested?"
  → Intent: LIST_UNCOVERED
  → Query: runIndex.getUncoveredEndpoints()
  → Response: "5 endpoints uncovered: ..."
```

**Evidence**:
- ChatBot panel in VS Code
- 7+ intents working
- Evidence discovery integration

---

### Sprint 7: Safe Generation

**Techniques Needed**:
- **Test Generation**: Create tests based on gaps
- **Code Patches**: Generate fixes
- **Mutation Validation**: Ensure tests kill mutants
- **Evidence Capture**: Record execution

**Implementation**:
```typescript
// TestGenerator:
1. For each gap, generate template test
2. Capture execution (assertions, coverage)
3. Check if test "kills" related mutations
4. Store test + evidence + mutation report

// RemediationEngine:
1. Analyze gap root cause
2. Generate code patch
3. Apply patch + run tests
4. Record before/after evidence
```

**Evidence**:
- Generated tests (playwright, jest, cypress)
- Code patches (unified diff)
- Mutation report (tests kill 80%+ of mutants)
- Execution traces

---

### Sprint 8: Enterprise

**Techniques Needed**:
- **Immutable Runs**: Version control for analysis
- **Continuous Validation**: CI/CD integration
- **Risk Scoring**: Prioritize findings
- **Compliance Export**: Audit formats

**Implementation**:
```typescript
// In CI/CD pipeline:
1. Run RepoSense on every commit
2. Store results in .reposense/runs/
3. Compare runs (delta analysis)
4. Generate risk scores
5. Export compliance report
6. Fail build if critical risks found

// EnterpriseSystems:
- CLI for CI integration
- GitHub Actions workflow
- Slack notifications
- Risk dashboard
```

**Evidence**:
- CI/CD integration working
- Run history queryable
- Compliance export format
- Risk dashboard visible

---

## Technique Complexity vs. Sprint Feasibility

| Technique | Complexity | Sprint | Time Est. | Value |
|-----------|-----------|--------|----------|-------|
| AST Parsing | Medium | 1-2 | 1-2 weeks | High |
| Call Graph | Medium | 2 | 1 week | Very High |
| API Matching | Low | 2 | 3 days | Very High |
| Report Generation | Low | 3 | 1 week | High |
| Diagram Generation | Medium | 4 | 1 week | Medium |
| Evidence Index | Low | 5 | 3 days | High |
| ChatBot Intent Routing | Low | 6 | 3 days | High |
| Test Generation (template) | Medium | 7 | 1 week | High |
| Taint Analysis | High | 7+ | 2-3 weeks | Very High |
| Mutation Testing | High | 7+ | 2 weeks | Very High |
| Concolic Testing | Very High | 8+ | 4 weeks | High |
| Risk Scoring | Low | 8 | 2 days | Medium |

---

## Evidence-Driven Roadmap

**Each sprint produces:**

1. **Executable artifact** (feature users can demo)
2. **Evidence artifact** (proof that it works)
3. **Type/contract artifact** (locked for next sprint)

**Example - Sprint 2**:
- Executable: API coverage report showing 39/47 endpoints called
- Evidence: Call graph diagram showing matched pairs + orphaned calls
- Types: RunGraph with populated nodes + edges

**Example - Sprint 6**:
- Executable: ChatBot answering "What tests cover GET /users?"
- Evidence: Evidence index linking gap → test → screenshot
- Types: EvidenceIndex schema locked

---

## Continuous Learning

**After each sprint, evaluate:**
1. Which techniques provided most value?
2. Which are blocking progress?
3. Which should be prioritized in future phases?
4. Customer feedback on delivered features

**Result**: Roadmap evolves based on real-world usage, not assumptions.

---

## Conclusion

The **8-week delivery program** is a staged rollout of the **technical vision**:

- **Sprint 0-2**: Foundation (storage + graph model)
- **Sprint 3-4**: User-visible output (reports + diagrams)
- **Sprint 5-6**: Intelligence (evidence + ChatBot)
- **Sprint 7**: Automation (test + patch generation)
- **Sprint 8**: Enterprise (continuous validation)

Each sprint unlocks the next, building toward the full **diagnostic engine** vision.

**Phase 4+ (Future)**: Advanced techniques (taint analysis, concolic testing, mutation scoring) once foundation is stable.

---

## Reference

**Technical Vision Document**: [reposense_sensing_techniques.md](./reposense_sensing_techniques.md)

**Delivery Sprint Plan**: [DELIVERY_SPRINTS_8WEEKS.md](./DELIVERY_SPRINTS_8WEEKS.md)

**Sprint 0 Checklist**: [SPRINT_0_ENGINEERING_CHECKLIST.md](./SPRINT_0_ENGINEERING_CHECKLIST.md)
