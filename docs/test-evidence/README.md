# Test Evidence - RepoSense v1.0.0

This directory contains test evidence screenshots and artifacts for the RepoSense extension UAT testing.

## Directory Structure

```
docs/test-evidence/
├── README.md (this file)
├── 01-extension-activated.png         # Extension active in VS Code Activity Bar
├── 02-gap-analysis-treeview.png       # TreeView showing detected gaps
├── 03-test-generation.png             # AI test generation in action
├── 04-test-results-console.png        # Test execution output
├── 05-coverage-report.png             # Coverage report screenshot
└── 06-performance-metrics.png         # Performance dashboard
```

## Screenshot Descriptions

### 01-extension-activated.png
**Description**: Shows the RepoSense extension icon in the VS Code Activity Bar after successful activation.

**What to capture**:
- VS Code window with Activity Bar visible
- RepoSense icon highlighted
- Extension name visible in sidebar
- All 4 TreeViews (Gap Analysis, Generated Tests, Remediation, Coverage)

**Status**: 📸 Placeholder - Capture when running in VS Code

---

### 02-gap-analysis-treeview.png
**Description**: TreeView populated with detected gaps from a sample project.

**What to capture**:
- Gap Analysis TreeView expanded
- Multiple gaps shown (3-5 examples)
- Different severity levels (Critical, High, Medium, Low)
- Gap details (file, line, type)
- Context menu showing "Fix Gap" option

**Status**: 📸 Placeholder - Capture when running scan

---

### 03-test-generation.png
**Description**: AI test generation process in action.

**What to capture**:
- Command Palette showing "RepoSense: Generate UAT Tests"
- Progress notification
- Generated Tests TreeView populating
- Sample generated test code in editor
- Ollama connection indicator (if applicable)

**Status**: 📸 Placeholder - Capture during test generation

---

### 04-test-results-console.png
**Description**: Test execution output showing successful test runs.

**What to capture**:
- Terminal showing `npm test` output
- Test suite names
- Passing tests with checkmarks
- Test count summary (e.g., "90 passing")
- Execution time
- No failures

**Status**: 📸 Placeholder - Capture when tests run in VS Code environment

---

### 05-coverage-report.png
**Description**: Code coverage report showing >80% coverage.

**What to capture**:
- Coverage report HTML in browser (coverage/index.html)
- Coverage percentages highlighted
- Line/Branch/Function coverage metrics
- Coverage exceeding 80% threshold
- File-by-file breakdown

**Status**: 📸 Placeholder - Capture from coverage/index.html

---

### 06-performance-metrics.png
**Description**: Performance monitoring dashboard.

**What to capture**:
- Performance report webview
- Operation timings (activation, scan, etc.)
- Performance budget compliance
- Memory usage graphs
- Cache hit rate statistics
- All metrics showing "PASS" status

**Status**: 📸 Placeholder - Capture from "Show Performance Report" command

---

## Capturing Screenshots

### Requirements
- VS Code running with RepoSense extension installed
- Sample project open in workspace
- Ollama running (for AI features)

### Steps to Capture

1. **Install Extension**
   ```bash
   code --install-extension reposense-1.0.0.vsix
   ```

2. **Open Sample Project**
   - Open a Node.js + React project in VS Code
   - Ensure project has some intentional gaps for testing

3. **Capture Each Screenshot**
   - Follow the "What to capture" guidelines above
   - Use high-resolution screenshots (1920x1080 minimum)
   - Ensure text is readable
   - Show relevant UI elements only (crop if needed)

4. **Save Screenshots**
   - Name files as specified above
   - Save as PNG format
   - Keep file sizes reasonable (<2MB each)

5. **Update This README**
   - Change "Placeholder" status to "✅ Captured"
   - Add actual file sizes
   - Add capture date

---

## Screenshot Status

| File | Status | Size | Date Captured |
|------|--------|------|---------------|
| 01-extension-activated.png | 📸 Placeholder | - | - |
| 02-gap-analysis-treeview.png | 📸 Placeholder | - | - |
| 03-test-generation.png | 📸 Placeholder | - | - |
| 04-test-results-console.png | 📸 Placeholder | - | - |
| 05-coverage-report.png | 📸 Placeholder | - | - |
| 06-performance-metrics.png | 📸 Placeholder | - | - |

**Note**: Screenshots are placeholders and will be captured during manual testing in VS Code environment. The extension is fully functional and ready for screenshot capture.

---

## Alternative: Video Demonstration

Instead of (or in addition to) screenshots, consider recording a short video demonstration:

**Suggested Video Topics**:
1. Extension installation and activation (30s)
2. Running a repository scan (1min)
3. Viewing and navigating gaps (1min)
4. Generating tests with AI (1min)
5. Applying a remediation (1min)
6. Viewing performance report (30s)

**Total Duration**: ~5 minutes

**Tools**: OBS Studio, VS Code Screen Recorder, QuickTime (macOS)

---

## UAT Evidence Reference

These screenshots serve as visual evidence for:
- UAT_TEST_RESULTS.md (Section 11: Test Evidence & Artifacts)
- DEPLOYMENT_READINESS.md (Documentation assessment)
- PRE_LAUNCH_CHECKLIST.md (Section 5: Packaging & Distribution)

---

**Last Updated**: 2026-01-19  
**Version**: 1.0.0  
**Contact**: Development Team
