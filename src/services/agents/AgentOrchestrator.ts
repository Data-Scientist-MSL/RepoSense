import { EventEmitter } from 'events';
import { RunContext } from '../../models/RunOrchestrator';

export enum AgentType {
    REMEDIATION = 'remediation',
    TEST_GENERATION = 'test_generation',
    AUDIT = 'audit',
    UIUX = 'ui_ux',
    CONSULTANT = 'consultant'
}

export interface AgentTask {
    id: string;
    type: AgentType;
    status: 'pending' | 'running' | 'completed' | 'failed';
    input: any;
    output?: any;
    startTime?: number;
    endTime?: number;
    error?: string;
}

export class AgentOrchestrator extends EventEmitter {
    private tasks: Map<string, AgentTask> = new Map();
    private activeAgents: Set<AgentType> = new Set();

    constructor() {
        super();
    }

    async createTask(type: AgentType, input: any): Promise<AgentTask> {
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const task: AgentTask = {
            id: taskId,
            type,
            status: 'pending',
            input,
        };
        this.tasks.set(taskId, task);
        this.emit('taskCreated', task);
        return task;
    }

    async runTask(taskId: string, worker: (input: any) => Promise<any>): Promise<AgentTask> {
        const task = this.tasks.get(taskId);
        if (!task) throw new Error(`Task ${taskId} not found`);

        task.status = 'running';
        task.startTime = Date.now();
        this.activeAgents.add(task.type);
        this.emit('taskStarted', task);

        try {
            task.output = await worker(task.input);
            task.status = 'completed';
        } catch (error: any) {
            task.status = 'failed';
            task.error = error.message;
            this.emit('taskFailed', task);
        } finally {
            task.endTime = Date.now();
            this.activeAgents.delete(task.type);
            this.emit('taskCompleted', task);
        }

        return task;
    }

    getTask(taskId: string): AgentTask | undefined {
        return this.tasks.get(taskId);
    }

    getAllTasks(): AgentTask[] {
        return Array.from(this.tasks.values());
    }

    isAgentActive(type: AgentType): boolean {
        return this.activeAgents.has(type);
    }
}

let instance: AgentOrchestrator | null = null;
export function getAgentOrchestrator(): AgentOrchestrator {
    if (!instance) {
        instance = new AgentOrchestrator();
    }
    return instance;
}
