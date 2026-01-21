# Delivery Sprint Program: Team Onboarding & Quick Start

**Version:** 1.0  
**For:** Engineers starting on RepoSense Delivery Sprints  
**Date:** January 21, 2026  
**Duration to Read:** 15 min  

---

## You Are Here

RepoSense is moving from **design phase** to **8-week delivery sprints**.

**What that means:**
- ✅ Architecture locked (no more "should we use...?")
- ✅ Every week produces demo-able value
- ✅ Your work converges into one shipped product
- ✅ Governance + safety built in (not bolted on later)

---

## The 8-Week Plan at a Glance

| Week | Sprint | What Ships | Users Can Do |
|------|--------|-----------|--------------|
| 1 | 0 | Contracts locked | (Engineering only) |
| 2 | 1 | Run backbone | Create immutable runs |
| 3 | 2 | Graph model | Reports from one source |
| 4–5 | 3 | Report engine | View beautiful reports |
| 6 | 4 | Diagrams | Click to code |
| 7 | 5 | Evidence | Prove claims with screenshots |
| 8 | 6 | ChatBot v1 | "What do I do next?" answered |
| 9 | 7 | Safe generation | Generate + apply fixes |
| 10 | 8 | Enterprise mode | Run in CI, track trends |

**Exit state:** Shipped, auditable, enterprise-ready system.

---

## Your Role

### If You're Backend (40 hrs/week)

**Sprint 0:** Create type system, schemas, event bus  
**Sprint 1:** Implement RunOrchestrator backbone  
**Sprint 2–3:** Graph builder + report generator  
**Sprint 4–5:** Evidence service + evidence index  
**Sprint 6–7:** ChatBotService, generation engines  
**Sprint 8:** Run comparator, CLI mode  

**Success:** Zero TypeScript errors, >75% test coverage.

### If You're Frontend (40 hrs/week)

**Sprint 0:** Understand storage model  
**Sprint 1–2:** (Wait for backend APIs)  
**Sprint 3:** Report WebView (tabs, charts)  
**Sprint 4:** Diagram WebView (clickable nodes)  
**Sprint 5:** Evidence panel  
**Sprint 6:** ChatBot panel + context  
**Sprint 7–8:** Generation preview UI  

**Success:** Responsive UI, <2s load time, zero console errors.

### If You're DevOps (20 hrs/week)

**Sprint 0:** Directory structure, `.gitignore`  
**Sprint 1:** Task runner (CLI mode)  
**Sprint 2–5:** Test infrastructure  
**Sprint 6–7:** Evidence capture (screenshots, logs)  
**Sprint 8:** GitHub Actions, export/zip  

**Success:** Reproducible builds, working CI pipeline.

---

## Documents You Must Read Now

### 1. Delivery Sprints Plan (30 min read)
**File:** `docs/DELIVERY_SPRINTS_8WEEKS.md`

**Why:** Understand the full vision + your role in it.

**Key sections:**
- Guiding principles (why this approach)
- Timeline (weeks 1–10)
- Your sprint assignments
- Demo scripts (what success looks like)

### 2. Sprint 0 Engineering Checklist (20 min read)
**File:** `docs/SPRINT_0_ENGINEERING_CHECKLIST.md`

**Why:** Know exactly what's locking in Week 1.

**Your task:**
- If backend: Create type system + schemas
- If frontend: Understand the types (don't change them)
- If devops: Set up directory structure

### 3. Storage Model (15 min read)
**File:** `docs/STORAGE_MODELS_SPEC.md`

**Why:** This is the backbone. Everything reads/writes from `.reposense/`.

**Key section:** `.reposense/` directory layout (you'll reference this constantly).

### 4. ChatBot Storage Integration (20 min read, Backend + Frontend)
**File:** `docs/CHATBOT_STORAGE_INTEGRATION.md`

**Why:** Understand how discovery services work.

**Key section:** 7 ChatBot intents + storage queries (shows pattern for all future features).

---

## Week 1 (Sprint 0): Your First 5 Days

### Day 1: Kickoff

- [ ] Read the 4 docs above
- [ ] Attend team alignment meeting (2 hrs)
- [ ] Ask questions in Slack #reposense-eng

### Day 2–3: Your Sprint 0 Task

**Backend:**
- [ ] Create `src/models/RunTypes.ts` (all types, immutable)
- [ ] Create `src/schemas/RunSchemas.ts` (Zod validation)
- [ ] Create `src/services/RunEventBus.ts` (event emitter)
- [ ] Write tests (>80% coverage)
- [ ] Zero TypeScript errors

**Frontend:**
- [ ] Read `docs/STORAGE_CONTRACTS_v1.md` when backend finishes
- [ ] Understand where reports/diagrams/evidence live
- [ ] Design ReportPanel tab layout (on whiteboard)

**DevOps:**
- [ ] Create `.reposense/` directory structure
- [ ] Update `.gitignore` to ignore `.reposense/`
- [ ] Create placeholder directories with `.gitkeep`

### Day 4: Code Review

- [ ] Submit PR (title: "Sprint 0: [Your Component]")
- [ ] Link to docs/checklist in PR description
- [ ] Request 2+ reviewers
- [ ] Address feedback

### Day 5: Merge & Sign-Off

- [ ] PR merged to main
- [ ] All tests passing
- [ ] Tag created: `sprint-0-complete-[component]`
- [ ] Ready for Sprint 1

---

## Standing Ceremonies (All Sprints)

### Daily Standup (15 min, 9:30 AM)
**What:** 1-min updates per person
- What I finished yesterday
- What I'm doing today
- Any blockers?

### Sprint Review (1 hr, Friday 4 PM)
**What:** Demo + metrics
- Show it working (demo video)
- LOC written, tests passing, coverage ↑
- Demo script: "User can now..."

### Retro (30 min, Friday 4:45 PM)
**What:** What went well, what didn't, what to fix next sprint

### Backlog Refinement (30 min, Friday 5:30 PM)
**What:** Planning for next sprint

---

## Communication

### Slack Channels

- `#reposense-eng` — General discussion
- `#reposense-prs` — All PR notifications
- `#reposense-demo` — Demo videos
- `#reposense-blockers` — Urgent blockers only

### Document Updates

All docs are in `docs/` folder. Make changes directly:
- PR to update docs (same as code PRs)
- Docs reviewed by lead engineer
- Never commit stale docs

### Office Hours

- Tech lead: Monday 2 PM, Friday 10 AM (30 min, optional)
- Questions? Drop in Slack #reposense-eng

---

## Definition of "Done" (Every PR)

No exception:

- [ ] Code compiles (`npm run compile` → 0 errors)
- [ ] Tests pass (`npm run test` → all green)
- [ ] Coverage >75% on new code
- [ ] Linter passes (`npm run lint`)
- [ ] TypeScript strict mode passes
- [ ] PR reviewed by tech lead (2+ approvals)
- [ ] Demo video OR screenshots
- [ ] Docs updated
- [ ] Merged to main

If any of these are missing, PR gets **requested changes**.

---

## Quality Standards

### Code Style
- ESLint strict (config: `.eslintrc.json`)
- Prettier formatting (auto on save)
- No `any` types (TypeScript strict)
- JSDoc on public functions

### Testing
- Unit tests for all services
- Integration tests for workflows
- Mocking: jest.mock() for external services
- Coverage: 75%+ minimum

### Documentation
- README updated if you add new service
- Inline comments for complex logic
- API docs generated from JSDoc

### Performance
- Report load: <2s
- Diagram render: <1s
- ChatBot response: <500ms
- No memory leaks (use --inspect if needed)

---

## Tools & Setup

### Required
- Node.js 18+
- TypeScript 5+
- VSCode (extensions: ESLint, Prettier, Thunder Client)

### Installation
```bash
git clone <repo>
cd ReproSense
npm install
npm run compile
npm run test
```

### Local Dev Workflow
```bash
# Terminal 1: Watch mode (auto-recompile)
npm run watch

# Terminal 2: Run tests
npm run test:watch

# Terminal 3: Open in VSCode
code .
```

### Debugging
```bash
# Debug tests
node --inspect-brk ./node_modules/.bin/jest

# Debug extension
F5 in VSCode (launch config provided)
```

---

## Branching & PRs

### Branch Naming
```
sprint-N-feature-name
sprint-1-run-orchestrator
sprint-2-graph-builder
```

### PR Template
```markdown
## Sprint N: [Feature]

**What:** Brief description

**Why:** Why this matters (user impact)

**Demo:** How to see it working

**Tests:** New test files + coverage

**Docs:** Updated files
```

### Review SLA
- Assigned: <4 hrs
- Approved/Changes: <8 hrs after feedback
- Merged: <12 hrs after approval

---

## Common Mistakes to Avoid

| Mistake | Why Bad | How to Fix |
|---------|---------|-----------|
| Merging without tests | Bugs ship to main | `npm run test` before push |
| Changing contracts mid-sprint | Breaks other teams | Lock in Sprint 0, don't change |
| Skipping docs | Future maintainers lost | Doc as you code |
| Ignoring linter errors | Inconsistent code | Run `npm run lint --fix` |
| No demo in PR | Can't verify it works | Screenshot or video, always |
| Scope creep | Sprint fails | Ask tech lead before adding scope |

---

## Your First PR Checklist

Before submitting first PR:

- [ ] Read `docs/SPRINT_0_ENGINEERING_CHECKLIST.md`
- [ ] Understand your assigned task
- [ ] Code compiles + tests pass locally
- [ ] Created demo (screenshot or video)
- [ ] Docs updated
- [ ] PR template filled out
- [ ] Assigned 2+ reviewers
- [ ] Posted in #reposense-prs channel

---

## Getting Help

### "I'm blocked"
1. Check `docs/` for answer
2. Ask in #reposense-eng
3. Ping tech lead (Slack)
4. Escalate to lead engineer if urgent

### "What do I do next?"
1. Check sprint board (Jira/GitHub Projects)
2. Ask in standup (daily 9:30 AM)
3. Check backlog refinement notes (Friday 5:30 PM)

### "Is this the right approach?"
1. Check design docs
2. Ask in PR (reviewers will catch)
3. Office hours with tech lead

---

## Success = Shipping Together

This is a **coordinated effort**. Your code is only done when:
- ✅ It integrates with others' code
- ✅ Tests pass
- ✅ Users can demo it
- ✅ Docs are current

**One codebase. One vision. One shipped product.**

---

## Next Steps

1. ✅ Read the 4 docs (45 min)
2. ✅ Attend kickoff + alignment (2 hrs)
3. ✅ Start Sprint 0 task (2 hrs)
4. ✅ Submit first PR (by end of Day 4)
5. ✅ Ship it (Day 5)

**See you at standup tomorrow at 9:30 AM.**

---

## Appendix: Document Map

Quick reference for all architecture docs:

| Document | Purpose | Read Time |
|----------|---------|-----------|
| `docs/DELIVERY_SPRINTS_8WEEKS.md` | Full plan + per-sprint details | 30 min |
| `docs/SPRINT_0_ENGINEERING_CHECKLIST.md` | Week 1 tasks + exit criteria | 20 min |
| `docs/STORAGE_MODELS_SPEC.md` | `.reposense/` architecture | 15 min |
| `docs/STORAGE_AND_CHATBOT_INTEGRATION_COMPLETE.md` | How ChatBot finds artifacts | 20 min |
| `docs/RUN_LIFECYCLE.md` | Run state machine | 10 min |
| `docs/RUN_EXECUTION_FLOW.md` | Step-by-step scan flow | 10 min |
| `docs/CHATBOT_STORAGE_INTEGRATION.md` | 7 ChatBot intents + storage queries | 20 min |

**Start with:** Delivery Sprints → Sprint 0 Checklist → Storage Models

