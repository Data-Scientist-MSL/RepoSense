"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Throttler = exports.Debouncer = exports.ParallelProcessor = exports.BatchProcessor = void 0;
class BatchProcessor {
    constructor(processor, options = {}) {
        this.queue = [];
        this.processing = false;
        this.processor = processor;
        this.batchSize = options.batchSize || 10;
        this.batchDelayMs = options.batchDelayMs || 100;
    }
    async add(item) {
        return new Promise((resolve, reject) => {
            this.queue.push({ item, resolve, reject });
            this.scheduleProcess();
        });
    }
    async addMany(items) {
        const promises = items.map(item => this.add(item));
        return Promise.all(promises);
    }
    scheduleProcess() {
        if (this.processing)
            return;
        // Clear existing timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        // Process immediately if batch is full
        if (this.queue.length >= this.batchSize) {
            this.processBatch();
        }
        else {
            // Schedule processing after delay
            this.timeout = setTimeout(() => {
                this.processBatch();
            }, this.batchDelayMs);
        }
    }
    async processBatch() {
        if (this.processing || this.queue.length === 0)
            return;
        this.processing = true;
        try {
            // Extract batch
            const batch = this.queue.splice(0, this.batchSize);
            const items = batch.map(b => b.item);
            // Process batch
            const results = await this.processor(items);
            // Resolve promises
            batch.forEach((batchItem, index) => {
                if (results[index] !== undefined) {
                    batchItem.resolve(results[index]);
                }
                else {
                    batchItem.reject(new Error('No result for item'));
                }
            });
        }
        catch (error) {
            // Reject all items in batch
            const batch = this.queue.splice(0, this.batchSize);
            batch.forEach(batchItem => {
                batchItem.reject(error);
            });
        }
        finally {
            this.processing = false;
            // Process next batch if queue not empty
            if (this.queue.length > 0) {
                this.scheduleProcess();
            }
        }
    }
    async flush() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        while (this.queue.length > 0) {
            await this.processBatch();
        }
    }
    clear() {
        this.queue = [];
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
    }
    getQueueSize() {
        return this.queue.length;
    }
}
exports.BatchProcessor = BatchProcessor;
// Parallel processor for CPU-intensive tasks
class ParallelProcessor {
    constructor(concurrency = 4) {
        this.activeCount = 0;
        this.queue = [];
        this.concurrency = Math.max(1, concurrency);
    }
    async process(items, processor) {
        const results = new Array(items.length);
        const tasks = [];
        for (let i = 0; i < items.length; i++) {
            const task = this.processItem(items[i], processor, i, results);
            tasks.push(task);
        }
        await Promise.all(tasks);
        // Check for errors
        const errors = results.filter(r => r instanceof Error);
        if (errors.length > 0) {
            throw new Error(`${errors.length} items failed to process`);
        }
        return results;
    }
    async processItem(item, processor, index, results) {
        // Wait for available slot
        while (this.activeCount >= this.concurrency) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        this.activeCount++;
        try {
            results[index] = await processor(item);
        }
        catch (error) {
            results[index] = error instanceof Error ? error : new Error(String(error));
        }
        finally {
            this.activeCount--;
        }
    }
    setConcurrency(concurrency) {
        this.concurrency = Math.max(1, concurrency);
    }
    getActiveTasks() {
        return this.activeCount;
    }
}
exports.ParallelProcessor = ParallelProcessor;
// Debouncer for frequent operations
class Debouncer {
    constructor() {
        this.timers = new Map();
    }
    debounce(key, fn, delayMs) {
        // Clear existing timer
        const existing = this.timers.get(key);
        if (existing) {
            clearTimeout(existing);
        }
        // Set new timer
        const timer = setTimeout(() => {
            fn();
            this.timers.delete(key);
        }, delayMs);
        this.timers.set(key, timer);
    }
    cancel(key) {
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
    }
    cancelAll() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
    }
}
exports.Debouncer = Debouncer;
// Throttler for rate limiting
class Throttler {
    constructor() {
        this.lastExecutionTimes = new Map();
    }
    throttle(key, fn, minIntervalMs) {
        const now = Date.now();
        const lastExecution = this.lastExecutionTimes.get(key) || 0;
        const timeSinceLastExecution = now - lastExecution;
        if (timeSinceLastExecution >= minIntervalMs) {
            fn();
            this.lastExecutionTimes.set(key, now);
        }
    }
    reset(key) {
        this.lastExecutionTimes.delete(key);
    }
    resetAll() {
        this.lastExecutionTimes.clear();
    }
}
exports.Throttler = Throttler;
