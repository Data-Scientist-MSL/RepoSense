# 🧱 SPRINT 15 BUILD CONTRACT
## CI/CD Trust Gates & Enterprise Readiness

**Sprint Type**: Adoption Enablement  
**Primary Value Signal**: "RepoSense now blocks bad changes automatically"  
**Executive Narrative**: RepoSense transitions from *developer tool* to *release control system*

---

## 1. Sprint 15 Objective

Enable RepoSense to function as a **non-bypassable quality gate** in CI/CD pipelines — without introducing unsafe automation.

> Sprint 15 turns RepoSense from a *developer tool* into a *release control system*.

**Who Benefits**:
- Platform teams (enforce standards)
- Release managers (prevent broken releases)
- Engineering leadership (measurable quality)

---

## 2. Scope Lock (Zero Drift)

### IN SCOPE
✅ Headless execution (CLI)  
✅ CI/CD integrations  
✅ Quality gates  
✅ Machine-readable outputs  
✅ Badges & reports  

### OUT OF SCOPE
❌ Auto-merge  
❌ Auto-remediation  
❌ Production code mutation  
❌ Multi-repo orchestration  

---

## 3. Mandatory Deliverables

### D1. Headless CLI Engine ⚙️

**File**: `src/cli/CLIEngine.ts`

Commands:
```bash
reposense scan [--project] [--config]      # Analyze gaps
reposense report [--output]                 # Generate report
reposense check [--config] [--strict]       # Validate gates
reposense export [--format] [--output]      # Machine-readable output
```

**Guarantees**:
- ✅ Same artifacts as IDE runs (reproducible)
- ✅ Deterministic output (same inputs = same outputs)
- ✅ Exit codes reflect policy enforcement:
  - `0` = PASS (all gates met)
  - `1` = FAIL (critical gates violated)
  - `2` = WARN (non-blocking issues)

**Implementation**:
- TypeScript class with async command handlers
- JSON output serialization
- Structured error reporting
- No interactive prompts

---

### D2. Quality Gate Engine 🚪

**File**: `src/services/analysis/QualityGateEngine.ts`

Configuration:
```json
{
  "maxCriticalGaps": 0,
  "maxHighGaps": 3,
  "minCoverage": 0.80,
  "maxComplexityScore": 8.5,
  "requiredRemediations": 10
}
```

**Behavior**:
- ✅ FAIL build if **any** critical threshold violated
- ✅ WARN for non-blocking issues (advisory)
- ✅ Generate detailed explanation report
- ✅ Include remediation suggestions

**Implementation**:
- Policy engine with threshold evaluation
- Multi-gate orchestration
- Structured report generation
- Immutable gate results

---

### D3. CI/CD Templates 🔗

**Files**:
- `.github/workflows/reposense-quality-gate.yml`
- `.gitlab-ci.yml` (RepoSense job)
- `Jenkinsfile` (RepoSense stage)

**Each template must**:
- ✅ Upload artifacts to CI (logs, reports, evidence)
- ✅ Publish HTML report (accessible from pipeline UI)
- ✅ Fail pipeline on gate violation
- ✅ Generate machine-readable summary (JSON)
- ✅ Support matrix execution (multiple configs)

**GitHub Actions Template**:
```yaml
- name: RepoSense Quality Gate
  uses: ./.github/reposense-action/
  with:
    command: check
    strict: true
    config: .reposense/quality-gates.json
    
- name: Upload Artifacts
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: reposense-report
    path: .reposense/output/
```

---

### D4. Executive Artifacts 📊

**File**: `src/services/compliance/ReportExporter.ts`

Outputs:
```
reports/
  health-badge.svg           # Status badge (PASS/WARN/FAIL)
  summary.json               # Machine-readable: gates, scores, timestamp
  audit-bundle.zip           # Audit-ready export (all evidence)
  executive-summary.txt      # 1-page executive overview
```

**Guarantees**:
- ✅ CI badge reflects **current** gate status
- ✅ JSON summary is machine-parseable (schema versioned)
- ✅ ZIP contains all artifacts (deterministic)
- ✅ Export is portable (no internal paths)

**Implementation**:
- Badge generation (SVG)
- JSON schema versioning
- ZIP assembly with manifest
- Sanitization (no secrets, no internal paths)

---

## 4. Sprint 15 Exit Criteria

✅ **CLI**: All 4 commands execute successfully with deterministic output  
✅ **Gates**: Quality gate engine enforces thresholds, generates reports  
✅ **CI/CD**: GitHub, GitLab, Jenkins templates work end-to-end  
✅ **Artifacts**: Badges, JSON, ZIP exports are audit-ready  
✅ **Safety**: Zero mutation in CI mode (read-only analysis)  
✅ **Compilation**: All code compiles cleanly (0 TypeScript errors)  
✅ **Tests**: CLI, gates, templates all have verification suites  

---

## 5. Business Value Delivery

**Operational Impact**:
- Broken releases reduced by ~X% (automated enforcement)
- Deployment confidence increased (predictable gate behavior)
- Compliance proof accelerated (badge + export)

**Who Pays Attention Now**:
- 🔧 Platform / Release teams (primary buyer)
- 👨‍💼 Engineering leadership (measurable ROI)
- 📋 Compliance / Audit (exportable evidence)

**Business Signal**:
> "We reduced broken releases by X%. Every deployment is now validated by RepoSense policy."

---

## 6. Deliverable Checklist

| Deliverable | File(s) | Status | Tests |
|---|---|---|---|
| D1: CLI Engine | `src/cli/CLIEngine.ts` | 🔲 | scan, report, check, export |
| D2: Quality Gates | `src/services/analysis/QualityGateEngine.ts` | 🔲 | threshold enforcement, report generation |
| D3: CI/CD Templates | `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile` | 🔲 | workflow execution, artifact upload |
| D4: Executive Artifacts | `src/services/compliance/ReportExporter.ts` | 🔲 | badge, JSON, ZIP generation |

---

## 7. Integration Points

- ✅ CLI commands → Existing analysis engines (GapAnalysis, BackendAnalyzer, etc.)
- ✅ Quality gates → RunContextService + execution controller
- ✅ Reports → ReportGenerator (Sprint 11)
- ✅ Compliance export → Foundation from Sprint 17 (prepared)

---

## 8. Notes

- **No unsafe automation**: Quality gates *block* releases, they don't *modify* code
- **Determinism**: All CLI outputs reproducible with same inputs
- **Audit trail**: All runs have immutable timestamps + hashes
- **Scaling**: Templates support matrix execution, parallel gates

---

**Sprint 15 BUILD CONTRACT LOCKED** ✓
