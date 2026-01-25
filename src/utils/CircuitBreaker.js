"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = exports.CircuitState = void 0;
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN"; // Attempting recovery
})(CircuitState || (exports.CircuitState = CircuitState = {}));
class CircuitBreaker {
    constructor(name, options) {
        this.name = name;
        this.options = options;
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.lastFailureTime = 0;
        this.successCount = 0;
    }
    async execute(operation) {
        this.checkState();
        try {
            const result = await operation();
            this.recordSuccess();
            return result;
        }
        catch (error) {
            this.recordFailure();
            throw error;
        }
    }
    checkState() {
        if (this.state === CircuitState.OPEN) {
            const timeSinceLastFailure = Date.now() - this.lastFailureTime;
            if (timeSinceLastFailure > this.options.resetTimeout) {
                console.log(`Circuit Breaker [${this.name}]: Transitioning to HALF_OPEN`);
                this.state = CircuitState.HALF_OPEN;
                this.successCount = 0;
            }
            else {
                throw new Error(`Circuit Breaker [${this.name}] is OPEN. ` +
                    `Blocked for ${Math.ceil((this.options.resetTimeout - timeSinceLastFailure) / 1000)}s`);
            }
        }
    }
    recordSuccess() {
        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;
            const threshold = this.options.halfOpenMaxAttempts || 3;
            if (this.successCount >= threshold) {
                console.log(`Circuit Breaker [${this.name}]: Transitioning to CLOSED`);
                this.state = CircuitState.CLOSED;
                this.failureCount = 0;
            }
        }
        else if (this.state === CircuitState.CLOSED) {
            this.failureCount = 0;
        }
    }
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.options.failureThreshold) {
            console.warn(`Circuit Breaker [${this.name}]: Opening circuit after ${this.failureCount} failures`);
            this.state = CircuitState.OPEN;
        }
    }
    getState() {
        return this.state;
    }
}
exports.CircuitBreaker = CircuitBreaker;
