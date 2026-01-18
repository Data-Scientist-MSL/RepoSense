import { APICall } from '../../models/types';
import * as fs from 'fs';
import * as path from 'path';

export class FrontendAnalyzer {
    private readonly FRONTEND_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.vue'];

    /**
     * Extract all API calls from frontend code
     */
    async extractAPICalls(filePath: string): Promise<APICall[]> {
        const calls: APICall[] = [];
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const ext = path.extname(filePath);

            if (!this.FRONTEND_EXTENSIONS.includes(ext)) {
                return calls;
            }

            const lines = content.split('\n');

            // Pattern 1: fetch() calls
            calls.push(...this.extractFetchCalls(lines, filePath));

            // Pattern 2: axios calls
            calls.push(...this.extractAxiosCalls(lines, filePath));

            // Pattern 3: Angular $http
            calls.push(...this.extractAngularHttpCalls(lines, filePath));

            // Pattern 4: Custom HTTP wrappers
            calls.push(...this.extractCustomApiCalls(lines, filePath));

        } catch (error) {
            console.error(`Error extracting API calls from ${filePath}:`, error);
        }

        return calls;
    }

    /**
     * Extract fetch() API calls
     */
    private extractFetchCalls(lines: string[], filePath: string): APICall[] {
        const calls: APICall[] = [];
        
        // Match: fetch('url'), fetch("url"), fetch(`url`), fetch(url)
        const patterns = [
            /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
            /fetch\s*\(\s*`([^`]*\$\{[^}]+\}[^`]*)`/g, // Template literals
        ];

        lines.forEach((line, index) => {
            patterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    const endpoint = match[1];
                    const method = this.inferMethodFromContext(line, lines, index);
                    
                    calls.push({
                        endpoint: this.cleanEndpoint(endpoint),
                        method: method || 'GET',
                        file: filePath,
                        line: index + 1,
                        component: this.extractComponentName(filePath)
                    });
                }
            });
        });

        return calls;
    }

    /**
     * Extract axios API calls
     */
    private extractAxiosCalls(lines: string[], filePath: string): APICall[] {
        const calls: APICall[] = [];
        
        // Match: axios.get(), axios.post(), axios['method']()
        const methodPattern = /axios\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
        const genericPattern = /axios\s*\(\s*\{[^}]*url:\s*['"`]([^'"`]+)['"`][^}]*method:\s*['"`]([^'"`]+)['"`]/g;

        lines.forEach((line, index) => {
            // Direct method calls
            let match;
            while ((match = methodPattern.exec(line)) !== null) {
                calls.push({
                    endpoint: this.cleanEndpoint(match[2]),
                    method: match[1].toUpperCase() as any,
                    file: filePath,
                    line: index + 1,
                    component: this.extractComponentName(filePath)
                });
            }

            // Generic axios({ url, method }) calls
            while ((match = genericPattern.exec(line)) !== null) {
                calls.push({
                    endpoint: this.cleanEndpoint(match[1]),
                    method: match[2].toUpperCase() as any,
                    file: filePath,
                    line: index + 1,
                    component: this.extractComponentName(filePath)
                });
            }
        });

        return calls;
    }

    /**
     * Extract Angular $http calls
     */
    private extractAngularHttpCalls(lines: string[], filePath: string): APICall[] {
        const calls: APICall[] = [];
        
        const pattern = /\$http\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;

        lines.forEach((line, index) => {
            let match;
            while ((match = pattern.exec(line)) !== null) {
                calls.push({
                    endpoint: this.cleanEndpoint(match[2]),
                    method: match[1].toUpperCase() as any,
                    file: filePath,
                    line: index + 1,
                    component: this.extractComponentName(filePath)
                });
            }
        });

        return calls;
    }

    /**
     * Extract custom API wrapper calls (e.g., api.users.get())
     */
    private extractCustomApiCalls(lines: string[], filePath: string): APICall[] {
        const calls: APICall[] = [];
        
        // Match: apiClient.get('/endpoint'), api.post('/endpoint')
        const pattern = /(api|apiClient|httpClient)\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;

        lines.forEach((line, index) => {
            let match;
            while ((match = pattern.exec(line)) !== null) {
                calls.push({
                    endpoint: this.cleanEndpoint(match[3]),
                    method: match[2].toUpperCase() as any,
                    file: filePath,
                    line: index + 1,
                    component: this.extractComponentName(filePath)
                });
            }
        });

        return calls;
    }

    /**
     * Infer HTTP method from fetch options
     */
    private inferMethodFromContext(line: string, lines: string[], currentIndex: number): APICall['method'] | null {
        // Check current line for method option
        const methodMatch = line.match(/method:\s*['"`](GET|POST|PUT|DELETE|PATCH)['"`]/i);
        if (methodMatch) {
            return methodMatch[1].toUpperCase() as any;
        }

        // Check next few lines for method in options object
        for (let i = currentIndex + 1; i < Math.min(currentIndex + 5, lines.length); i++) {
            const nextLineMatch = lines[i].match(/method:\s*['"`](GET|POST|PUT|DELETE|PATCH)['"`]/i);
            if (nextLineMatch) {
                return nextLineMatch[1].toUpperCase() as any;
            }
        }

        return null;
    }

    /**
     * Clean and normalize endpoint URL
     */
    private cleanEndpoint(endpoint: string): string {
        // Remove query parameters for matching
        endpoint = endpoint.split('?')[0];
        
        // Handle template literals: /users/${id} -> /users/:id
        endpoint = endpoint.replace(/\$\{[^}]+\}/g, ':id');
        
        // Trim whitespace
        endpoint = endpoint.trim();
        
        return endpoint;
    }

    /**
     * Extract component name from file path
     */
    private extractComponentName(filePath: string): string {
        const fileName = path.basename(filePath, path.extname(filePath));
        return fileName;
    }

    /**
     * Detect frontend framework
     */
    detectFramework(projectRoot: string): 'react' | 'vue' | 'angular' | 'svelte' | 'unknown' {
        try {
            const packageJsonPath = path.join(projectRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

                if (dependencies['react'] || dependencies['react-dom']) {
                    return 'react';
                }
                if (dependencies['vue']) {
                    return 'vue';
                }
                if (dependencies['@angular/core']) {
                    return 'angular';
                }
                if (dependencies['svelte']) {
                    return 'svelte';
                }
            }
        } catch (error) {
            console.error('Error detecting framework:', error);
        }

        return 'unknown';
    }

    /**
     * Group API calls by component
     */
    groupByComponent(calls: APICall[]): Map<string, APICall[]> {
        const grouped = new Map<string, APICall[]>();

        for (const call of calls) {
            const component = call.component || 'unknown';
            if (!grouped.has(component)) {
                grouped.set(component, []);
            }
            grouped.get(component)!.push(call);
        }

        return grouped;
    }
}
