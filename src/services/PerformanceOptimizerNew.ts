/**
 * Sprint 7: Performance Optimizer & Caching Service
 * Optimizes diagram generation, enables lazy loading, parallel test execution
 * Reduces response times and improves scalability
 */

export interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttlMs: number;
  hits: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  avgResponseTimeMs: number;
  memoryUsageMB: number;
}

export interface LazyLoadConfig {
  chunkSize: number;
  preloadThreshold: number;
  maxConcurrentLoads: number;
  timeoutMs: number;
}

export interface ParallelExecutionConfig {
  maxWorkers: number;
  taskQueueSize: number;
  timeoutMs: number;
  retryAttempts: number;
}

export class PerformanceOptimizer {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheStats: CacheStats = {
    totalEntries: 0,
    hitRate: 0,
    missRate: 0,
    avgResponseTimeMs: 0,
    memoryUsageMB: 0,
  };
  private lazyLoadConfig: LazyLoadConfig;
  private parallelConfig: ParallelExecutionConfig;
  private responseTimings: number[] = [];

  constructor(
    lazyLoadConfig?: Partial<LazyLoadConfig>,
    parallelConfig?: Partial<ParallelExecutionConfig>
  ) {
    this.lazyLoadConfig = {
      chunkSize: lazyLoadConfig?.chunkSize ?? 100,
      preloadThreshold: lazyLoadConfig?.preloadThreshold ?? 0.8,
      maxConcurrentLoads: lazyLoadConfig?.maxConcurrentLoads ?? 4,
      timeoutMs: lazyLoadConfig?.timeoutMs ?? 5000,
    };

    this.parallelConfig = {
      maxWorkers: parallelConfig?.maxWorkers ?? 8,
      taskQueueSize: parallelConfig?.taskQueueSize ?? 1000,
      timeoutMs: parallelConfig?.timeoutMs ?? 30000,
      retryAttempts: parallelConfig?.retryAttempts ?? 3,
    };
  }

  /**
   * Cache diagram generation results with TTL
   */
  public cacheDiagram(
    diagramId: string,
    diagramData: any,
    ttlSeconds: number = 3600
  ): void {
    const key = `diagram:${diagramId}`;
    this.cache.set(key, {
      key,
      value: diagramData,
      timestamp: Date.now(),
      ttlMs: ttlSeconds * 1000,
      hits: 0,
    });
    this.cacheStats.totalEntries = this.cache.size;
  }

  /**
   * Retrieve cached diagram
   */
  public getCachedDiagram(diagramId: string): any | null {
    const key = `diagram:${diagramId}`;
    const entry = this.cache.get(key);

    if (!entry) {
      this.recordCacheMiss();
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      this.cacheStats.totalEntries = this.cache.size;
      this.recordCacheMiss();
      return null;
    }

    entry.hits++;
    this.recordCacheHit();
    return entry.value;
  }

  /**
   * Lazy load large data in chunks
   */
  public async *lazyLoadData(
    totalItems: number,
    dataFetcher: (start: number, end: number) => Promise<any[]>
  ): AsyncGenerator<any[]> {
    const chunkSize = this.lazyLoadConfig.chunkSize;
    const preloadThreshold = this.lazyLoadConfig.preloadThreshold;
    const maxConcurrent = this.lazyLoadConfig.maxConcurrentLoads;

    let currentIndex = 0;
    const preloadedChunks: Map<number, any[]> = new Map();
    let preloadIndex = 0;

    while (currentIndex < totalItems) {
      // Preload chunks ahead of time
      while (
        preloadIndex < totalItems &&
        preloadedChunks.size < maxConcurrent
      ) {
        const start = preloadIndex;
        const end = Math.min(preloadIndex + chunkSize, totalItems);
        preloadIndex = end;

        // Async preload
        dataFetcher(start, end).then((data) => {
          preloadedChunks.set(start, data);
        });
      }

      // Wait for current chunk if not ready
      const start = currentIndex;
      const end = Math.min(currentIndex + chunkSize, totalItems);

      let retries = 0;
      while (!preloadedChunks.has(start) && retries < 100) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        retries++;
      }

      if (preloadedChunks.has(start)) {
        const chunk = preloadedChunks.get(start)!;
        preloadedChunks.delete(start);
        yield chunk;
      }

      currentIndex = end;
    }
  }

  /**
   * Execute tests in parallel with worker pool
   */
  public async executeParallel(
    tasks: Array<{ id: string; execute: () => Promise<any> }>,
    onTaskComplete?: (result: any) => void
  ): Promise<any[]> {
    const maxWorkers = this.parallelConfig.maxWorkers;
    const results: any[] = new Array(tasks.length);
    const startTime = Date.now();

    const executeWithRetry = async (task: any, index: number): Promise<void> => {
      let lastError: any;

      for (let attempt = 0; attempt < this.parallelConfig.retryAttempts; attempt++) {
        try {
          const taskStartTime = Date.now();
          const result = await Promise.race([
            task.execute(),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('Task timeout')),
                this.parallelConfig.timeoutMs
              )
            ),
          ]);

          const taskDuration = Date.now() - taskStartTime;
          this.recordTiming(taskDuration);
          results[index] = { id: task.id, success: true, data: result };
          onTaskComplete?.(results[index]);
          return;
        } catch (error) {
          lastError = error;
          if (attempt < this.parallelConfig.retryAttempts - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, attempt) * 100)
            );
          }
        }
      }

      results[index] = {
        id: task.id,
        success: false,
        error: lastError?.message || 'Unknown error',
      };
    };

    // Execute with worker pool concurrency
    for (let i = 0; i < tasks.length; i += maxWorkers) {
      const batch = tasks.slice(i, i + maxWorkers);
      const batchPromises = batch.map((task, batchIndex) =>
        executeWithRetry(task, i + batchIndex)
      );

      await Promise.all(batchPromises);
    }

    this.recordTiming(Date.now() - startTime);
    return results;
  }

  /**
   * Batch multiple diagram generations
   */
  public async batchGenerateDiagrams(
    diagramConfigs: Array<{ id: string; type: string; data: any }>
  ): Promise<any[]> {
    const tasks = diagramConfigs.map((config) => ({
      id: config.id,
      execute: async () => {
        // Check cache first
        const cached = this.getCachedDiagram(config.id);
        if (cached) return cached;

        // Generate and cache
        const generated = this.generateDiagramInternal(config);
        this.cacheDiagram(config.id, generated);
        return generated;
      },
    }));

    return this.executeParallel(tasks);
  }

  /**
   * Optimize gap analysis by using cached graph data
   */
  public optimizeGapAnalysis(
    graphData: any,
    useCache: boolean = true
  ): any {
    const cacheKey = `analysis:${JSON.stringify(graphData).substring(0, 50)}`;

    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.recordCacheHit();
        cached.hits++;
        return cached.value;
      }
    }

    // Perform analysis
    const result = {
      testedEndpoints: this.extractTestedEndpoints(graphData),
      untestedEndpoints: this.extractUntestedEndpoints(graphData),
      gapClusters: this.clusterGaps(graphData),
      optimizationSuggestions: this.generateOptimizations(graphData),
    };

    if (useCache) {
      this.cache.set(cacheKey, {
        key: cacheKey,
        value: result,
        timestamp: Date.now(),
        ttlMs: 1800000, // 30 minutes
        hits: 0,
      });
      this.recordCacheMiss();
    }

    return result;
  }

  /**
   * Get cache performance statistics
   */
  public getCacheStats(): CacheStats {
    const totalHits = this.cacheStats.hitRate;
    const totalMisses = this.cacheStats.missRate;
    const totalRequests = totalHits + totalMisses;

    return {
      totalEntries: this.cache.size,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      missRate: totalRequests > 0 ? totalMisses / totalRequests : 0,
      avgResponseTimeMs:
        this.responseTimings.length > 0
          ? this.responseTimings.reduce((a, b) => a + b, 0) /
            this.responseTimings.length
          : 0,
      memoryUsageMB: this.estimateMemoryUsage(),
    };
  }

  /**
   * Clear cache by pattern or all
   */
  public clearCache(pattern?: string): number {
    if (!pattern) {
      const count = this.cache.size;
      this.cache.clear();
      this.cacheStats.totalEntries = 0;
      return count;
    }

    let removed = 0;
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        removed++;
      }
    }

    this.cacheStats.totalEntries = this.cache.size;
    return removed;
  }

  /**
   * Get cache entry details
   */
  public getCacheInfo(): Array<{ key: string; hits: number; ageMs: number }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      ageMs: now - entry.timestamp,
    }));
  }

  // Private helper methods

  private recordCacheHit(): void {
    this.cacheStats.hitRate++;
  }

  private recordCacheMiss(): void {
    this.cacheStats.missRate++;
  }

  private recordTiming(durationMs: number): void {
    this.responseTimings.push(durationMs);
    if (this.responseTimings.length > 1000) {
      this.responseTimings = this.responseTimings.slice(-500);
    }
  }

  private estimateMemoryUsage(): number {
    let bytes = 0;
    for (const entry of this.cache.values()) {
      bytes += JSON.stringify(entry.value).length * 2; // UTF-16 estimate
    }
    return bytes / (1024 * 1024); // Convert to MB
  }

  private generateDiagramInternal(config: any): any {
    return {
      id: config.id,
      type: config.type,
      mermaid: `graph TB\n    A[${config.type}]`,
      checksum: this.calculateChecksum(config),
      generated: Date.now(),
    };
  }

  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private extractTestedEndpoints(graphData: any): string[] {
    return graphData.nodes
      ?.filter((n: any) => n.type === 'TESTED_ENDPOINT')
      .map((n: any) => n.id) || [];
  }

  private extractUntestedEndpoints(graphData: any): string[] {
    return graphData.nodes
      ?.filter((n: any) => n.type === 'UNTESTED_ENDPOINT')
      .map((n: any) => n.id) || [];
  }

  private clusterGaps(graphData: any): any[] {
    const gaps = graphData.nodes?.filter((n: any) => n.type === 'GAP') || [];
    const clusters: any[] = [];
    const processed = new Set<string>();

    for (const gap of gaps) {
      if (!processed.has(gap.id)) {
        const cluster = [gap];
        processed.add(gap.id);

        // Find related gaps
        for (const other of gaps) {
          if (
            !processed.has(other.id) &&
            gap.metadata?.endpoint === other.metadata?.endpoint
          ) {
            cluster.push(other);
            processed.add(other.id);
          }
        }

        clusters.push({ gaps: cluster, count: cluster.length });
      }
    }

    return clusters;
  }

  private generateOptimizations(graphData: any): string[] {
    const suggestions: string[] = [];

    const untestedCount = this.extractUntestedEndpoints(graphData).length;
    if (untestedCount > 5) {
      suggestions.push(`Prioritize testing ${untestedCount} untested endpoints`);
    }

    const gapCount = graphData.nodes?.filter((n: any) => n.type === 'GAP')
      .length || 0;
    if (gapCount > 10) {
      suggestions.push(`High gap density (${gapCount} gaps) - consider architecture review`);
    }

    suggestions.push('Enable caching for frequently accessed diagrams');
    suggestions.push('Use parallel test execution for faster feedback');

    return suggestions;
  }
}

export default PerformanceOptimizer;
