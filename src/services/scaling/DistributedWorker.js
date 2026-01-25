"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedWorkerManager = void 0;
exports.getWorkerManager = getWorkerManager;
const Logger_1 = require("../../utils/Logger");
class DistributedWorkerManager {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.workers = new Map();
        this.logger = Logger_1.Logger.getInstance();
    }
    registerWorker(worker) {
        this.workers.set(worker.id, worker);
        this.logger.info('SCALING', `Worker registered: ${worker.id} (${worker.hostname})`);
    }
    async dispatchTask(task) {
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
    findAvailableWorker(type) {
        return Array.from(this.workers.values()).find(w => w.status === 'idle' &&
            w.capabilities.some(c => c.type === type));
    }
    updateWorkerStatus(workerId, status) {
        const worker = this.workers.get(workerId);
        if (worker) {
            worker.status = status;
            worker.lastSeen = Date.now();
        }
    }
}
exports.DistributedWorkerManager = DistributedWorkerManager;
let instance = null;
function getWorkerManager(orchestrator) {
    if (!instance) {
        instance = new DistributedWorkerManager(orchestrator);
    }
    return instance;
}
