document.addEventListener('DOMContentLoaded', () => {
    const runBtn = document.getElementById('run-analysis-btn');
    const logStream = document.getElementById('log-stream');
    const activeTasks = document.getElementById('active-tasks');
    const gapsResolved = document.getElementById('gaps-resolved');
    const currentTask = document.getElementById('current-task');
    const agentThinking = document.getElementById('agent-thinking');
    const progressBar = document.getElementById('task-progress');
    const roadmapContent = document.getElementById('roadmap-content');

    const addLog = (text, type = 'system') => {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
        logStream.prepend(entry);
    };

    const updateUI = (task, thinking, progress) => {
        currentTask.textContent = task;
        agentThinking.textContent = thinking;
        progressBar.style.width = `${progress}%`;
    };

    const generateRoadmap = () => {
        roadmapContent.innerHTML = `
            <ul class="roadmap-list">
                <li class="roadmap-step">
                    <h4>Phase 1: Foundation</h4>
                    <p>Integrate GAI-PMWorker with local vault and establish secure tunnel.</p>
                </li>
                <li class="roadmap-step">
                    <h4>Phase 2: Deep Analysis</h4>
                    <p>Execute agentic scans across 45+ endpoints to identify orphaned components.</p>
                </li>
                <li class="roadmap-step">
                    <h4>Phase 3: Remediation</h4>
                    <p>Automated PR generation with 98% confidence scoring.</p>
                </li>
            </ul>
        `;
    };

    runBtn.addEventListener('click', async () => {
        runBtn.disabled = true;
        runBtn.textContent = 'Analysis In Progress...';
        activeTasks.textContent = '1';
        
        addLog('Initializing Heroic Analysis Suite...', 'system');
        
        const worker = new GAIPMWorkerSim(updateUI, addLog);
        await worker.run();
        
        activeTasks.textContent = '0';
        gapsResolved.textContent = (parseInt(gapsResolved.textContent) + 3).toString();
        runBtn.textContent = 'Analysis Complete';
        generateRoadmap();
        
        addLog('Strategic Roadmap Generated Successfully.', 'action');
    });
});
