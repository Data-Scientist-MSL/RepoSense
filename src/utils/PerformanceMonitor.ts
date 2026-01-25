

export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metrics: Map<string, OperationMetric[]> = new Map();
    private activeTimers: Map<string, PerformanceTimer> = new Map();
    private readonly maxMetricsPerOperation = 100;

    private constructor() {}

    public static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    public startTimer(operation: string, metadata?: Record<string, unknown>): PerformanceTimer {
        const timer: PerformanceTimer = {
            id: `${operation}_${Date.now()}_${Math.random()}`,
            operation,
            startTime: performance.now(),
            startMemory: process.memoryUsage().heapUsed,
            metadata: metadata || {}
        };

        this.activeTimers.set(timer.id, timer);
        return timer;
    }

    public endTimer(timer: PerformanceTimer): OperationMetric {
        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;

        const metric: OperationMetric = {
            operation: timer.operation,
            duration: endTime - timer.startTime,
            memoryDelta: endMemory - timer.startMemory,
            timestamp: new Date().toISOString(),
            metadata: timer.metadata
        };

        this.recordMetric(metric);
        this.activeTimers.delete(timer.id);

        return metric;
    }

    private recordMetric(metric: OperationMetric): void {
        const metrics = this.metrics.get(metric.operation) || [];
        metrics.push(metric);

        // Keep only recent metrics
        if (metrics.length > this.maxMetricsPerOperation) {
            metrics.shift();
        }

        this.metrics.set(metric.operation, metrics);

        // Log slow operations
        if (metric.duration > this.getSlowThreshold(metric.operation)) {
            console.warn(`[Performance] Slow operation detected:`, {
                operation: metric.operation,
                duration: `${metric.duration.toFixed(2)}ms`,
                memory: `${(metric.memoryDelta / 1024 / 1024).toFixed(2)}MB`,
                metadata: metric.metadata
            });
        }
    }

    private getSlowThreshold(operation: string): number {
        const thresholds: Record<string, number> = {
            'extension.activate': 500,
            'scan.file': 100,
            'scan.repository': 30000,
            'llm.generate': 10000,
            'test.generate': 5000,
            'remediation.generate': 5000
        };

        return thresholds[operation] || 1000;
    }

    public getStats(operation?: string): PerformanceStats {
        if (operation) {
            return this.calculateStats(this.metrics.get(operation) || []);
        }

        // Aggregate all operations
        const allMetrics: OperationMetric[] = [];
        this.metrics.forEach(metrics => allMetrics.push(...metrics));
        return this.calculateStats(allMetrics);
    }

    private calculateStats(metrics: OperationMetric[]): PerformanceStats {
        if (metrics.length === 0) {
            return {
                count: 0,
                avgDuration: 0,
                minDuration: 0,
                maxDuration: 0,
                p95Duration: 0,
                p99Duration: 0,
                avgMemoryDelta: 0,
                maxMemoryDelta: 0
            };
        }

        const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
        const memoryDeltas = metrics.map(m => m.memoryDelta);

        return {
            count: metrics.length,
            avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
            minDuration: durations[0],
            maxDuration: durations[durations.length - 1],
            p95Duration: durations[Math.floor(durations.length * 0.95)],
            p99Duration: durations[Math.floor(durations.length * 0.99)],
            avgMemoryDelta: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
            maxMemoryDelta: Math.max(...memoryDeltas)
        };
    }

    public generateReport(): string {
        const operations = Array.from(this.metrics.keys()).sort();
        let report = '# RepoSense Performance Report\n\n';
        report += `Generated: ${new Date().toISOString()}\n\n`;

        for (const operation of operations) {
            const stats = this.getStats(operation);
            report += `## ${operation}\n`;
            report += `- **Count**: ${stats.count}\n`;
            report += `- **Avg Duration**: ${stats.avgDuration.toFixed(2)}ms\n`;
            report += `- **Min/Max Duration**: ${stats.minDuration.toFixed(2)}ms / ${stats.maxDuration.toFixed(2)}ms\n`;
            report += `- **P95/P99**: ${stats.p95Duration.toFixed(2)}ms / ${stats.p99Duration.toFixed(2)}ms\n`;
            report += `- **Avg Memory**: ${(stats.avgMemoryDelta / 1024 / 1024).toFixed(2)}MB\n`;
            report += `- **Max Memory**: ${(stats.maxMemoryDelta / 1024 / 1024).toFixed(2)}MB\n\n`;
        }

        // Memory usage summary
        const memUsage = process.memoryUsage();
        report += `## Current Memory Usage\n`;
        report += `- **Heap Used**: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB\n`;
        report += `- **Heap Total**: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB\n`;
        report += `- **RSS**: ${(memUsage.rss / 1024 / 1024).toFixed(2)}MB\n`;
        report += `- **External**: ${(memUsage.external / 1024 / 1024).toFixed(2)}MB\n\n`;

        return report;
    }

    public checkBudgets(): BudgetViolation[] {
        const budgets: PerformanceBudget[] = [
            { operation: 'extension.activate', maxDuration: 500, maxMemory: 50 * 1024 * 1024 },
            { operation: 'scan.file', maxDuration: 100, maxMemory: 10 * 1024 * 1024 },
            { operation: 'scan.repository', maxDuration: 30000, maxMemory: 200 * 1024 * 1024 },
            { operation: 'llm.generate', maxDuration: 15000, maxMemory: 50 * 1024 * 1024 }
        ];

        const violations: BudgetViolation[] = [];

        for (const budget of budgets) {
            const stats = this.getStats(budget.operation);
            if (stats.count === 0) continue;

            if (stats.avgDuration > budget.maxDuration) {
                violations.push({
                    operation: budget.operation,
                    metric: 'duration',
                    expected: budget.maxDuration,
                    actual: stats.avgDuration,
                    severity: stats.avgDuration > budget.maxDuration * 1.5 ? 'critical' : 'warning'
                });
            }

            if (stats.avgMemoryDelta > budget.maxMemory) {
                violations.push({
                    operation: budget.operation,
                    metric: 'memory',
                    expected: budget.maxMemory,
                    actual: stats.avgMemoryDelta,
                    severity: stats.avgMemoryDelta > budget.maxMemory * 1.5 ? 'critical' : 'warning'
                });
            }
        }

        return violations;
    }

    public clearMetrics(operation?: string): void {
        if (operation) {
            this.metrics.delete(operation);
        } else {
            this.metrics.clear();
        }
    }

    public getActiveTimers(): PerformanceTimer[] {
        return Array.from(this.activeTimers.values());
    }
}

export interface PerformanceTimer {
    id: string;
    operation: string;
    startTime: number;
    startMemory: number;
    metadata: Record<string, unknown>;
}

export interface OperationMetric {
    operation: string;
    duration: number;
    memoryDelta: number;
    timestamp: string;
    metadata: Record<string, unknown>;
}

export interface PerformanceStats {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    p99Duration: number;
    avgMemoryDelta: number;
    maxMemoryDelta: number;
}

export interface PerformanceBudget {
    operation: string;
    maxDuration: number;
    maxMemory: number;
}

export interface BudgetViolation {
    operation: string;
    metric: 'duration' | 'memory';
    expected: number;
    actual: number;
    severity: 'warning' | 'critical';
}

// Convenience wrapper
export function measurePerformance<T>(
    operation: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, unknown>
): Promise<T> {
    const monitor = PerformanceMonitor.getInstance();
    const timer = monitor.startTimer(operation, metadata);

    const finish = (result: T) => {
        monitor.endTimer(timer);
        return result;
    };

    const handleError = (error: unknown) => {
        monitor.endTimer(timer);
        throw error;
    };

    try {
        const result = fn();
        if (result instanceof Promise) {
            return result.then(finish).catch(handleError);
        }
        return Promise.resolve(finish(result));
    } catch (error) {
        return Promise.reject(handleError(error));
    }
}
