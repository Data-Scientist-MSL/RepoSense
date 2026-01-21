# 🧱 SPRINT 16 BUILD CONTRACT
## Multi-Repo Impact Analysis & Dependency Intelligence

**Sprint Type**: Organizational Visibility  
**Primary Value Signal**: "RepoSense understands systems, not repos"  
**Executive Narrative**: From repository-level insights to *system-level decision support*

---

## 1. Sprint 16 Objective

Enable RepoSense to analyze **multiple repositories together** and answer the critical question:

> "If we change this, what breaks — and where?"

**Who Benefits**:
- Architects (blast radius before deployment)
- Platform organizations (dependency health)
- M&A / Integration teams (system knowledge transfer)

---

## 2. Scope Lock (Zero Drift)

### IN SCOPE
✅ Multi-repo graph stitching  
✅ Cross-repo API contracts  
✅ Dependency version conflicts  
✅ Impact analysis (downstream tracing)  
✅ Organization-level dashboards  

### OUT OF SCOPE
❌ Auto-fix across repos  
❌ Distributed execution  
❌ Monorepo refactoring  
❌ Code migration  

---

## 3. Mandatory Deliverables

### D1. Multi-Repo Run Orchestrator ⚡

**File**: `src/services/orchestration/MultiRepoOrchestrator.ts`

Structure:
```
.reposense/
  org-runs/
    org-run-123/
      repo-A/
        gaps.json
        evidence/
      repo-B/
        gaps.json
        evidence/
      org-graph.json
      manifest.json
```

**Guarantees**:
- ✅ **Repo isolation**: Each repo analysis remains isolated (no cross-contamination)
- ✅ **Shared graph**: Synthesized org-graph links repos via contracts
- ✅ **Ownership preserved**: Repo ownership metadata retained
- ✅ **Deterministic**: Same org + repos = same org-graph

**Implementation**:
- Orchestrate N repo scans sequentially
- Collect individual artifacts
- Synthesize org-graph from contracts
- Create manifest with repo checksums

---

### D2. Cross-Repo Contract Graph 🔗

**File**: `src/services/analysis/ContractGraphEngine.ts`

Graph model:
```json
{
  "repos": {
    "repo-A": {
      "id": "repo-A",
      "owner": "team-X",
      "version": "1.2.3"
    }
  },
  "contracts": [
    {
      "producer": "repo-A::AuthService",
      "consumer": "repo-B::Gateway",
      "version": "1.2.3",
      "breaking": false,
      "driftClassification": "HEALTHY"
    }
  ],
  "driftMap": {
    "repo-A": "HEALTHY",
    "repo-B": "DRIFT",
    "repo-C": "BREAKING"
  }
}
```

**Drift Classifications**:
- 🟢 **HEALTHY**: Contracts aligned, versions match, no conflicts
- 🟡 **DRIFT**: Minor version mismatches, advisory warnings
- 🔴 **BREAKING**: Major version mismatch, contract incompatibilities

**Implementation**:
- Producer/consumer mapping from contract files
- Version compatibility checking
- Breaking change detection
- Drift scoring algorithm

---

### D3. Impact Analysis Engine 📈

**File**: `src/services/analysis/ImpactAnalysisEngine.ts`

Query: "What if we change this?"

Output:
```json
{
  "changePoint": "repo-A::AuthService::validateToken()",
  "affectedRepos": ["repo-B", "repo-D", "repo-F"],
  "impactChain": [
    "repo-A::validateToken() → repo-B::Gateway (high risk)",
    "repo-B::Gateway → repo-D::BillingService (medium risk)"
  ],
  "riskScore": 8.5,
  "downstreamEndpoints": 47,
  "breakingRisks": 3
}
```

**Guarantees**:
- ✅ Downstream tracing (follow dependency graph)
- ✅ Endpoint counting (APIs affected)
- ✅ Risk scoring (quantified impact)
- ✅ Affected repo list (actionable intelligence)

**Implementation**:
- Graph traversal algorithm
- Risk scoring based on dependency depth + criticality
- Endpoint enumeration
- Break-point detection

---

### D4. Organization Dashboard 📊

**File**: `src/providers/OrgDashboardProvider.ts`

Dashboard displays (read-only):
- **System Health**: % repos in HEALTHY state
- **Drift Risk**: Visual map of drift-classified repos
- **Dependency Graph**: Interactive visualization
- **High-Risk Changes**: Top 10 changes by blast radius
- **Team Dependencies**: Cross-team contract matrix

**Implementation**:
- WebView panel in VS Code
- SVG visualization generation
- JSON data binding
- Real-time refresh from org-graph

---

## 4. Sprint 16 Exit Criteria

✅ **Multi-Repo**: Multi-repo analysis deterministic, reproducible  
✅ **Graph**: Contract graph accurate, drift classifications correct  
✅ **Impact**: Impact analysis identifies all downstream repos  
✅ **Isolation**: No repo contamination (each repo isolated)  
✅ **Export**: Org graph exportable (portable, machine-readable)  
✅ **Dashboard**: Dashboard renders all repos + contract graph  
✅ **Compilation**: All code compiles (0 errors)  
✅ **Tests**: All components have verification suites  

---

## 5. Business Value Delivery

**Operational Impact**:
- Change blast radius known before deployment (risk reduction)
- Cross-team dependencies visible (planning acceleration)
- Integration points catalogued (M&A speedup)

**Who Pays Attention Now**:
- 🏗️ Architects (blast radius intelligence)
- 👥 Platform organizations (dependency health)
- 📊 Leadership (organizational visualization)

**Business Signal**:
> "We know the blast radius of every change before it lands. Cross-team dependencies are no longer a surprise."

---

## 6. Deliverable Checklist

| Deliverable | File(s) | Status | Tests |
|---|---|---|---|
| D1: Multi-Repo Orchestrator | `src/services/orchestration/MultiRepoOrchestrator.ts` | 🔲 | org-run structure, isolation, graph synthesis |
| D2: Contract Graph Engine | `src/services/analysis/ContractGraphEngine.ts` | 🔲 | producer/consumer mapping, drift classification |
| D3: Impact Analysis Engine | `src/services/analysis/ImpactAnalysisEngine.ts` | 🔲 | downstream tracing, risk scoring, impact chaining |
| D4: Org Dashboard | `src/providers/OrgDashboardProvider.ts` | 🔲 | system health, contract visualization, risk map |

---

## 7. Integration Points

- ✅ CLI commands from Sprint 15 → Can trigger multi-repo scans
- ✅ Quality gates from Sprint 15 → Can enforce org-level policies
- ✅ Existing gap analysis → Feeds into contract graph
- ✅ Reports → Consumed by Executive Reporter (Sprint 17)

---

## 8. Notes

- **Repo Isolation**: Each repo's .reposense/ directory remains independent
- **Shared Graph**: org-graph.json is *synthesized*, not *mutated*
- **Scaling**: Architecture supports 50+ repos without performance degradation
- **Determinism**: Same org inputs always produce same org-graph

---

**Sprint 16 BUILD CONTRACT LOCKED** ✓
