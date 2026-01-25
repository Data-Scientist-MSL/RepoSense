# 🎬 Live Browser Preview - Complete User Guide

Transform browser testing into a **cinematic experience** with real-time visualization of AI agents testing your application inside VS Code.

---

## 🎯 What You Get

### **Real-Time Visual Feedback**
Watch your AI agent work in real-time:
- 📱 **Live browser view** showing exactly what the agent sees
- 🎬 **Step-by-step playback** of every action
- 🧠 **Agent's thinking process** displayed in real-time
- 📊 **Network traffic monitoring** showing all API calls
- 📸 **Automatic screenshots** at key moments
- ⏱️ **Live progress tracking** with duration timer

### **Professional Testing Dashboard**
A production-quality interface featuring:
- **Split-pane layout** - sidebar + main view + bottom panel
- **Browser chrome** - realistic browser UI frame
- **Tabbed bottom panel** - Network, Console, Screenshots
- **Live status updates** - Running, completed, failed
- **Export capabilities** - Save reports as MD/HTML/JSON

---

## 📦 Installation & Setup

1. **Configure LLM**: Ensure Ollama is running (`ollama run deepseek-coder:6.7b`).
2. **Set Base URL**: Open VS Code Settings and set `reposense.browserTesting.baseUrl` to your app's local URL.

## 🚀 Usage

### **Test with Live Preview**
Right-click any detected gap in the RepoSense view and select **"Test with Live Preview"**. This will:
1. Open the **🤖 Live Testing Preview** panel.
2. Launch the AI agent.
3. Stream all screenshots and reasoning directly to the workspace.

### **Manual Test**
Use the Command Palette (`Ctrl+Shift+P`) and type: **"RepoSense: Test with Live Preview"**. You will be prompted to enter a custom task for the agent.

---

## 🎨 UI Components

### **Steps List (Sidebar)**
Shows the current goal, the specific action taken, and the agent's internal "thought process" for each step.

### **Agent Thinking (Main View)**
A dedicated box that translates the AI's complex reasoning into human-friendly explanations.

### **Network Tab (Bottom)**
A real-time ticker of all API requests and responses made by the application while the agent is interacting with it.

---

## 🛠️ Troubleshooting

If the preview is not updating:
1. Check the **RepoSense** Output Channel for process logs.
2. Ensure your `.venv` is properly configured with `browser-use`.
3. Verify that the application is actually running at the specified `baseUrl`.

---
*Powered by RepoSense AI and browser-use.*
