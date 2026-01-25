# Sprint 10: Feature Dependency Map

## What Must Be Built First (Sequential)

```
PHASE 1: FOUNDATION (Week 1-2, ~2,000 LOC)
├─ Backend Server Infrastructure
│  ├─ Express app with basic routing
│  ├─ .reposense directory manager
│  ├─ Run orchestrator logic
│  └─ Error handling middleware
├─ Source Code Scanner
│  ├─ TypeScript/JavaScript parser
│  ├─ API call pattern detector
│  ├─ Route definition detector
│  └─ Path normalization
└─ Graph Builder
   ├─ Node creation (Frontend/Backend/Gap)
   ├─ Edge creation
   ├─ Stable ID generation
   └─ Graph JSON serialization
         ↓↓↓ (ENABLES ALL OF PHASE 2)

PHASE 2: CORE FEATURES (Week 3-4, ~2,500 LOC)
├─ Report Generation Engine
│  ├─ Content calculation
│  ├─ Severity scoring
│  ├─ Trend calculation
│  └─ Report JSON creation
│         ↓ (ENABLES REPORT DISPLAY)
│
├─ CLI Commands
│  ├─ reposense scan
│  ├─ reposense report
│  ├─ reposense compare
│  └─ reposense check
│         ↓ (ENABLES HEADLESS TESTING)
│
└─ Extension Bootstrap
   ├─ Activation hooks
   ├─ Command registration
   ├─ Status bar integration
   └─ Basic event handlers
         ↓ (ENABLES UI LAYERS)

PHASE 3: USER INTERFACE (Week 5-6, ~2,500 LOC)
├─ Webview Infrastructure
│  ├─ React component host
│  ├─ Message routing (IPC)
│  ├─ Theme support
│  └─ State management
│         ↓
├─ Activity Bar Views
│  ├─ Sidebar tree views
│  ├─ Tree node rendering
│  ├─ Click handlers
│  └─ Context menus
│         ↓
├─ Report Display
│  ├─ Webview panel
│  ├─ Report rendering
│  ├─ Interactive tables
│  └─ Export buttons
│         ↓
└─ Editor Decorations
   ├─ Inline code lens
   ├─ Gutter icons
   ├─ Severity coloring
   └─ Quick actions
         ↓ (ENABLES PHASE 4)

PHASE 4: INTELLIGENCE (Week 7-8, ~2,500 LOC)
├─ Test Generation
│  ├─ Template engine
│  ├─ Claude API integration
│  ├─ Diff generation
│  └─ Safe apply system
│         ↓
├─ ChatBot Service
│  ├─ Intent detection
│  ├─ Claude prompting
│  ├─ Response parsing
│  └─ Action execution
│         ↓
├─ Diagram Generation
│  ├─ Mermaid generation
│  ├─ SVG rendering
│  ├─ Click handlers
│  └─ Export logic
│         ↓
└─ Evidence Collection
   ├─ Screenshot capture
   ├─ Log collection
   ├─ Coverage integration
   └─ Evidence gallery UI
         ↓ (ENABLES PHASE 5)

PHASE 5: PRODUCTION (Week 9-10, ~2,000 LOC)
├─ Performance Optimization
│  ├─ Caching layer
│  ├─ Worker pools
│  ├─ Lazy loading
│  └─ Query optimization
├─ Error Recovery
│  ├─ Circuit breakers
│  ├─ Retry logic
│  ├─ Crash recovery
│  └─ Health checks
├─ Quality Gates
│  ├─ Gap thresholds
│  ├─ Coverage gates
│  └─ Health scoring
└─ CI/CD Integration
   ├─ CLI headless mode
   ├─ GitHub Actions support
   ├─ GitLab CI support
   └─ Report publishing
```

---

## Dependency Matrix: What Blocks What

```
         ┌─────────────────────────────────────────┐
         │ BACKEND SERVER + SCANNER                │
         │ (Absolutely blocking everything)        │
         └─────────────────────────────────────────┘
                          │
         ╔════════════════════════════════════════╗
         ║           GRAPH MODEL                   ║
         ║ (All features depend on working graph) ║
         ╚════════════════════════════════════════╝
                    ╱        │        ╲
                  ╱          │          ╲
                ╱            │            ╲
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ REPORT   │   │ DIAGRAMS │   │ CHATBOT  │
        │ DISPLAY  │   │ DISPLAY  │   │ DISPLAY  │
        └──────────┘   └──────────┘   └──────────┘
             │               │               │
        ┌────┴───────────────┴───────────────┴─────┐
        │ ALL REQUIRE: UI WEBVIEW INFRASTRUCTURE   │
        └────────────────────────────────────────────┘
             │               │               │
    ┌────────┴─────┬─────────┴─────────┬────┴──────┐
    │              │                   │           │
┌────────┐  ┌────────────┐  ┌─────────┐  ┌──────────┐
│ SIDEBARS│ │EDITOR DECOR│  │STATUS BAR│  │CODE LENS │
│(trees)  │  │(inline hints)│(health) │  │(quickfix)│
└────────┘  └────────────┘  └─────────┘  └──────────┘
    │              │               │           │
    └──────────────┴───────────────┴───────────┘
             │
        ┌────────────────────────┐
        │ TEST GENERATION LAYER  │
        │ (Depends on UI+Report) │
        └────────────────────────┘
             │
        ┌────────────────────────┐
        │ EVIDENCE COLLECTION    │
        │ (Depends on Tests)     │
        └────────────────────────┘
             │
        ┌────────────────────────┐
        │ COMPLIANCE/AUDIT LAYER │
        │ (Final layer)          │
        └────────────────────────┘
```

---

## What Can't Start Until What?

### Can't Do Phase 3 (UI) Until Phase 1 Complete
- **Why**: No data to display
- **Blocker**: Scanner must produce working graph.json
- **Time Lost If Ignored**: 2+ weeks of wasted UI work

### Can't Do Phase 4 (Intelligence) Until Phase 2-3 Complete
- **Why**: Test generation needs UI to show diffs, Chat needs reports to explain
- **Blocker**: UI must exist to show results
- **Time Lost If Ignored**: 1+ weeks of wasted work

### Can't Do Phase 5 (Production) Until Phase 4 Complete
- **Why**: Performance optimization depends on having real features
- **Blocker**: Nothing to optimize until intelligent features exist
- **Time Lost If Ignored**: Premature optimization

---

## Critical Path Analysis

### Minimum Time to MVP (Basic Working System)

```
Phase 1: Backend + Scanner + Graph
├─ Express server setup           [3 days]
├─ TypeScript parser integration [5 days]
├─ Graph building & serialization [4 days]
└─ Basic CLI commands            [2 days]
Total: ~2 weeks

Phase 2: Report Generation
├─ Report content generation     [3 days]
├─ Report JSON output            [2 days]
├─ CLI report command            [2 days]
└─ Basic validation              [2 days]
Total: ~1-1.5 weeks

Phase 3a: Minimal UI (Activity Bar Only)
├─ Webview bootstrap             [4 days]
├─ Basic sidebar tree            [3 days]
├─ Click to jump functionality   [2 days]
└─ Status bar                    [1 day]
Total: ~1-1.5 weeks

═══════════════════════════════════════════════
TOTAL TIME TO MVP: 4.5 weeks (Sprints 10 + half of 11)

MVP Capabilities:
✓ Scan source code
✓ Generate graph
✓ Create report
✓ View report in UI
✓ Jump to code from graph
✗ Test generation
✗ ChatBot
✗ Evidence collection
✗ Advanced features
```

### Time to Feature-Complete (All Tier 1 & 2 Features)

```
Previous work:                   4.5 weeks

Phase 3b: Full UI
├─ Report webview               [3 days]
├─ Diagram generation           [5 days]
├─ Editor inline decorations    [3 days]
└─ Filtering & search           [2 days]
Total: ~1.5-2 weeks

Phase 4: Intelligence
├─ Test generation engine       [5 days]
├─ ChatBot integration          [5 days]
├─ Evidence collection          [5 days]
└─ Integration testing          [3 days]
Total: ~2-2.5 weeks

═══════════════════════════════════════════════
TOTAL TIME: 9-10 weeks (Sprints 10-12)

Feature Complete for:
✓ All core scanning & analysis
✓ All UI viewing capabilities
✓ Basic test generation
✓ ChatBot with Claude
✓ Evidence tracking
✓ Report variants
✗ Advanced (security, mutation, multi-repo)
```

---

## What to Skip in Sprint 10 (Defer to Later)

### Don't Build Yet
- ❌ UI components (defer to Sprint 11)
- ❌ ChatBot (defer to Sprint 13)
- ❌ Test generation (defer to Sprint 13)
- ❌ Diagram rendering (defer to Sprint 12)
- ❌ Evidence collection (defer to Sprint 14)
- ❌ Security analysis (defer to Sprint 15)
- ❌ Mutation testing (defer to Sprint 15)
- ❌ Multi-repo support (defer to Sprint 15)
- ❌ Compliance reports (defer to Sprint 15)
- ❌ CI/CD integration (defer to Sprint 14)

### Must Build
- ✅ Backend server
- ✅ Source scanner (TypeScript/JS only, not all languages)
- ✅ Graph builder
- ✅ Report generator
- ✅ CLI commands (at least `scan` and `report`)
- ✅ Basic file I/O
- ✅ Run persistence

---

## The 80/20 Rule

### What Gets You 80% of Usability?

**Phase 1+2 Only (~4 weeks)**:
```
Backend + Scanner + Report + CLI = Powerful dev tool

Users can:
- Analyze their codebase
- Get detailed reports
- Export results
- Use in CI/CD
- Run daily scans

Missing UI doesn't prevent this
```

### What's the Other 20%?

**Phases 3+4+5**:
```
UI + Intelligence + Production hardening = Better UX

Makes it easier/prettier/smarter but
users could get value from Phase 1+2 alone
```

### Implication for Sprint 10

If Sprint 10 fully completes Phases 1+2:
- Users have working tool (even without UI)
- Can use via CLI in production
- Can generate reports for stakeholders
- Can integrate into pipelines

**This is better than having pretty UI with no backend.**

---

## Red Flags to Watch

### If Sprint 10 Ends And You Don't Have This, You're Behind:

❌ No `reposense scan` command  
❌ No graph.json being produced  
❌ No report being generated  
❌ No graph with >100 nodes (test on real repo)  
❌ Tests still fail  
❌ CLI non-functional  

### If Sprint 10 Ends With Only This, You're On Track:

✅ Working backend server  
✅ Working scanner (TypeScript/JavaScript)  
✅ Working report generator  
✅ Working CLI (basic commands)  
✅ 2,000+ LOC of real implementation  
✅ Integration tests passing  
✅ Production folder structure created  

### If Sprint 10 Ends With UI:

🚩 WARNING: Phase dependency violated
- UI built before graph working = wasted effort
- Likely UI shows empty data
- Will need major refactoring when data flows
- Violates critical path analysis

---

## Effort Estimates by Sprint

| Sprint | Phase | Duration | LOC | Key Deliverable | Can Ship? |
|--------|-------|----------|-----|-----------------|-----------|
| 10 | 1+2 | 2 weeks | 2,000 | Working CLI | Yes (headless) |
| 11 | 3a | 1.5 weeks | 1,500 | Basic UI | Yes (with CLI) |
| 12 | 3b + 4a | 2 weeks | 2,000 | Report UI + Diagrams | Yes (rich UX) |
| 13 | 4b+c | 2 weeks | 2,000 | ChatBot + Tests | Yes (smart UX) |
| 14 | 5a+b | 1.5 weeks | 1,500 | Performance + Evidence | Yes (hardened) |
| 15 | Advanced | 2 weeks | 2,000 | Security, Multi-repo | Enterprise |

---

## Sprint 10 Must-Deliver Checklist

### Code Deliverables
- [ ] Express backend server (500 LOC)
- [ ] TypeScript/JavaScript scanner (1,000 LOC)
- [ ] Graph builder integration (300 LOC)
- [ ] Report generator (400 LOC)
- [ ] CLI entry point (200 LOC)
- [ ] File I/O handlers (300 LOC)
- [ ] Run orchestrator integration (300 LOC)

### Feature Deliverables
- [ ] `reposense scan` works
- [ ] `reposense report` works
- [ ] Produces valid .reposense/runs/<id>/graph.json
- [ ] Produces valid .reposense/runs/<id>/report.json
- [ ] Graph contains 80%+ of endpoints
- [ ] Report shows accurate statistics

### Test Deliverables
- [ ] Integration tests pass
- [ ] Fixtures for test repos created
- [ ] CLI commands tested
- [ ] Data persistence verified
- [ ] Error handling verified

### Documentation
- [ ] API documentation for services
- [ ] CLI usage guide
- [ ] Configuration guide
- [ ] Architecture update

### Success Criteria
- ✅ At least one complete E2E flow: Scan → Graph → Report → Output
- ✅ 80%+ endpoint detection rate on test repo
- ✅ Zero unhandled exceptions
- ✅ 100% of tests passing
- ✅ Code compiles without warnings

---

## What Happens If Sprint 10 Doesn't Deliver

### Scenario A: Sprint 10 Only Writes More Documentation
```
Result: Sprints 1-10 = 100% specs, 0% working code
Risk: Project looks complete but fails in production
Action: Need immediate pivot to implementation
```

### Scenario B: Sprint 10 Builds UI Without Backend
```
Result: Pretty webviews with no data
Risk: Wasted effort, will need rebuilding when backend arrives
Action: Immediately focus backend team
```

### Scenario C: Sprint 10 Builds Partial Backend
```
Result: Scanner works but report doesn't
Risk: Incomplete E2E flow, no proof of concept
Action: Finish report generator immediately
```

### Scenario D: Sprint 10 Delivers Full Phase 1+2 ✅
```
Result: Working tool, real data flowing
Risk: None - clear path forward
Action: Continue with Phase 3 in Sprint 11
```

---

## Recommended Sprint 10 Team Structure

**Backend Team (3 people)**:
- Person A: Express server + CLI framework
- Person B: Scanner (TypeScript/JavaScript parser)
- Person C: Graph builder + Report generator

**Infrastructure Team (1 person)**:
- Person D: File I/O, persistence, run orchestration

**QA Team (1 person)**:
- Person E: Integration tests, test fixtures, validation

---

## Success Is Defined By This Demo

**End of Sprint 10 Demo**:
```bash
$ cd /path/to/sample-repo
$ reposense scan

✓ Scanning TypeScript files...
✓ Found 47 endpoints
✓ Found 52 API calls
✓ Generated graph
✓ Creating report...
✓ Report written to: .reposense/runs/abc-123/

$ reposense report --format=html

✓ Report generated: .reposense/runs/abc-123/report.html
✓ Summary:
  - Matched endpoints: 42/47 (89%)
  - Gaps detected: 5 CRITICAL, 3 HIGH
  - Coverage: 82%

$ ls -la .reposense/runs/abc-123/
meta.json
graph.json ✓ (contains 47 endpoints as nodes)
report.json ✓ (shows statistics match graph)
report/
  └─ report.html
```

**This proves**:
✅ Scanning works  
✅ Graph building works  
✅ Report generation works  
✅ Data persists  
✅ CLI is functional  

**Without this, Sprint 10 failed.**

---

**Gap Analysis and Dependency Map: Complete**
