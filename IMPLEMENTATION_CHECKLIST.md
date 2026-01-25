# ✅ Implementation Checklist: Live Browser Preview

Follow this 30-minute quick start guide to enable real-time AI browser testing in RepoSense.

---

## Phase 1: File Setup (5 minutes)

### ☐ Create Directory Structure
```powershell
mkdir -p src/services, src/providers, live_updates, screenshots
```

### ☐ Verify Core Files
Ensure these files are in place:
- [ ] `src/services/AgenticBrowserTestingService.ts`
- [ ] `src/providers/LiveBrowserPreviewPanel.ts`
- [ ] `src/services/EnhancedAgenticTestingService.ts`
- [ ] `src/services/agent_test_bridge.py`

---

## Phase 2: Configuration (5 minutes)

### ☐ Update `package.json`
Add the following commands to the `contributes.commands` section:
- `reposense.testWithLivePreview` (Icon: `$(eye)`)
- `reposense.openLivePreview` (Icon: `$(browser)`)

### ☐ Register Commands in `extension.ts`
```typescript
import { registerEnhancedAgenticCommands } from './services/EnhancedAgenticTestingService';

export function activate(context: vscode.ExtensionContext) {
    // ...
    registerEnhancedAgenticCommands(context, outputChannel);
}
```

---

## Phase 3: Python Environment (10 minutes)

### ☐ Initialize Virtual Environment
```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install browser-use langchain-openai langchain-ollama playwright
playwright install chromium
```

### ☐ Verify Local AI (Ollama)
```powershell
ollama pull deepseek-coder:6.7b
ollama serve
```

---

## Phase 4: Verification (10 minutes)

### ☐ Build and Launch
1. Run `npm run compile`.
2. Press `F5` to start Extension Development Host.
3. Scan a repository via the RepoSense sidebar.

### ☐ Test Live Preview
1. Right-click a gap in the sidebar.
2. Select **"Test with Live Preview"**.
3. Verify:
    - [ ] Status badge updates to **RUNNING**.
    - [ ] Live screenshots appear in the center panel.
    - [ ] Network logs stream in the bottom tab.
    - [ ] Agent thinking updates in real-time.

---
*For detailed troubleshooting, see [LIVE_BROWSER_PREVIEW_GUIDE.md](./LIVE_BROWSER_PREVIEW_GUIDE.md).*
