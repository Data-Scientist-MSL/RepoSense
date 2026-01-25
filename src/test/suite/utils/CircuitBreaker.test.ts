import * as assert from 'assert';
import { CircuitBreaker, CircuitState } from '../../../utils/CircuitBreaker';

describe('CircuitBreaker Unit Tests', () => {
    it('should start in CLOSED state', () => {
        const breaker = new CircuitBreaker('test', { failureThreshold: 2, resetTimeout: 100 });
        assert.strictEqual(breaker.getState(), CircuitState.CLOSED);
    });

    it('should return result on success', async () => {
        const breaker = new CircuitBreaker('test', { failureThreshold: 2, resetTimeout: 100 });
        const result = await breaker.execute(async () => 'success');
        assert.strictEqual(result, 'success');
        assert.strictEqual(breaker.getState(), CircuitState.CLOSED);
    });

    it('should open after failure threshold is reached', async () => {
        const breaker = new CircuitBreaker('test', { failureThreshold: 2, resetTimeout: 100 });
        
        await assert.rejects(breaker.execute(async () => { throw new Error('fail 1'); }));
        assert.strictEqual(breaker.getState(), CircuitState.CLOSED);
        
        await assert.rejects(breaker.execute(async () => { throw new Error('fail 2'); }));
        assert.strictEqual(breaker.getState(), CircuitState.OPEN);
    });

    it('should block execution when open', async () => {
        const breaker = new CircuitBreaker('test', { failureThreshold: 1, resetTimeout: 1000 });
        await assert.rejects(breaker.execute(async () => { throw new Error('fail'); }));
        
        await assert.rejects(
            breaker.execute(async () => 'should not run'),
            /Circuit Breaker \[test\] is OPEN/
        );
    });

    it('should transition to HALF_OPEN after timeout', async () => {
        const breaker = new CircuitBreaker('test', { failureThreshold: 1, resetTimeout: 50 });
        await assert.rejects(breaker.execute(async () => { throw new Error('fail'); }));
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Execute a success in half-open
        const result = await breaker.execute(async () => 'success');
        assert.strictEqual(result, 'success');
        assert.strictEqual(breaker.getState(), CircuitState.HALF_OPEN);
    });

    it('should close after successful half-open attempts', async () => {
        const breaker = new CircuitBreaker('test', { 
            failureThreshold: 1, 
            resetTimeout: 50,
            halfOpenMaxAttempts: 2 
        });
        
        await assert.rejects(breaker.execute(async () => { throw new Error('fail'); }));
        await new Promise(resolve => setTimeout(resolve, 100));

        await breaker.execute(async () => 'success 1');
        assert.strictEqual(breaker.getState(), CircuitState.HALF_OPEN);

        await breaker.execute(async () => 'success 2');
        assert.strictEqual(breaker.getState(), CircuitState.CLOSED);
    });

    it('should re-open if failure occurs during half-open', async () => {
        const breaker = new CircuitBreaker('test', { failureThreshold: 1, resetTimeout: 50 });
        await assert.rejects(breaker.execute(async () => { throw new Error('fail'); }));
        await new Promise(resolve => setTimeout(resolve, 100));

        await assert.rejects(breaker.execute(async () => { throw new Error('fail again'); }));
        assert.strictEqual(breaker.getState(), CircuitState.OPEN);
    });
});
