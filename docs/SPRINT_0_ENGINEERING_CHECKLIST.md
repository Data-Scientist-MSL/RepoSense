# Sprint 0: Engineering Checklist & Contracts

**Duration:** 1 week  
**Goal:** Lock all contracts so teams work from blueprint, not guesses  
**Audience:** Engineering team (backend, frontend, devops)  

---

## Phase 1: Lock Storage Contracts (Day 1–2)

### Task 1.1: Finalize `.reposense/` Directory Structure

**Owner:** Lead Engineer  
**Time:** 2 hours  
**Deliverable:** `docs/STORAGE_CONTRACTS_v1.md` (finalized, reviewed)

**Checklist:**

- [ ] Directory tree approved by all team leads
- [ ] File naming conventions defined (no ambiguity)
- [ ] All required subdirectories listed
- [ ] `.gitignore` updated (`.reposense/` excluded)
- [ ] Placeholder directories created (git-tracked as `.gitkeep`)
- [ ] README updated with new structure
- [ ] PR created, reviewed, merged

**Acceptance Criteria:**

Every team member can answer:
- Q: Where do reports live?
  A: `.reposense/runs/<runId>/report/report.json`
- Q: How do I find the latest run?
  A: Read `.reposense/index.json` or resolve `.reposense/latest` symlink
- Q: Where do I store test artifacts?
  A: `.reposense/runs/<runId>/evidence/screenshots/`

---

### Task 1.2: Define Run Lifecycle State Machine

**Owner:** Lead Engineer  
**Time:** 3 hours  
**Deliverable:** `src/models/RunState.ts` + `docs/RUN_LIFECYCLE.md`

**Checklist:**

- [ ] 7 states defined + documented
  - [ ] CREATED (run folder initialized)
  - [ ] SCANNING (analysis in progress)
  - [ ] ANALYZED (scan complete)
  - [ ] GRAPHING (building graph.json)
  - [ ] COMPLETED (success)
  - [ ] FAILED (error)
  - [ ] CANCELLED (user stopped)
- [ ] State transitions documented (which states can transition to which)
- [ ] Error states defined (what happens on failure)
- [ ] Enum exported from `RunState.ts`
- [ ] TypeScript strict: zero errors
- [ ] Tests: state machine transitions validated

**Acceptance Criteria:**

```typescript
enum RunState {
  CREATED = 'CREATED',
  SCANNING = 'SCANNING',
  ANALYZED = 'ANALYZED',
  GRAPHING = 'GRAPHING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// Transitions:
CREATED → SCANNING
SCANNING → ANALYZED or FAILED
ANALYZED → GRAPHING or FAILED
GRAPHING → COMPLETED or FAILED
COMPLETED (terminal)
FAILED (terminal)
CANCELLED (terminal, can come from any non-terminal)
```

---

### Task 1.3: Freeze JSON Schemas (v1)

**Owner:** Backend Lead  
**Time:** 4 hours  
**Deliverable:** `src/schemas/` (Zod or JSON Schema)

**Checklist:**

- [ ] `RunMeta` schema defined
  ```typescript
  {
    runId: string;           // run-2026-01-21T14-23-45Z
    state: RunState;
    createdAt: string;       // ISO 8601
    startedAt?: string;
    completedAt?: string;
    duration?: number;       // ms
    error?: string;
    userId?: string;
  }
  ```
- [ ] `RunIndex` schema defined
  ```typescript
  {
    version: "1.0.0";
    workspace: { path, name, createdAt };
    runs: RunIndexEntry[];   // array of run summaries
    latestRunId: string;
    stats: { totalRuns, successfulRuns, failedRuns, lastRunAt };
  }
  ```
- [ ] `RunIndexEntry` schema defined
  ```typescript
  {
    runId: string;
    state: RunState;
    summary: { endpoints, gaps, coverage };
    artifacts: { hasReport, hasDiagrams, hasEvidence };
  }
  ```
- [ ] Zod validation exported
- [ ] All schemas tested (validation + rejection cases)
- [ ] Docs: explain why each field exists

**Acceptance Criteria:**

```typescript
import { runMetaSchema, runIndexSchema } from '../schemas';

const meta = { runId: '...', state: 'CREATED', ... };
const validated = runMetaSchema.parse(meta);  // ✓ or throw
```

---

### Task 1.4: Align on `.gitignore` Changes

**Owner:** DevOps  
**Time:** 1 hour  
**Deliverable:** Updated `.gitignore`

**Checklist:**

- [ ] `.reposense/` added to `.gitignore`
- [ ] `.reposense/.gitkeep` created (git-tracks directory)
- [ ] Verify: `git status` shows no `.reposense/` files
- [ ] README updated: "RepoSense runs are stored in `.reposense/` (git-ignored)"
- [ ] PR created, merged

**Acceptance Criteria:**

```bash
$ git status
nothing to commit

# But directory structure is tracked:
$ git ls-files
  .reposense/.gitkeep
  .reposense/runs/.gitkeep
  .reposense/cache/.gitkeep
  ... (all subdirectories)
```

---

## Phase 2: Define Run Execution Contracts (Day 2–3)

### Task 2.1: Document Run Execution Flow

**Owner:** Lead Engineer  
**Time:** 2 hours  
**Deliverable:** `docs/RUN_EXECUTION_FLOW.md`

**Checklist:**

- [ ] Step-by-step flow documented (pseudocode)
  1. User clicks "Scan"
  2. Generate runId (timestamp-based)
  3. Create `.reposense/runs/<runId>/` directory
  4. Save initial `run-metadata.json` (CREATED state)
  5. Emit event: `runCreated`
  6. Transition to SCANNING
  7. Run analysis (scan codebase)
  8. Save `scan.json`
  9. Transition to ANALYZED
  10. Build graph
  11. Save `graph.json`
  12. Transition to COMPLETED
  13. Update `.reposense/latest` pointer
  14. Emit event: `runCompleted`
- [ ] Error handling documented
  - On error: save error message to meta.json, transition to FAILED
  - Emit event: `runFailed`
- [ ] Event names finalized
  - [ ] `runCreated`
  - [ ] `runStarted`
  - [ ] `runStateChanged`
  - [ ] `runCompleted`
  - [ ] `runFailed`
  - [ ] `runCancelled`
- [ ] Event structure defined (what data each event carries)

**Acceptance Criteria:**

Every backend engineer can draw the flow on a whiteboard.

---

### Task 2.2: Define RunMeta & RunIndex File Formats (Finalized)

**Owner:** Backend Lead  
**Time:** 3 hours  
**Deliverable:** Sample JSON files + validation tests

**Checklist:**

- [ ] `run-metadata.json` sample created
  ```json
  {
    "runId": "run-2026-01-21T14-23-45Z",
    "state": "COMPLETED",
    "createdAt": "2026-01-21T14:23:45Z",
    "startedAt": "2026-01-21T14:23:46Z",
    "completedAt": "2026-01-21T14:24:12Z",
    "duration": 27000,
    "workspace": {
      "repositoryRoot": "/Users/engineer/myapp",
      "repositoryName": "myapp",
      "branch": "main"
    },
    "config": {
      "testFrameworks": ["playwright", "jest"]
    }
  }
  ```
- [ ] `.reposense/index.json` sample created
  ```json
  {
    "version": "1.0.0",
    "workspace": {
      "path": "/Users/engineer/myapp",
      "repositoryName": "myapp",
      "createdAt": "2026-01-21T00:00:00Z"
    },
    "runs": [
      {
        "runId": "run-2026-01-21T14-23-45Z",
        "state": "COMPLETED",
        "summary": {
          "totalEndpoints": 24,
          "testedEndpoints": 16,
          "coverage": 0.67,
          "gaps": 12
        },
        "artifacts": {
          "hasReport": true,
          "hasDiagrams": true,
          "hasEvidence": false
        }
      }
    ],
    "stats": {
      "totalRuns": 5,
      "successfulRuns": 4,
      "failedRuns": 1,
      "lastRunAt": "2026-01-21T14:24:12Z"
    }
  }
  ```
- [ ] Zod schemas created + tests (validation + rejection)
- [ ] All required/optional fields documented

**Acceptance Criteria:**

```typescript
// Can parse real files
const index = runIndexSchema.parse(require('./index.json'));

// Rejects invalid files
runIndexSchema.parse({ /* missing required field */ }); // throws
```

---

### Task 2.3: Define Event Emitter Interface

**Owner:** Backend Lead  
**Time:** 2 hours  
**Deliverable:** `src/services/RunEventBus.ts`

**Checklist:**

- [ ] EventEmitter interface defined
  ```typescript
  interface RunEventBus {
    on(event: RunEvent, listener: RunEventListener): void;
    off(event: RunEvent, listener: RunEventListener): void;
    emit(event: RunEvent, data: RunEventData): void;
  }
  ```
- [ ] All events defined (6 events)
- [ ] All event payloads typed
- [ ] Example: ChatBot can subscribe to `runCompleted`
- [ ] Example: WebView can subscribe to `runStateChanged`
- [ ] Tests: event emission + subscription

**Acceptance Criteria:**

```typescript
const bus = new RunEventBus();

bus.on('runCompleted', (data) => {
  console.log(`Run ${data.runId} completed`);
});

bus.emit('runCompleted', { runId: '...', status: 'SUCCESS' });
// Output: Run ... completed
```

---

## Phase 3: Type System Lock (Day 3–4)

### Task 3.1: Create Complete Type System

**Owner:** Backend Lead  
**Time:** 6 hours  
**Deliverable:** `src/models/RunTypes.ts` (comprehensive, finalized)

**Checklist:**

- [ ] All types exported
  - [ ] `RunState` enum
  - [ ] `RunMeta` interface
  - [ ] `RunIndexEntry` interface
  - [ ] `RunIndex` interface
- [ ] All types are immutable (use `readonly` where appropriate)
- [ ] No `any` types allowed
- [ ] JSDoc comments on every type + field
- [ ] TypeScript strict mode: zero errors
- [ ] Tests: Can import and use all types

**Example:**

```typescript
/**
 * Immutable run metadata
 * Persisted as .reposense/runs/<runId>/run-metadata.json
 */
export readonly interface RunMeta {
  /** Unique run identifier, timestamp-based: run-2026-01-21T14-23-45Z */
  readonly runId: string;
  
  /** Current state in lifecycle */
  readonly state: RunState;
  
  /** ISO 8601 timestamp when run was created */
  readonly createdAt: string;
  
  /** ISO 8601 timestamp when analysis started (optional) */
  readonly startedAt?: string;
  
  /** ISO 8601 timestamp when analysis completed (optional) */
  readonly completedAt?: string;
  
  /** Total duration in milliseconds (optional) */
  readonly duration?: number;
  
  /** Error message if state is FAILED (optional) */
  readonly error?: string;
}
```

**Acceptance Criteria:**

```bash
$ npm run compile
[Output] Compiling...
[Output] No errors

$ npm run type-check
[Output] All types valid
```

---

### Task 3.2: Create Validation Schemas

**Owner:** Backend Lead  
**Time:** 3 hours  
**Deliverable:** `src/schemas/RunSchemas.ts` (Zod-based)

**Checklist:**

- [ ] Zod schemas for all types
- [ ] Validation tests (>80% coverage)
  - [ ] Valid input accepted
  - [ ] Invalid input rejected with clear message
  - [ ] Edge cases handled (empty strings, negative numbers, etc.)
- [ ] Schema inference: TypeScript types derived from Zod

**Example:**

```typescript
import { z } from 'zod';

export const runStateSchema = z.enum([
  'CREATED', 'SCANNING', 'ANALYZED', 'GRAPHING', 'COMPLETED', 'FAILED', 'CANCELLED'
]);

export const runMetaSchema = z.object({
  runId: z.string().regex(/^run-\d{4}-\d{2}-\d{2}T.+$/),
  state: runStateSchema,
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  duration: z.number().positive().optional(),
  error: z.string().optional(),
});

export type RunMeta = z.infer<typeof runMetaSchema>;
```

---

## Phase 4: Documentation & Alignment (Day 4–5)

### Task 4.1: Write Comprehensive Storage Contracts Doc

**Owner:** Lead Engineer  
**Time:** 3 hours  
**Deliverable:** `docs/STORAGE_CONTRACTS_v1.md` (frozen)

**Checklist:**

- [ ] Executive summary (1 page)
- [ ] Directory tree (with explanations)
- [ ] File formats (JSON samples)
- [ ] State machine (diagram)
- [ ] Event flow (with examples)
- [ ] Error handling (what happens when scan fails)
- [ ] Backwards compatibility (how to handle schema changes in future)
- [ ] Examples (code snippets)

**Sections:**

```
1. Overview (this is the blueprint)
2. Directory Structure (tree)
3. File Formats (sample JSON)
4. Run Lifecycle (state machine)
5. Events (flow)
6. Error Handling
7. Examples (read meta, query index)
8. Design Decisions (why this way)
9. Future Extensibility (how to add new fields)
```

---

### Task 4.2: Team Alignment Meeting

**Owner:** Lead Engineer  
**Time:** 2 hours  
**Deliverable:** All team members can explain the plan

**Checklist:**

- [ ] Meeting scheduled (Friday EOD preferred)
- [ ] All leads attending (backend, frontend, devops)
- [ ] Presentation: 30 min
  - 10 min: Directory structure
  - 10 min: State machine
  - 10 min: Event flow
- [ ] Q&A: 20 min
- [ ] Team exercises: 10 min
  - "Where do you save meta.json?"
  - "What events fire during a scan?"
  - "How do you know if a run failed?"

**Success Criteria:**

- All engineers can answer 3/3 questions correctly
- No unresolved questions remain
- Consensus on the plan

---

### Task 4.3: Create Engineering README

**Owner:** Lead Engineer  
**Time:** 2 hours  
**Deliverable:** `docs/SPRINT_0_ENGINEERING_GUIDE.md`

**Checklist:**

- [ ] Quick reference
  - Directory layout
  - File locations
  - Type definitions
  - Event names
- [ ] Common tasks
  - "How to read index.json"
  - "How to save run metadata"
  - "How to emit an event"
- [ ] FAQ
  - "Why timestamp-based runId?"
  - "Why `.gitignore`?"
  - "How do I test this locally?"

---

## Phase 5: Code & Artifacts (Day 5)

### Task 5.1: Create Placeholder Structure

**Owner:** DevOps  
**Time:** 2 hours  
**Deliverable:** Git-tracked directory structure

**Checklist:**

- [ ] Create all directories (with `.gitkeep`)
  ```
  .reposense/
  ├── .gitkeep
  ├── config/
  │   └── .gitkeep
  ├── cache/
  │   ├── .gitkeep
  │   └── ast/
  │       └── .gitkeep
  └── runs/
      └── .gitkeep
  ```
- [ ] Verify: `git ls-files | grep .gitkeep` shows all
- [ ] README.md created in `.reposense/` (explains purpose)

---

### Task 5.2: Merge Sprint 0 PR

**Owner:** Lead Engineer  
**Time:** 1 hour  
**Deliverable:** All Sprint 0 code + docs merged to main

**Checklist:**

- [ ] PR created with all changes
- [ ] PR title: "Sprint 0: Foundation & Alignment"
- [ ] PR description includes:
  - Overview
  - Files changed
  - Design decisions
  - Testing notes
  - Migration guide (if applicable)
- [ ] Code review: 2+ approvals
- [ ] CI passes (lint, type check, tests)
- [ ] PR merged to main
- [ ] Tag created: `sprint-0-complete`

---

## Phase 6: Validation & Sign-Off (Day 5)

### Task 6.1: Verify All Contracts

**Owner:** Lead Engineer  
**Time:** 1 hour  
**Deliverable:** Checklist completed

**Verification:**

- [ ] All types compile (zero TypeScript errors)
- [ ] All schemas validate correctly
- [ ] All directories git-tracked
- [ ] All docs updated
- [ ] README reflects new structure
- [ ] Team can explain the plan

---

### Task 6.2: Sprint 0 Sign-Off

**Owner:** Lead Engineer + Team Leads  
**Time:** 30 min  
**Deliverable:** Sprint 0 complete ✅

**Sign-Off Criteria:**

- [ ] All deliverables completed
- [ ] All tests passing
- [ ] All docs written + reviewed
- [ ] PR merged
- [ ] Team aligned (all can explain the architecture)
- [ ] Ready to start Sprint 1 (RunOrchestrator backbone)

---

## Files to Create/Update in Sprint 0

| File | Type | Owner | Status |
|------|------|-------|--------|
| `src/models/RunState.ts` | TypeScript | Backend | New |
| `src/models/RunTypes.ts` | TypeScript | Backend | New |
| `src/schemas/RunSchemas.ts` | TypeScript | Backend | New |
| `src/services/RunEventBus.ts` | TypeScript | Backend | New |
| `docs/STORAGE_CONTRACTS_v1.md` | Markdown | Lead | New |
| `docs/RUN_LIFECYCLE.md` | Markdown | Lead | New |
| `docs/RUN_EXECUTION_FLOW.md` | Markdown | Lead | New |
| `docs/SPRINT_0_ENGINEERING_GUIDE.md` | Markdown | Lead | New |
| `.reposense/.gitkeep` | File | DevOps | New |
| `.gitignore` | Update | DevOps | Update |
| `README.md` | Update | Lead | Update |

---

## Success Metrics (Sprint 0)

| Metric | Target | Actual |
|--------|--------|--------|
| Docs written + reviewed | 4 | — |
| Type errors in Sprint 0 code | 0 | — |
| Tests passing | 100% | — |
| Team alignment meeting | 1 (2 hrs) | — |
| PR review time | <8 hrs | — |
| Time to merge | <24 hrs | — |

---

## Notes for Sprint 1

When Sprint 1 begins, use these contracts:

1. Import types from `src/models/RunTypes.ts`
2. Validate using schemas from `src/schemas/RunSchemas.ts`
3. Emit events via `RunEventBus`
4. Follow file structure from `docs/STORAGE_CONTRACTS_v1.md`
5. Refer to `docs/RUN_EXECUTION_FLOW.md` for the flow

**No guessing. No divergence. One blueprint.**

