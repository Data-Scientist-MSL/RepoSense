"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaService = void 0;
const axios_1 = __importDefault(require("axios"));
const vscode = __importStar(require("vscode"));
const ErrorHandler_1 = require("../../utils/ErrorHandler");
class OllamaService {
    constructor() {
        this.isAvailable = false;
        // Circuit breaker state
        this.failureCount = 0;
        this.lastFailureTime = 0;
        this.circuitOpen = false;
        this.failureThreshold = 5;
        this.circuitResetTimeout = 60000; // 1 minute
        const config = vscode.workspace.getConfiguration('reposense');
        this.baseUrl = config.get('ollamaEndpoint', 'http://localhost:11434');
        this.defaultModel = config.get('llmModel', 'deepseek-coder:6.7b');
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 120000, // 2 minutes for large models
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // Check availability on initialization
        this.checkHealth();
    }
    checkCircuitBreaker() {
        if (this.circuitOpen) {
            const timeSinceLastFailure = Date.now() - this.lastFailureTime;
            // Try to reset circuit after timeout
            if (timeSinceLastFailure > this.circuitResetTimeout) {
                console.log('Circuit breaker: attempting to reset');
                this.circuitOpen = false;
                this.failureCount = 0;
            }
            else {
                throw new Error(`Service temporarily unavailable. Circuit breaker is open. ` +
                    `Will retry in ${Math.ceil((this.circuitResetTimeout - timeSinceLastFailure) / 1000)}s`);
            }
        }
    }
    recordSuccess() {
        this.failureCount = 0;
        this.circuitOpen = false;
    }
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.failureThreshold) {
            console.warn(`Circuit breaker: opening circuit after ${this.failureCount} failures`);
            this.circuitOpen = true;
        }
    }
    async checkHealth() {
        try {
            const response = await this.client.get('/');
            this.isAvailable = response.status === 200;
            return this.isAvailable;
        }
        catch (error) {
            this.isAvailable = false;
            // Don't show error on health check - it's expected when Ollama is not running
            return false;
        }
    }
    async listModels() {
        try {
            return await (0, ErrorHandler_1.withRetry)(async () => {
                const response = await this.client.get('/api/tags');
                return response.data.models || [];
            }, {
                maxAttempts: 2,
                delayMs: 500,
                retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT']
            });
        }
        catch (error) {
            await (0, ErrorHandler_1.handleError)(error instanceof Error ? error : new Error(String(error)), 'List Ollama Models', 'OllamaService', { severity: 'error', retryable: false });
            return [];
        }
    }
    async pullModel(modelName) {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Downloading model: ${modelName}`,
                cancellable: true
            }, async (progress, token) => {
                const response = await this.client.post('/api/pull', {
                    name: modelName,
                    stream: false
                });
                if (response.data.status === 'success') {
                    progress.report({ increment: 100, message: 'Complete!' });
                }
            });
        }
        catch (error) {
            throw new Error(`Failed to pull model ${modelName}: ${error}`);
        }
    }
    async generate(prompt, options) {
        // Check circuit breaker before attempting request
        this.checkCircuitBreaker();
        if (!this.isAvailable) {
            const available = await this.checkHealth();
            if (!available) {
                this.recordFailure();
                throw new Error('Ollama service is not available. Please start Ollama and try again.');
            }
        }
        try {
            const result = await (0, ErrorHandler_1.withRetry)(async () => {
                const request = {
                    model: options?.model || this.defaultModel,
                    prompt: prompt,
                    stream: false,
                    temperature: options?.temperature ?? 0.2,
                    max_tokens: options?.max_tokens,
                    system: options?.system
                };
                const response = await this.client.post('/api/generate', request);
                return response.data.response.trim();
            }, {
                maxAttempts: 3,
                delayMs: 1000,
                backoffMultiplier: 2,
                retryableErrors: ['ETIMEDOUT', 'ECONNRESET']
            });
            // Record success if we got here
            this.recordSuccess();
            return result;
        }
        catch (error) {
            // Record failure for circuit breaker
            this.recordFailure();
            if (error.response?.status === 404) {
                await (0, ErrorHandler_1.handleError)(new Error(`Model ${options?.model || this.defaultModel} not found. ` +
                    `Please pull the model first using: ollama pull ${options?.model || this.defaultModel}`), 'Generate LLM Response', 'OllamaService', { severity: 'error', retryable: false });
            }
            await (0, ErrorHandler_1.handleError)(error instanceof Error ? error : new Error(String(error)), 'Generate LLM Response', 'OllamaService', { severity: 'error', retryable: true });
            throw error;
        }
    }
    async analyzeCode(code, language) {
        const systemPrompt = `You are an expert code analyzer. Analyze the provided ${language} code and identify:
1. Potential bugs or issues
2. Performance concerns
3. Security vulnerabilities
4. Code quality improvements
5. Best practice violations

Provide concise, actionable feedback.`;
        const prompt = `Analyze this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide your analysis:`;
        return this.generate(prompt, { system: systemPrompt, temperature: 0.1 });
    }
    async generateEndpoint(apiCall, method, framework) {
        const systemPrompt = `You are an expert backend developer. Generate production-ready endpoint code based on the framework and requirements provided.`;
        const frameworkExamples = {
            express: `Express.js (TypeScript):
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await userService.findById(userId);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});`,
            nestjs: `NestJS (TypeScript):
@Get(':id')
async findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findById(id);
}`,
            fastapi: `FastAPI (Python):
@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    user = await user_service.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user`,
            flask: `Flask (Python):
@app.route('/api/users/<user_id>', methods=['GET'])
def get_user(user_id):
    user = user_service.find_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user)`,
            django: `Django (Python):
def get_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        return JsonResponse({'user': user.to_dict()})
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)`
        };
        const prompt = `Generate a ${framework} endpoint for:
Method: ${method}
Path: ${apiCall}

Example pattern for ${framework}:
${frameworkExamples[framework]}

Generate ONLY the endpoint code without explanations:`;
        return this.generate(prompt, { system: systemPrompt, temperature: 0.3 });
    }
    async generateTest(code, framework, language) {
        const systemPrompt = `You are an expert QA engineer. Generate comprehensive E2E tests using ${framework}.`;
        const prompt = `Generate ${framework} tests for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Include:
1. Happy path scenarios
2. Edge cases
3. Error handling
4. Accessibility checks (if UI)

Generate ONLY the test code:`;
        return this.generate(prompt, { system: systemPrompt, temperature: 0.2 });
    }
    async suggestFix(code, issue, language) {
        const systemPrompt = `You are an expert software engineer. Suggest minimal, production-ready code fixes for the reported issue.`;
        const prompt = `Fix this issue in ${language} code:

Issue: ${issue}

Code:
\`\`\`${language}
${code}
\`\`\`

Provide:
1. The fixed code
2. Brief explanation of the fix
3. Any breaking changes`;
        return this.generate(prompt, { system: systemPrompt, temperature: 0.1 });
    }
    async generateNaturalLanguageReport(gaps, summary) {
        const systemPrompt = `You are a technical writer. Convert technical analysis into clear, business-friendly reports.`;
        const prompt = `Create an executive summary report from this analysis:

Total Gaps: ${gaps.length}
Critical: ${summary.critical || 0}
High: ${summary.high || 0}
Medium: ${summary.medium || 0}
Low: ${summary.low || 0}

Top Issues:
${gaps.slice(0, 5).map((g) => `- ${g.message}`).join('\n')}

Generate a professional executive summary (200-300 words) suitable for stakeholders:`;
        return this.generate(prompt, { system: systemPrompt, temperature: 0.4 });
    }
    async extractAPIPatterns(code) {
        const systemPrompt = `You are an expert at analyzing API patterns. Extract all API endpoints called in the code.`;
        const prompt = `Extract all API endpoints from this code:

\`\`\`
${code}
\`\`\`

Return ONLY a JSON array of endpoints, e.g., ["POST /api/users", "GET /api/products/:id"]`;
        const response = await this.generate(prompt, { system: systemPrompt, temperature: 0.1 });
        try {
            // Try to parse JSON response
            const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleaned);
        }
        catch {
            // Fallback: extract from text
            const matches = response.match(/"[^"]+"/g) || [];
            return matches.map(m => m.replace(/"/g, ''));
        }
    }
    getStatus() {
        return {
            available: this.isAvailable,
            endpoint: this.baseUrl,
            model: this.defaultModel
        };
    }
    setModel(modelName) {
        this.defaultModel = modelName;
        const config = vscode.workspace.getConfiguration('reposense');
        config.update('llmModel', modelName, vscode.ConfigurationTarget.Global);
    }
    /**
     * Analyze code architecture and extract component relationships
     */
    async analyzeArchitecture(code, filePath, gaps) {
        const systemPrompt = `You are an expert software architect. Analyze code architecture and identify:
1. Component types (UI, Service, Controller, Database, etc.)
2. Dependencies and relationships
3. Data flow patterns
4. Architectural patterns used
5. Integration points`;
        const prompt = `Analyze the architecture of this code from ${filePath}:

\`\`\`
${code}
\`\`\`

Known issues:
${gaps.map(g => `- ${g.message}`).join('\n')}

Provide:
1. Component type
2. Key dependencies
3. Data flow direction
4. Architectural concerns

Format as JSON:
{
    "componentType": "UI|Service|Controller|Database",
    "dependencies": ["dep1", "dep2"],
    "dataFlow": "inbound|outbound|bidirectional",
    "concerns": ["concern1"]
}`;
        return this.generate(prompt, { system: systemPrompt, temperature: 0.1 });
    }
    /**
     * Generate architecture improvement recommendations
     */
    async generateArchitectureRecommendations(gaps, currentArchitecture) {
        const systemPrompt = `You are a senior software architect specializing in UI/UX improvements and system design.`;
        const prompt = `Given this current architecture state:

${currentArchitecture}

And these identified issues:
${gaps.map(g => `- [${g.severity}] ${g.message}`).join('\n')}

Provide architectural recommendations to:
1. Resolve identified defects
2. Improve UI/UX patterns
3. Enhance component structure
4. Optimize data flow
5. Address performance and accessibility

Format as structured recommendations with priority levels.`;
        return this.generate(prompt, { system: systemPrompt, temperature: 0.3 });
    }
    /**
     * Identify UI/UX architectural patterns and anti-patterns
     */
    async analyzeUIUXPatterns(code, componentType) {
        const systemPrompt = `You are a UI/UX architecture expert. Identify patterns and anti-patterns in frontend code.`;
        const prompt = `Analyze UI/UX patterns in this ${componentType} component:

\`\`\`
${code}
\`\`\`

Identify:
1. State management patterns (good/bad)
2. Component composition patterns
3. Data fetching strategies
4. User interaction patterns
5. Accessibility patterns
6. Performance patterns
7. Rendering optimization

Categorize each finding as:
- ✅ Good Pattern
- ⚠️ Anti-Pattern
- 💡 Improvement Opportunity`;
        return this.generate(prompt, { system: systemPrompt, temperature: 0.2 });
    }
}
exports.OllamaService = OllamaService;
