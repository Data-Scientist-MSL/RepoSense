export class BatchProcessor<T, R> {
    private queue: BatchItem<T, R>[] = [];
    private processing: boolean = false;
    private batchSize: number;
    private batchDelayMs: number;
    private processor: (items: T[]) => Promise<R[]>;
    private timeout: NodeJS.Timeout | undefined;

    constructor(
        processor: (items: T[]) => Promise<R[]>,
        options: BatchProcessorOptions = {}
    ) {
        this.processor = processor;
        this.batchSize = options.batchSize || 10;
        this.batchDelayMs = options.batchDelayMs || 100;
    }

    public async add(item: T): Promise<R> {
        return new Promise((resolve, reject) => {
            this.queue.push({ item, resolve, reject });
            this.scheduleProcess();
        });
    }

    public async addMany(items: T[]): Promise<R[]> {
        const promises = items.map(item => this.add(item));
        return Promise.all(promises);
    }

    private scheduleProcess(): void {
        if (this.processing) return;

        // Clear existing timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        // Process immediately if batch is full
        if (this.queue.length >= this.batchSize) {
            this.processBatch();
        } else {
            // Schedule processing after delay
            this.timeout = setTimeout(() => {
                this.processBatch();
            }, this.batchDelayMs);
        }
    }

    private async processBatch(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;

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
                } else {
                    batchItem.reject(new Error('No result for item'));
                }
            });
        } catch (error) {
            // Reject all items in batch
            const batch = this.queue.splice(0, this.batchSize);
            batch.forEach(batchItem => {
                batchItem.reject(error);
            });
        } finally {
            this.processing = false;

            // Process next batch if queue not empty
            if (this.queue.length > 0) {
                this.scheduleProcess();
            }
        }
    }

    public async flush(): Promise<void> {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        while (this.queue.length > 0) {
            await this.processBatch();
        }
    }

    public clear(): void {
        this.queue = [];
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
    }

    public getQueueSize(): number {
        return this.queue.length;
    }
}

interface BatchItem<T, R> {
    item: T;
    resolve: (result: R) => void;
    reject: (error: any) => void;
}

interface BatchProcessorOptions {
    batchSize?: number;
    batchDelayMs?: number;
}

// Parallel processor for CPU-intensive tasks
export class ParallelProcessor<T, R> {
    private concurrency: number;
    private activeCount: number = 0;
    private queue: ParallelTask<T, R>[] = [];

    constructor(concurrency: number = 4) {
        this.concurrency = Math.max(1, concurrency);
    }

    public async process(items: T[], processor: (item: T) => Promise<R>): Promise<R[]> {
        const results: (R | Error)[] = new Array(items.length);
        const tasks: Promise<void>[] = [];

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

        return results as R[];
    }

    private async processItem<T, R>(
        item: T,
        processor: (item: T) => Promise<R>,
        index: number,
        results: (R | Error)[]
    ): Promise<void> {
        // Wait for available slot
        while (this.activeCount >= this.concurrency) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        this.activeCount++;

        try {
            results[index] = await processor(item);
        } catch (error) {
            results[index] = error instanceof Error ? error : new Error(String(error));
        } finally {
            this.activeCount--;
        }
    }

    public setConcurrency(concurrency: number): void {
        this.concurrency = Math.max(1, concurrency);
    }

    public getActiveTasks(): number {
        return this.activeCount;
    }
}

interface ParallelTask<T, R> {
    item: T;
    processor: (item: T) => Promise<R>;
    resolve: (result: R) => void;
    reject: (error: any) => void;
}

// Debouncer for frequent operations
export class Debouncer {
    private timers: Map<string, NodeJS.Timeout> = new Map();

    public debounce(key: string, fn: () => void, delayMs: number): void {
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

    public cancel(key: string): void {
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
    }

    public cancelAll(): void {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
    }
}

// Throttler for rate limiting
export class Throttler {
    private lastExecutionTimes: Map<string, number> = new Map();

    public throttle(key: string, fn: () => void, minIntervalMs: number): void {
        const now = Date.now();
        const lastExecution = this.lastExecutionTimes.get(key) || 0;
        const timeSinceLastExecution = now - lastExecution;

        if (timeSinceLastExecution >= minIntervalMs) {
            fn();
            this.lastExecutionTimes.set(key, now);
        }
    }

    public reset(key: string): void {
        this.lastExecutionTimes.delete(key);
    }

    public resetAll(): void {
        this.lastExecutionTimes.clear();
    }
}
