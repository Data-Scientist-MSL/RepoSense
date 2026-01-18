import { Endpoint } from '../../models/types';
import * as fs from 'fs';
import * as path from 'path';

export class BackendAnalyzer {
    private readonly BACKEND_EXTENSIONS = ['.ts', '.js', '.py'];

    /**
     * Extract all endpoints from backend code
     */
    async extractEndpoints(filePath: string): Promise<Endpoint[]> {
        const endpoints: Endpoint[] = [];
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const ext = path.extname(filePath);

            if (!this.BACKEND_EXTENSIONS.includes(ext)) {
                return endpoints;
            }

            const lines = content.split('\n');

            // JavaScript/TypeScript frameworks
            if (['.ts', '.js'].includes(ext)) {
                endpoints.push(...this.extractExpressEndpoints(lines, filePath));
                endpoints.push(...this.extractNestJSEndpoints(lines, filePath));
                endpoints.push(...this.extractFastifyEndpoints(lines, filePath));
            }

            // Python frameworks
            if (ext === '.py') {
                endpoints.push(...this.extractFastAPIEndpoints(lines, filePath));
                endpoints.push(...this.extractFlaskEndpoints(lines, filePath));
                endpoints.push(...this.extractDjangoEndpoints(lines, filePath));
            }

        } catch (error) {
            console.error(`Error extracting endpoints from ${filePath}:`, error);
        }

        return endpoints;
    }

    /**
     * Extract Express.js endpoints
     */
    private extractExpressEndpoints(lines: string[], filePath: string): Endpoint[] {
        const endpoints: Endpoint[] = [];
        
        // Match: app.get(), router.post(), express.Router().put()
        const patterns = [
            /(app|router)\s*\.\s*(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/g,
            /express\s*\.\s*Router\s*\(\s*\)\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g
        ];

        lines.forEach((line, index) => {
            patterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    const method = match[2] || match[1];
                    const routePath = match[3] || match[2];
                    
                    if (method && routePath) {
                        endpoints.push({
                            path: this.normalizePath(routePath),
                            method: method.toUpperCase(),
                            file: filePath,
                            line: index + 1,
                            handler: this.extractHandlerName(line)
                        });
                    }
                }
            });
        });

        return endpoints;
    }

    /**
     * Extract NestJS endpoints
     */
    private extractNestJSEndpoints(lines: string[], filePath: string): Endpoint[] {
        const endpoints: Endpoint[] = [];
        
        // Match decorators: @Get(), @Post('path'), @Put(':id')
        const decoratorPattern = /@(Get|Post|Put|Delete|Patch|All)\s*\(\s*['"`]?([^'"`\)]*?)['"`]?\s*\)/g;
        
        // Match controller prefix: @Controller('users')
        let controllerPrefix = '';
        const controllerPattern = /@Controller\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/;

        lines.forEach((line, index) => {
            // Check for controller prefix
            const controllerMatch = line.match(controllerPattern);
            if (controllerMatch) {
                controllerPrefix = controllerMatch[1];
            }

            // Match route decorators
            let match;
            while ((match = decoratorPattern.exec(line)) !== null) {
                const method = match[1];
                const routePath = match[2] || '';
                const fullPath = controllerPrefix 
                    ? `/${controllerPrefix}/${routePath}`.replace(/\/+/g, '/') 
                    : `/${routePath}`;

                endpoints.push({
                    path: this.normalizePath(fullPath),
                    method: method.toUpperCase(),
                    file: filePath,
                    line: index + 1,
                    handler: this.extractMethodName(lines, index)
                });
            }
        });

        return endpoints;
    }

    /**
     * Extract Fastify endpoints
     */
    private extractFastifyEndpoints(lines: string[], filePath: string): Endpoint[] {
        const endpoints: Endpoint[] = [];
        
        const pattern = /fastify\s*\.\s*(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;

        lines.forEach((line, index) => {
            let match;
            while ((match = pattern.exec(line)) !== null) {
                endpoints.push({
                    path: this.normalizePath(match[2]),
                    method: match[1].toUpperCase(),
                    file: filePath,
                    line: index + 1,
                    handler: this.extractHandlerName(line)
                });
            }
        });

        return endpoints;
    }

    /**
     * Extract FastAPI endpoints
     */
    private extractFastAPIEndpoints(lines: string[], filePath: string): Endpoint[] {
        const endpoints: Endpoint[] = [];
        
        // Match: @app.get("/path"), @router.post("/path")
        const pattern = /@(app|router)\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;

        lines.forEach((line, index) => {
            let match;
            while ((match = pattern.exec(line)) !== null) {
                endpoints.push({
                    path: this.normalizePath(match[3]),
                    method: match[2].toUpperCase(),
                    file: filePath,
                    line: index + 1,
                    handler: this.extractPythonFunctionName(lines, index)
                });
            }
        });

        return endpoints;
    }

    /**
     * Extract Flask endpoints
     */
    private extractFlaskEndpoints(lines: string[], filePath: string): Endpoint[] {
        const endpoints: Endpoint[] = [];
        
        // Match: @app.route('/path', methods=['GET', 'POST'])
        const routePattern = /@(app|bp|blueprint)\s*\.\s*route\s*\(\s*['"`]([^'"`]+)['"`]/g;
        const methodsPattern = /methods\s*=\s*\[([^\]]+)\]/;

        lines.forEach((line, index) => {
            let match;
            while ((match = routePattern.exec(line)) !== null) {
                const routePath = match[2];
                const methodsMatch = line.match(methodsPattern);
                const methods = methodsMatch 
                    ? methodsMatch[1].replace(/['\"`\s]/g, '').split(',')
                    : ['GET'];

                methods.forEach(method => {
                    endpoints.push({
                        path: this.normalizePath(routePath),
                        method: method.toUpperCase(),
                        file: filePath,
                        line: index + 1,
                        handler: this.extractPythonFunctionName(lines, index)
                    });
                });
            }
        });

        return endpoints;
    }

    /**
     * Extract Django endpoints (simplified - Django uses URLs patterns)
     */
    private extractDjangoEndpoints(lines: string[], filePath: string): Endpoint[] {
        const endpoints: Endpoint[] = [];
        
        // Match: path('users/', views.user_list)
        const pattern = /path\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,\)]+)/g;

        lines.forEach((line, index) => {
            let match;
            while ((match = pattern.exec(line)) !== null) {
                endpoints.push({
                    path: this.normalizePath(match[1]),
                    method: 'GET', // Django doesn't specify method in URL patterns
                    file: filePath,
                    line: index + 1,
                    handler: match[2].trim()
                });
            }
        });

        return endpoints;
    }

    /**
     * Normalize route path (convert different parameter syntaxes)
     */
    private normalizePath(routePath: string): string {
        // Remove leading/trailing slashes for consistency
        routePath = routePath.replace(/^\/+|\/+$/g, '');
        
        // Express/Fastify: /users/:id -> /users/:id
        // NestJS: /users/:id -> /users/:id
        // FastAPI: /users/{id} -> /users/:id
        // Flask: /users/<id> -> /users/:id
        // Django: users/<int:id> -> users/:id
        
        routePath = routePath.replace(/\{([^}]+)\}/g, ':$1');  // FastAPI
        routePath = routePath.replace(/<[^>:]*:?([^>]+)>/g, ':$1');  // Flask/Django
        
        return `/${routePath}`;
    }

    /**
     * Extract handler function name from line
     */
    private extractHandlerName(line: string): string {
        // Match: (req, res) => handler or async (req, res) => handler
        const arrowMatch = line.match(/=>\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        if (arrowMatch) {
            return arrowMatch[1];
        }

        // Match: function name or async function name
        const funcMatch = line.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        if (funcMatch) {
            return funcMatch[1];
        }

        return 'handler';
    }

    /**
     * Extract method name (for NestJS decorators)
     */
    private extractMethodName(lines: string[], decoratorIndex: number): string {
        // Look at next non-empty line for method definition
        for (let i = decoratorIndex + 1; i < Math.min(decoratorIndex + 3, lines.length); i++) {
            const methodMatch = lines[i].match(/^\s*(async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
            if (methodMatch) {
                return methodMatch[2];
            }
        }
        return 'handler';
    }

    /**
     * Extract Python function name
     */
    private extractPythonFunctionName(lines: string[], decoratorIndex: number): string {
        // Look at next line for function definition
        if (decoratorIndex + 1 < lines.length) {
            const funcMatch = lines[decoratorIndex + 1].match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (funcMatch) {
                return funcMatch[1];
            }
        }
        return 'handler';
    }

    /**
     * Detect backend framework
     */
    detectFramework(projectRoot: string): 'express' | 'nestjs' | 'fastify' | 'fastapi' | 'flask' | 'django' | 'unknown' {
        try {
            const packageJsonPath = path.join(projectRoot, 'package.json');
            const requirementsPath = path.join(projectRoot, 'requirements.txt');

            // Check Node.js frameworks
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

                if (dependencies['@nestjs/core']) {
                    return 'nestjs';
                }
                if (dependencies['fastify']) {
                    return 'fastify';
                }
                if (dependencies['express']) {
                    return 'express';
                }
            }

            // Check Python frameworks
            if (fs.existsSync(requirementsPath)) {
                const requirements = fs.readFileSync(requirementsPath, 'utf8');
                if (requirements.includes('fastapi')) {
                    return 'fastapi';
                }
                if (requirements.includes('flask')) {
                    return 'flask';
                }
                if (requirements.includes('django')) {
                    return 'django';
                }
            }
        } catch (error) {
            console.error('Error detecting framework:', error);
        }

        return 'unknown';
    }
}
