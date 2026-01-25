"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOrchestrator = exports.AgentType = void 0;
exports.getAgentOrchestrator = getAgentOrchestrator;
const events_1 = require("events");
var AgentType;
(function (AgentType) {
    AgentType["REMEDIATION"] = "remediation";
    AgentType["TEST_GENERATION"] = "test_generation";
    AgentType["AUDIT"] = "audit";
    AgentType["UIUX"] = "ui_ux";
    AgentType["CONSULTANT"] = "consultant";
})(AgentType || (exports.AgentType = AgentType = {}));
class AgentOrchestrator extends events_1.EventEmitter {
    constructor() {
        super();
        this.tasks = new Map();
        this.activeAgents = new Set();
    }
    async createTask(type, input) {
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const task = {
            id: taskId,
            type,
            status: 'pending',
            input,
        };
        this.tasks.set(taskId, task);
        this.emit('taskCreated', task);
        return task;
    }
    async runTask(taskId, worker) {
        const task = this.tasks.get(taskId);
        if (!task)
            throw new Error(`Task ${taskId} not found`);
        task.status = 'running';
        task.startTime = Date.now();
        this.activeAgents.add(task.type);
        this.emit('taskStarted', task);
        try {
            task.output = await worker(task.input);
            task.status = 'completed';
        }
        catch (error) {
            task.status = 'failed';
            task.error = error.message;
            this.emit('taskFailed', task);
        }
        finally {
            task.endTime = Date.now();
            this.activeAgents.delete(task.type);
            this.emit('taskCompleted', task);
        }
        return task;
    }
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    isAgentActive(type) {
        return this.activeAgents.has(type);
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
let instance = null;
function getAgentOrchestrator() {
    if (!instance) {
        instance = new AgentOrchestrator();
    }
    return instance;
}
