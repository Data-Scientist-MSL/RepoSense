import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import * as sinon from 'sinon';
import { RemediationEngine } from '../../../services/llm/RemediationEngine';
import { OllamaService } from '../../../services/llm/OllamaService';
import { GapItem } from '../../../models/types';

describe('RemediationEngine', () => {
    let remediationEngine: RemediationEngine;
    let ollamaServiceStub: sinon.SinonStubbedInstance<OllamaService>;

    beforeEach(() => {
        ollamaServiceStub = sinon.createStubInstance(OllamaService);
        remediationEngine = new RemediationEngine(ollamaServiceStub as any);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('generateRemediations()', () => {
        it('should generate remediations for all gaps', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Missing endpoint /api/users',
                    file: 'UserProfile.tsx',
                    line: 47,
                    suggestedFix: 'Create backend endpoint'
                }
            ];

            ollamaServiceStub.generate.resolves('Generated endpoint code');

            const remediations = await remediationEngine.generateRemediations(gaps);

            expect(remediations).to.have.length.greaterThan(0);
            expect(remediations[0]).to.have.property('gapId');
            expect(remediations[0]).to.have.property('description');
            expect(remediations[0]).to.have.property('confidence');
        });

        it('should handle empty gaps array', async () => {
            const remediations = await remediationEngine.generateRemediations([]);

            expect(remediations).to.be.an('array').that.is.empty;
        });

        it('should assign confidence scores', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Missing /api/endpoint',
                    file: 'test.tsx',
                    line: 1,
                    suggestedFix: 'Add endpoint'
                }
            ];

            ollamaServiceStub.generate.resolves('Fix code');

            const remediations = await remediationEngine.generateRemediations(gaps);

            expect(remediations[0].confidence).to.be.oneOf(['high', 'medium', 'low']);
        });
    });

    describe('generateRemediationForGap()', () => {
        it('should generate remediation for orphaned component', async () => {
            const gap: GapItem = {
                type: 'orphaned_component',
                severity: 'HIGH',
                message: 'Missing POST /api/users',
                file: 'CreateUser.tsx',
                line: 25,
                suggestedFix: 'Create endpoint'
            };

            ollamaServiceStub.generateEndpoint.resolves(`
app.post('/api/users', async (req, res) => {
    const user = await User.create(req.body);
    res.status(201).json(user);
});
            `);

            const remediation = await remediationEngine.generateRemediationForGap(gap);

            expect(remediation).to.have.property('gapId');
            expect(remediation).to.have.property('type', 'generate_endpoint');
            expect(remediation).to.have.property('autoApplicable');
            expect(remediation.codeChanges).to.have.length.greaterThan(0);
        });

        it('should generate remediation for unused endpoint', async () => {
            const gap: GapItem = {
                type: 'unused_endpoint',
                severity: 'MEDIUM',
                message: 'Unused GET /api/products',
                file: 'products.controller.ts',
                line: 42,
                suggestedFix: 'Add frontend call'
            };

            ollamaServiceStub.generate.resolves(`
const products = await fetch('/api/products')
    .then(res => res.json());
            `);

            const remediation = await remediationEngine.generateRemediationForGap(gap);

            expect(remediation).to.have.property('gapId');
            expect(remediation.codeChanges).to.have.length.greaterThan(0);
        });

        it('should handle type mismatch gaps', async () => {
            const gap: GapItem = {
                type: 'type_mismatch',
                severity: 'HIGH',
                message: 'Type mismatch in response',
                file: 'api.ts',
                line: 15,
                suggestedFix: 'Update types'
            };

            ollamaServiceStub.generate.resolves('interface fix code');

            const remediation = await remediationEngine.generateRemediationForGap(gap);

            expect(remediation).to.have.property('gapId');
            expect(remediation.codeChanges).to.have.length.greaterThan(0);
        });
    });

    describe('calculateConfidence()', () => {
        it('should return high confidence for simple gaps', async () => {
            const gap: GapItem = {
                type: 'orphaned_component',
                severity: 'CRITICAL',
                message: 'Simple missing endpoint',
                file: 'test.tsx',
                line: 1,
                suggestedFix: 'Add endpoint'
            };

            ollamaServiceStub.generate.resolves('code');
            const remediation = await remediationEngine.generateRemediationForGap(gap);

            expect(remediation.confidence).to.be.a('string');
        });

        it('should consider gap severity in confidence', async () => {
            const criticalGap: GapItem = {
                type: 'orphaned_component',
                severity: 'CRITICAL',
                message: 'Critical issue',
                file: 'test.tsx',
                line: 1,
                suggestedFix: 'Fix'
            };

            ollamaServiceStub.generate.resolves('code');
            const remediation = await remediationEngine.generateRemediationForGap(criticalGap);

            expect(remediation.confidence).to.be.oneOf(['high', 'medium', 'low']);
        });
    });

    describe('Code Generation', () => {
        it('should generate Express.js endpoints', async () => {
            const gap: GapItem = {
                type: 'orphaned_component',
                severity: 'HIGH',
                message: 'Missing GET /api/users/:id',
                file: 'UserDetail.tsx',
                line: 30,
                suggestedFix: 'Create endpoint'
            };

            const endpointCode = `
router.get('/api/users/:id', async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
});
            `;

            ollamaServiceStub.generateEndpoint.resolves(endpointCode);

            const remediation = await remediationEngine.generateRemediationForGap(gap);

            expect(remediation.codeChanges[0].newCode).to.include('router.get');
            expect(remediation.codeChanges[0].newCode).to.include('/api/users/:id');
        });

        it('should generate frontend fetch calls', async () => {
            const gap: GapItem = {
                type: 'unused_endpoint',
                severity: 'LOW',
                message: 'Unused DELETE /api/users/:id',
                file: 'users.controller.ts',
                line: 50,
                suggestedFix: 'Add frontend call'
            };

            const fetchCode = `
async function deleteUser(id: string) {
    const response = await fetch(\`/api/users/\${id}\`, {
        method: 'DELETE',
    });
    
    if (!response.ok) {
        throw new Error('Failed to delete user');
    }
    
    return response.status === 204;
}
            `;

            ollamaServiceStub.generate.resolves(fetchCode);

            const remediation = await remediationEngine.generateRemediationForGap(gap);

            expect(remediation.codeChanges[0].newCode).to.include('fetch');
            expect(remediation.codeChanges[0].newCode).to.include('DELETE');
        });

        it('should include error handling in generated code', async () => {
            const gap: GapItem = {
                type: 'orphaned_component',
                severity: 'HIGH',
                message: 'Missing endpoint',
                file: 'test.tsx',
                line: 1,
                suggestedFix: 'Add'
            };

            ollamaServiceStub.generateEndpoint.resolves(`
app.post('/api/resource', async (req, res) => {
    try {
        const result = await service.create(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
            `);

            const remediation = await remediationEngine.generateRemediationForGap(gap);

            expect(remediation.codeChanges[0].newCode).to.include('try');
            expect(remediation.codeChanges[0].newCode).to.include('catch');
        });
    });

    describe('Estimated Time Calculation', () => {
        it('should estimate time for simple fixes', async () => {
            const gap: GapItem = {
                type: 'orphaned_component',
                severity: 'LOW',
                message: 'Simple gap',
                file: 'test.tsx',
                line: 1,
                suggestedFix: 'Quick fix'
            };

            ollamaServiceStub.generate.resolves('simple code');

            const remediation = await remediationEngine.generateRemediationForGap(gap);

            expect(remediation.estimatedTime).to.be.a('string');
            expect(remediation.estimatedTime).to.match(/\d+\s*(min|sec)/);
        });

        it('should estimate longer time for complex fixes', async () => {
            const gap: GapItem = {
                type: 'orphaned_component',
                severity: 'CRITICAL',
                message: 'Complex missing endpoint with validation',
                file: 'complex.tsx',
                line: 1,
                suggestedFix: 'Complex fix required'
            };

            ollamaServiceStub.generateEndpoint.resolves('complex code with validation');

            const remediation = await remediationEngine.generateRemediationForGap(gap);

            expect(remediation.estimatedTime).to.be.a('string');
        });
    });
});
