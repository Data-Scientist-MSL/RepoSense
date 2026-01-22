import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import * as sinon from 'sinon';
import { TestGenerator } from '../../../services/llm/TestGenerator';
import { OllamaService } from '../../../services/llm/OllamaService';
import { GapItem } from '../../../models/types';

describe('TestGenerator', () => {
    let testGenerator: TestGenerator;
    let ollamaServiceStub: sinon.SinonStubbedInstance<OllamaService>;

    beforeEach(() => {
        ollamaServiceStub = sinon.createStubInstance(OllamaService);
        testGenerator = new TestGenerator(ollamaServiceStub as any);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('generateTestsForGaps()', () => {
        it('should generate tests for all gaps', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Missing endpoint /api/users',
                    file: 'UserProfile.tsx',
                    line: 47,
                    suggestedFix: 'Create endpoint'
                },
                {
                    type: 'unused_endpoint',
                    severity: 'MEDIUM',
                    message: 'Unused endpoint /api/products',
                    file: 'products.controller.ts',
                    line: 23,
                    suggestedFix: 'Add frontend call'
                }
            ];

            ollamaServiceStub.generate.resolves(`
describe('User API Tests', () => {
    test('should fetch user data', async () => {
        const response = await fetch('/api/users');
        expect(response.status).toBe(200);
    });
});
            `);

            const tests = await testGenerator.generateTestsForGaps(gaps);

            expect(tests).to.have.length.greaterThan(0);
            expect(ollamaServiceStub.generate.called).to.be.true;
        });

        it('should handle empty gaps array', async () => {
            const tests = await testGenerator.generateTestsForGaps([]);

            expect(tests).to.be.an('array').that.is.empty;
            expect(ollamaServiceStub.generate.called).to.be.false;
        });

        it('should handle generation errors gracefully', async () => {
            const gaps: GapItem[] = [{
                type: 'orphaned_component',
                severity: 'HIGH',
                message: 'Test gap',
                file: 'test.tsx',
                line: 1,
                suggestedFix: 'Fix'
            }];

            ollamaServiceStub.generate.rejects(new Error('Generation failed'));

            const tests = await testGenerator.generateTestsForGaps(gaps);

            expect(tests).to.be.an('array');
        });
    });

    describe('generatePlaywrightTest()', () => {
        it('should generate Playwright test code', async () => {
            ollamaServiceStub.generate.resolves(`
import { test, expect } from '@playwright/test';

test('GET /api/users', async ({ request }) => {
    const response = await request.get('/api/users');
    expect(response.status()).toBe(200);
});
            `);

            const testCode = await testGenerator.generatePlaywrightTest(
                '/api/users',
                'GET',
                'happy'
            );

            expect(testCode).to.include('@playwright/test');
            expect(testCode).to.include('request.get');
            expect(testCode).to.include('/api/users');
        });

        it('should handle POST requests', async () => {
            ollamaServiceStub.generate.resolves(`
import { test, expect } from '@playwright/test';

test('POST /api/users', async ({ request }) => {
    const response = await request.post('/api/users', {
        data: { name: 'Test User' }
    });
    expect(response.status()).toBe(201);
});
            `);

            const testCode = await testGenerator.generatePlaywrightTest(
                '/api/users',
                'POST',
                'happy'
            );

            expect(testCode).to.include('request.post');
            expect(testCode).to.include('data:');
        });

        it('should include scenario description', async () => {
            ollamaServiceStub.generate.resolves('test code');

            await testGenerator.generatePlaywrightTest(
                '/api/endpoint',
                'GET',
                'happy'
            );

            const call = ollamaServiceStub.generate.firstCall;
            expect(call.args[0]).to.include('Custom scenario description');
        });
    });

    describe('generateCypressTest()', () => {
        it('should generate Cypress test code', async () => {
            ollamaServiceStub.generate.resolves(`
describe('API Tests', () => {
    it('should fetch users', () => {
        cy.request('GET', '/api/users')
          .its('status')
          .should('eq', 200);
    });
});
            `);

            const testCode = await testGenerator.generateCypressTest(
                '/api/users',
                'GET',
                'happy'
            );

            expect(testCode).to.include('cy.request');
            expect(testCode).to.include('/api/users');
        });

        it('should handle DELETE requests', async () => {
            ollamaServiceStub.generate.resolves(`
describe('API Tests', () => {
    it('should delete user', () => {
        cy.request('DELETE', '/api/users/123')
          .its('status')
          .should('eq', 204);
    });
});
            `);

            const testCode = await testGenerator.generateCypressTest(
                '/api/users/123',
                'DELETE',
                'happy'
            );

            expect(testCode).to.include('DELETE');
            expect(testCode).to.include('204');
        });
    });

    describe('generateTestSuite()', () => {
        it('should generate complete test suite', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Missing /api/users',
                    file: 'Users.tsx',
                    line: 10,
                    suggestedFix: 'Add endpoint'
                }
            ];

            ollamaServiceStub.generate.resolves(`
import { test, expect } from '@playwright/test';

test.describe('RepoSense Generated Tests', () => {
    test('GET /api/users', async ({ request }) => {
        const response = await request.get('/api/users');
        expect(response.status()).toBe(200);
    });
});
            `);

            const suite = await testGenerator.generateTestSuite(gaps);

            expect(suite).to.include('@playwright/test');
            expect(suite).to.include('RepoSense Generated Tests');
        });

        it('should include imports and setup', async () => {
            ollamaServiceStub.generate.resolves('test suite content');

            const suite = await testGenerator.generateTestSuite([]);

            expect(suite).to.be.a('string');
        });
    });

    describe('addTestIdAttributes()', () => {
        it('should add test IDs to React components', async () => {
            const code = '<button onClick={handleClick}>Submit</button>';
            
            ollamaServiceStub.generate.resolves(
                '<button data-testid="submit-button" onClick={handleClick}>Submit</button>'
            );

            const result = await testGenerator.addTestIdAttributes(code, 'typescriptreact');

            expect(result).to.include('data-testid');
        });

        it('should handle Vue components', async () => {
            const code = '<div class="container"><button>Click</button></div>';
            
            ollamaServiceStub.generate.resolves(
                '<div class="container" data-testid="container"><button data-testid="click-button">Click</button></div>'
            );

            const result = await testGenerator.addTestIdAttributes(code, 'vue');

            expect(result).to.include('data-testid');
        });

        it('should preserve existing attributes', async () => {
            const code = '<input type="text" value="test" />';
            
            ollamaServiceStub.generate.resolves(
                '<input type="text" value="test" data-testid="text-input" />'
            );

            const result = await testGenerator.addTestIdAttributes(code, 'typescriptreact');

            expect(result).to.include('type="text"');
            expect(result).to.include('value="test"');
            expect(result).to.include('data-testid');
        });
    });
});
