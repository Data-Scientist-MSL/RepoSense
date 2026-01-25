export enum CircuitState {
    CLOSED = 'CLOSED', // Operation normal
    OPEN = 'OPEN',     // Operation failing, blocked
    HALF_OPEN = 'HALF_OPEN' // Attempting recovery
}

export interface CircuitBreakerOptions {
    failureThreshold: number;
    resetTimeout: number;
    halfOpenMaxAttempts?: number;
}

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private lastFailureTime: number = 0;
    private successCount: number = 0;
    
    constructor(private name: string, private options: CircuitBreakerOptions) {}

    public async execute<T>(operation: () => Promise<T>): Promise<T> {
        this.checkState();

        try {
            const result = await operation();
            this.recordSuccess();
            return result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    private checkState(): void {
        if (this.state === CircuitState.OPEN) {
            const timeSinceLastFailure = Date.now() - this.lastFailureTime;
            
            if (timeSinceLastFailure > this.options.resetTimeout) {
                console.log(`Circuit Breaker [${this.name}]: Transitioning to HALF_OPEN`);
                this.state = CircuitState.HALF_OPEN;
                this.successCount = 0;
            } else {
                throw new Error(
                    `Circuit Breaker [${this.name}] is OPEN. ` +
                    `Blocked for ${Math.ceil((this.options.resetTimeout - timeSinceLastFailure) / 1000)}s`
                );
            }
        }
    }

    private recordSuccess(): void {
        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;
            const threshold = this.options.halfOpenMaxAttempts || 3;
            if (this.successCount >= threshold) {
                console.log(`Circuit Breaker [${this.name}]: Transitioning to CLOSED`);
                this.state = CircuitState.CLOSED;
                this.failureCount = 0;
            }
        } else if (this.state === CircuitState.CLOSED) {
            this.failureCount = 0;
        }
    }

    private recordFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.options.failureThreshold) {
            console.warn(`Circuit Breaker [${this.name}]: Opening circuit after ${this.failureCount} failures`);
            this.state = CircuitState.OPEN;
        }
    }

    public getState(): CircuitState {
        return this.state;
    }
}
