import * as assert from 'assert';
import { AgentOrchestrator, AgentType } from '../../../services/agents/AgentOrchestrator';

describe('AgentOrchestrator Unit Tests', () => {
    let orchestrator: AgentOrchestrator;

    beforeEach(() => {
        orchestrator = new AgentOrchestrator();
    });

    it('should create a task in pending status', async () => {
        const input = { data: 'test' };
        const task = await orchestrator.createTask(AgentType.REMEDIATION, input);

        assert.strictEqual(task.type, AgentType.REMEDIATION);
        assert.strictEqual(task.status, 'pending');
        assert.deepStrictEqual(task.input, input);
        assert.ok(task.id.startsWith('task_'));
    });

    it('should run a task successfully', async () => {
        const input = { val: 1 };
        const task = await orchestrator.createTask(AgentType.REMEDIATION, input);
        
        const worker = async (i: any) => ({ result: i.val * 2 });
        const resultTask = await orchestrator.runTask(task.id, worker);

        assert.strictEqual(resultTask.status, 'completed');
        assert.deepStrictEqual(resultTask.output, { result: 2 });
        assert.ok(resultTask.startTime! <= resultTask.endTime!);
    });

    it('should handle task failure', async () => {
        const task = await orchestrator.createTask(AgentType.AUDIT, {});
        
        const worker = async () => { throw new Error('Processing failed'); };
        const resultTask = await orchestrator.runTask(task.id, worker);

        assert.strictEqual(resultTask.status, 'failed');
        assert.strictEqual(resultTask.error, 'Processing failed');
    });

    it('should track active agents', async () => {
        const task = await orchestrator.createTask(AgentType.TEST_GENERATION, {});
        
        assert.strictEqual(orchestrator.isAgentActive(AgentType.TEST_GENERATION), false);

        const runPromise = orchestrator.runTask(task.id, async () => {
            assert.strictEqual(orchestrator.isAgentActive(AgentType.TEST_GENERATION), true);
            return 'done';
        });

        await runPromise;
        assert.strictEqual(orchestrator.isAgentActive(AgentType.TEST_GENERATION), false);
    });

    it('should emit events', (done) => {
        let created = false;
        let started = false;

        orchestrator.on('taskCreated', () => { created = true; });
        orchestrator.on('taskStarted', () => { started = true; });
        orchestrator.on('taskCompleted', () => {
            assert.ok(created);
            assert.ok(started);
            done();
        });

        orchestrator.createTask(AgentType.REMEDIATION, {}).then(task => {
            orchestrator.runTask(task.id, async () => 'ok');
        });
    });

    it('should throw if task not found', async () => {
        await assert.rejects(
            orchestrator.runTask('non_existent', async () => {}),
            /Task non_existent not found/
        );
    });
});
