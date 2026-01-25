"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = void 0;
exports.measurePerformance = measurePerformance;
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.activeTimers = new Map();
        this.maxMetricsPerOperation = 100;
    }
    static getInstance() {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }
    startTimer(operation, metadata) {
        const timer = {
            id: `${operation}_${Date.now()}_${Math.random()}`,
            operation,
            startTime: performance.now(),
            startMemory: process.memoryUsage().heapUsed,
            metadata: metadata || {}
        };
        this.activeTimers.set(timer.id, timer);
        return timer;
    }
    endTimer(timer) {
        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;
        const metric = {
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
    recordMetric(metric) {
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
    getSlowThreshold(operation) {
        const thresholds = {
            'extension.activate': 500,
            'scan.file': 100,
            'scan.repository': 30000,
            'llm.generate': 10000,
            'test.generate': 5000,
            'remediation.generate': 5000
        };
        return thresholds[operation] || 1000;
    }
    getStats(operation) {
        if (operation) {
            return this.calculateStats(this.metrics.get(operation) || []);
        }
        // Aggregate all operations
        const allMetrics = [];
        this.metrics.forEach(metrics => allMetrics.push(...metrics));
        return this.calculateStats(allMetrics);
    }
    calculateStats(metrics) {
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
    generateReport() {
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
    checkBudgets() {
        const budgets = [
            { operation: 'extension.activate', maxDuration: 500, maxMemory: 50 * 1024 * 1024 },
            { operation: 'scan.file', maxDuration: 100, maxMemory: 10 * 1024 * 1024 },
            { operation: 'scan.repository', maxDuration: 30000, maxMemory: 200 * 1024 * 1024 },
            { operation: 'llm.generate', maxDuration: 15000, maxMemory: 50 * 1024 * 1024 }
        ];
        const violations = [];
        for (const budget of budgets) {
            const stats = this.getStats(budget.operation);
            if (stats.count === 0)
                continue;
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
    clearMetrics(operation) {
        if (operation) {
            this.metrics.delete(operation);
        }
        else {
            this.metrics.clear();
        }
    }
    getActiveTimers() {
        return Array.from(this.activeTimers.values());
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
// Convenience wrapper
function measurePerformance(operation, fn, metadata) {
    const monitor = PerformanceMonitor.getInstance();
    const timer = monitor.startTimer(operation, metadata);
    const finish = (result) => {
        monitor.endTimer(timer);
        return result;
    };
    const handleError = (error) => {
        monitor.endTimer(timer);
        throw error;
    };
    try {
        const result = fn();
        if (result instanceof Promise) {
            return result.then(finish).catch(handleError);
        }
        return Promise.resolve(finish(result));
    }
    catch (error) {
        return Promise.reject(handleError(error));
    }
}
