class GAIPMWorkerSim {
    constructor(updateFn, logFn) {
        this.update = updateFn;
        this.log = logFn;
        this.steps = [
            { 
                task: 'Discovering Code Gaps', 
                thinking: 'Scanning repository for architectural inconsistencies...', 
                progress: 20, 
                logs: [
                    { msg: 'Indexing src/services...', type: 'thinking' },
                    { msg: 'Found 3 orphaned routes in auth-service', type: 'action' }
                ]
            },
            { 
                task: 'Analyzing UI/UX Integrity', 
                thinking: 'Running accessibility audits on discovered endpoints...', 
                progress: 50, 
                logs: [
                    { msg: 'Mocking browser environment for /login', type: 'system' },
                    { msg: 'Detected missing aria-labels in UserForm.tsx', type: 'action' }
                ]
            },
            { 
                task: 'Synthesizing Strategic Advice', 
                thinking: 'Coordinating with Consultant Agent for roadmap generation...', 
                progress: 80, 
                logs: [
                    { msg: 'Sending findings to Master Orchestrator', type: 'thinking' },
                    { msg: 'Unified Strategic Roadmap finalized', type: 'action' }
                ]
            }
        ];
    }

    async run() {
        for (const step of this.steps) {
            this.update(step.task, step.thinking, step.progress);
            for (const log of step.logs) {
                await this.delay(800);
                this.log(log.msg, log.type);
            }
            await this.delay(1500);
        }
        this.update('Goal Achieved', 'Detailed report saved to RepoSense vault.', 100);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
