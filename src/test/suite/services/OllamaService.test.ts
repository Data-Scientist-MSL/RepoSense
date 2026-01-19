import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import * as sinon from 'sinon';
import { OllamaService } from '../../../services/llm/OllamaService';
import axios from 'axios';

describe('OllamaService', () => {
    let ollamaService: OllamaService;
    let axiosStub: sinon.SinonStub;

    beforeEach(() => {
        ollamaService = new OllamaService();
        axiosStub = sinon.stub(axios, 'get');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('checkHealth()', () => {
        it('should return true when Ollama is running', async () => {
            axiosStub.resolves({ status: 200 });
            
            const result = await ollamaService.checkHealth();
            
            expect(result).to.be.true;
            expect(axiosStub.calledOnce).to.be.true;
        });

        it('should return false when Ollama is not running', async () => {
            axiosStub.rejects(new Error('Connection refused'));
            
            const result = await ollamaService.checkHealth();
            
            expect(result).to.be.false;
        });

        it('should handle timeout errors', async () => {
            axiosStub.rejects({ code: 'ECONNABORTED' });
            
            const result = await ollamaService.checkHealth();
            
            expect(result).to.be.false;
        });
    });

    describe('listModels()', () => {
        it('should return list of installed models', async () => {
            const mockResponse = {
                data: {
                    models: [
                        { name: 'deepseek-coder:6.7b', size: 3800000000 },
                        { name: 'codellama:13b', size: 7300000000 }
                    ]
                }
            };
            
            sinon.stub(axios, 'get').resolves(mockResponse);
            
            const models = await ollamaService.listModels();
            
            expect(models).to.have.lengthOf(2);
            expect(models[0].name).to.equal('deepseek-coder:6.7b');
        });

        it('should return empty array when no models installed', async () => {
            sinon.stub(axios, 'get').resolves({ data: { models: [] } });
            
            const models = await ollamaService.listModels();
            
            expect(models).to.be.an('array').that.is.empty;
        });

        it('should handle network errors gracefully', async () => {
            sinon.stub(axios, 'get').rejects(new Error('Network error'));
            
            const models = await ollamaService.listModels();
            
            expect(models).to.be.an('array').that.is.empty;
        });
    });

    describe('generate()', () => {
        it('should generate text from prompt', async () => {
            const mockResponse = {
                data: { response: 'Generated code here' }
            };
            
            sinon.stub(axios, 'post').resolves(mockResponse);
            
            const result = await ollamaService.generate('Test prompt');
            
            expect(result).to.equal('Generated code here');
        });

        it('should use custom model when specified', async () => {
            const postStub = sinon.stub(axios, 'post').resolves({ 
                data: { response: 'Result' } 
            });
            
            await ollamaService.generate('Test', { model: 'custom-model' });
            
            expect(postStub.firstCall.args[1]).to.have.property('model', 'custom-model');
        });

        it('should handle generation errors', async () => {
            sinon.stub(axios, 'post').rejects(new Error('Generation failed'));
            
            try {
                await ollamaService.generate('Test prompt');
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error.message).to.include('Generation failed');
            }
        });

        it('should apply temperature when specified', async () => {
            const postStub = sinon.stub(axios, 'post').resolves({ 
                data: { response: 'Result' } 
            });
            
            await ollamaService.generate('Test', { temperature: 0.7 });
            
            expect(postStub.firstCall.args[1]).to.have.property('temperature', 0.7);
        });
    });

    describe('analyzeCode()', () => {
        it('should analyze JavaScript code', async () => {
            const code = 'function test() { return 42; }';
            const mockResponse = {
                data: { response: 'Code analysis result' }
            };
            
            sinon.stub(axios, 'post').resolves(mockResponse);
            
            const result = await ollamaService.analyzeCode(code, 'javascript');
            
            expect(result).to.equal('Code analysis result');
        });

        it('should include language context in prompt', async () => {
            const postStub = sinon.stub(axios, 'post').resolves({ 
                data: { response: 'Analysis' } 
            });
            
            await ollamaService.analyzeCode('code', 'typescript');
            
            const prompt = (postStub.firstCall.args[1] as any).prompt;
            expect(prompt).to.include('TypeScript');
        });

        it('should handle Python code analysis', async () => {
            sinon.stub(axios, 'post').resolves({ 
                data: { response: 'Python analysis' } 
            });
            
            const result = await ollamaService.analyzeCode('def test(): pass', 'python');
            
            expect(result).to.equal('Python analysis');
        });
    });

    describe('suggestFix()', () => {
        it('should suggest fixes for code issues', async () => {
            const mockResponse = {
                data: { response: 'Add error handling' }
            };
            
            sinon.stub(axios, 'post').resolves(mockResponse);
            
            const result = await ollamaService.suggestFix(
                'fetch(url)',
                'Missing error handling',
                'javascript'
            );
            
            expect(result).to.equal('Add error handling');
        });

        it('should include issue context in prompt', async () => {
            const postStub = sinon.stub(axios, 'post').resolves({ 
                data: { response: 'Fix' } 
            });
            
            await ollamaService.suggestFix('code', 'Specific issue', 'javascript');
            
            const prompt = (postStub.firstCall.args[1] as any).prompt;
            expect(prompt).to.include('Specific issue');
        });
    });
});
