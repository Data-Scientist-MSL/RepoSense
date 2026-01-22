# Quick Start: RepoSense RunOrchestrator

## For Users

### Running a Complete Pipeline

1. **Open your workspace in VS Code**
   ```
   code /path/to/your-project
   ```

2. **Trigger orchestrated run**
   - Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type: `RepoSense: Orchestrated Run`
   - Press Enter

3. **Watch the progress**
   - Notification shows current phase (Scanning → Executing → Reporting)
   - Status bar updates with phase name
   - Estimated total time: 2-5 minutes

4. **Review the report**
   - When complete: "RepoSense run complete!" message
   - Click "View Report" to open results
   - Results also saved to `.reposense/runs/<runId>/report.md`

### What Gets Generated

```
.reposense/runs/<run-id>/
├── scan.json                  # Gap detection results
├── plan.json                  # Test generation plans
├── execution-results.json     # Test execution output
├── report.md                  # Human-readable report
├── report.json                # Machine-readable report
├── report.html                # (Optional) HTML version
├── generated-tests/           # Generated test files
│   ├── playwright/
│   │   └── endpoint-name.happy.test.ts
│   └── jest/
│       └── endpoint-name.happy.test.ts
├── screenshots/               # Test screenshots (if captured)
└── logs/                       # Execution logs
```

---

## For Developers

### Understanding the Flow

```typescript
// 1. Create a run context
const orchestrator = getOrchestrator('.reposense');
const run = await orchestrator.createRun(workspaceRoot, {
    generateTests: true,
    runTests: true,
    captureScreenshots: true,
    frameworks: [TestFramework.PLAYWRIGHT, TestFramework.JEST]
});

// 2. Transition through phases
await orchestrator.transitionTo(run.runId, RunState.SCANNING);
// ... run analysis ...
await orchestrator.transitionTo(run.runId, RunState.PLANNING);
// ... plan tests ...
await orchestrator.transitionTo(run.runId, RunState.GENERATING);
// ... generate tests ...
```

### Listening to Events

```typescript
orchestrator.on('run:state-changed', (event) => {
    console.log(`State: ${event.data.from} → ${event.data.to}`);
    updateStatusBar(event.data.to);
});

orchestrator.on('generation:progress', (event) => {
    console.log(`Generated ${event.data.count} test candidates`);
});

orchestrator.on('execution:complete', (event) => {
    console.log(`Tests: ${event.data.passed}/${event.data.total} passed`);
});

orchestrator.on('run:error', (event) => {
    console.error(`Error in ${event.data.stage}: ${event.data.message}`);
});
```

### Accessing Results

```typescript
// Get complete run context
const results = await orchestrator.getRunResults(runId);
console.log(`Found ${results.analysisResult.gaps.length} gaps`);
console.log(`Generated ${results.generatedTestPlans.length} test plans`);
console.log(`Executed ${results.executionResults.length} test suites`);

// Get just the report
const report = await orchestrator.getRunReport(runId);
console.log(report.markdownContent);
console.log(report.metrics); // coverage %, pass rate, etc.
```

---

## For Integration

### Extend with Custom Frameworks

Add a new test framework:

```typescript
// In TestCoverageAnalyzer.ts
const FRAMEWORK_CONFIGS: Record<string, TestFrameworkConfig> = {
    'my-framework': {
        testPatterns: ['**/*.my-test.ts'],
        extractTestCases: extractMyFrameworkTestCases,
        extractEndpoints: extractMyFrameworkEndpoints
    }
};

// Implement extractors
function extractMyFrameworkTestCases(content: string): TestCase[] {
    // Parse your framework's test syntax
    // Return array of TestCase objects
}
```

### Extend with Custom Report Formats

```typescript
// In extension.ts or custom service
function generateCustomReport(report: ReportArtifact): string {
    // Transform report to your format (XML, PDF, etc.)
    return customFormat;
}

await artifactStore.saveReport({
    ...report,
    customContent: generateCustomReport(report)
});
```

### Hook into Event Bus

```typescript
// Custom metrics collection
orchestrator.on('run:complete', (event) => {
    const run = orchestrator.getRun(event.runId);
    recordMetrics({
        duration: run.duration,
        gapsFound: run.analysisResult.gaps.length,
        coverage: run.reportArtifact.metrics.coverage
    });
});
```

---

## For Testing

### Test the Orchestrator

```typescript
import { RunOrchestrator, RunState, RunConfig } from './services/RunOrchestrator';

describe('RunOrchestrator', () => {
    let orchestrator: RunOrchestrator;

    beforeEach(() => {
        orchestrator = new RunOrchestrator();
    });

    test('creates run with IDLE state', async () => {
        const run = await orchestrator.createRun('/workspace', {
            generateTests: true,
            autoApply: false,
            runTests: true,
            frameworks: [],
            timeoutMs: 60000
        });

        expect(run.state).toBe(RunState.IDLE);
        expect(run.runId).toBeDefined();
        expect(run.stateHistory.length).toBeGreaterThan(0);
    });

    test('enforces valid state transitions', async () => {
        const run = await orchestrator.createRun('/workspace', {/* ... */});

        // Valid: IDLE → SCANNING
        await orchestrator.transitionTo(run.runId, RunState.SCANNING);

        // Invalid: SCANNING → IDLE should throw
        expect(
            orchestrator.transitionTo(run.runId, RunState.IDLE)
        ).rejects.toThrow();
    });

    test('records errors during execution', async () => {
        const run = await orchestrator.createRun('/workspace', {/* ... */});

        orchestrator.recordError(
            run.runId,
            'Test execution failed',
            'ERROR'
        );

        const updated = orchestrator.getRun(run.runId);
        expect(updated.errors.length).toBe(1);
        expect(updated.errors[0].message).toContain('Test execution failed');
    });
});
```

### Test Test Coverage Analysis

```typescript
import { TestCoverageAnalyzer } from './services/analysis/TestCoverageAnalyzer';

describe('TestCoverageAnalyzer', () => {
    let analyzer: TestCoverageAnalyzer;

    beforeEach(() => {
        analyzer = new TestCoverageAnalyzer();
    });

    test('finds jest test files', async () => {
        const testFiles = await analyzer.findTestFiles('/workspace');

        expect(testFiles.length).toBeGreaterThan(0);
        expect(testFiles[0].framework).toBe('jest');
        expect(testFiles[0].testCases.length).toBeGreaterThan(0);
    });

    test('detects untested endpoints', () => {
        const endpoints = [
            { method: 'GET', path: '/users', file: 'api.ts', line: 10 },
            { method: 'POST', path: '/users', file: 'api.ts', line: 20 }
        ];

        const coverage = { 'GET /users': { tested: true, testIds: ['1'] } };
        // POST /users not in coverage

        const gaps = analyzer.detectUntestedEndpoints(endpoints, coverage);

        expect(gaps.length).toBe(1);
        expect(gaps[0].type).toBe(GapType.UNTESTED_ENDPOINT);
        expect(gaps[0].severity).toBe(GapSeverity.HIGH);
    });
});
```

---

## Troubleshooting

### Command not found
- Ensure extension is activated (check Output > "RepoSense" channel)
- Try reloading VS Code window (`Cmd+R` / `Ctrl+R`)

### No gaps detected
- Ensure you have `.ts`, `.js`, `.tsx`, `.jsx`, `.py` files
- Check LSP language server started (Output channel)
- Try manual `reposense.scanRepository` command first

### Tests not executed
- Check that test files exist (`.test.ts`, `.spec.ts`, etc.)
- Verify test framework is installed (`npm list` or `pip list`)
- Check logs in `.reposense/runs/<runId>/logs/`

### Ollama not available
- Download & run: `ollama pull mistral` or `ollama pull llama2`
- Start Ollama: `ollama serve` (separate terminal)
- Verify: `curl http://localhost:11434/api/tags`

### Report not generated
- Check: `.reposense/runs/<runId>/report.md` exists
- Check: Permission to write to workspace
- Check: Output console for errors

---

## Advanced Usage

### Automate Runs

```typescript
// Run every hour
setInterval(() => {
    vscode.commands.executeCommand('reposense.orchestratedRun');
}, 60 * 60 * 1000);
```

### Custom Gap Filtering

```typescript
const run = await orchestrator.getRunResults(runId);
const criticalGaps = run.analysisResult.gaps.filter(
    g => g.severity === 'CRITICAL'
);
const highPriority = criticalGaps.sort(
    (a, b) => b.priorityScore - a.priorityScore
).slice(0, 5);
```

### Export Results

```typescript
const report = await orchestrator.getRunReport(runId);

// Save as JSON
fs.writeFileSync('report.json', JSON.stringify(report, null, 2));

// Share markdown
fs.copyFileSync(
    `.reposense/runs/${runId}/report.md`,
    './ANALYSIS_RESULTS.md'
);

// Archive all artifacts
await artifactStore.exportRun(runId, 'export.json');
```

---

## Next Steps

1. **Try it**: Run `reposense.orchestratedRun` command
2. **Check output**: Look in `.reposense/runs/<runId>/`
3. **Read report**: Open generated `report.md`
4. **Review tests**: Check `generated-tests/` directory
5. **Integrate**: Hook into extension events for custom workflows

---

## Support

- **Documentation**: See `docs/ORCHESTRATOR_IMPLEMENTATION.md`
- **Issues**: Check `src/` files for error handling patterns
- **Examples**: Look at test files in `src/test/`

---

Enjoy automated API gap detection and test generation! 🚀
