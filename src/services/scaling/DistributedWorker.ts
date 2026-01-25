import { AgentOrchestrator, AgentType, AgentTask } from '../agents/AgentOrchestrator';
import { Logger } from '../../utils/Logger';

export interface WorkerCapability {
    type: AgentType;
    priority: number;
}

export interface WorkerNode {
    id: string;
    hostname: string;
    capabilities: WorkerCapability[];
    status: 'idle' | 'busy' | 'offline';
    lastSeen: number;
}

export class DistributedWorkerManager {
    private workers: Map<string, WorkerNode> = new Map();
    private logger: Logger;

    constructor(private orchestrator: AgentOrchestrator) {
        this.logger = Logger.getInstance();
    }

    public registerWorker(worker: WorkerNode): void {
        this.workers.set(worker.id, worker);
        this.logger.info('SCALING', `Worker registered: ${worker.id} (${worker.hostname})`);
    }

    public async dispatchTask(task: AgentTask): Promise<string | null> {
        const availableWorker = this.findAvailableWorker(task.type);
        
        if (!availableWorker) {
            this.logger.warn('SCALING', `No available workers for task type: ${task.type}. Running locally.`);
            return null;
        }

        this.logger.info('SCALING', `Dispatching task ${task.id} to worker ${availableWorker.id}`);
        availableWorker.status = 'busy';
        
        // Simulating network dispatch
        return availableWorker.id;
    }

    private findAvailableWorker(type: AgentType): WorkerNode | undefined {
        return Array.from(this.workers.values()).find(w => 
            w.status === 'idle' && 
            w.capabilities.some(c => c.type === type)
        );
    }

    public updateWorkerStatus(workerId: string, status: 'idle' | 'busy' | 'offline'): void {
        const worker = this.workers.get(workerId);
        if (worker) {
            worker.status = status;
            worker.lastSeen = Date.now();
        }
    }
}

let instance: DistributedWorkerManager | null = null;
export function getWorkerManager(orchestrator: AgentOrchestrator): DistributedWorkerManager {
    if (!instance) {
        instance = new DistributedWorkerManager(orchestrator);
    }
    return instance;
}
