import * as vscode from 'vscode';
import * as path from 'path';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';
import { GapAnalysisProvider } from './providers/GapAnalysisProvider';
import { TestCaseProvider } from './providers/TestCaseProvider';
import { RemediationProvider } from './providers/RemediationProvider';
import { RepoSenseCodeLensProvider } from './providers/RepoSenseCodeLensProvider';
import { RepoSenseCodeActionProvider } from './providers/RepoSenseCodeActionProvider';
import { ReportPanel } from './providers/ReportPanel';
import { ChatPanel } from './providers/ChatPanel';
import { DiagnosticsManager } from './services/DiagnosticsManager';
import { GapItem } from './models/types';
import { OllamaService } from './services/llm/OllamaService';
import { TestGenerator } from './services/llm/TestGenerator';
import { RemediationEngine } from './services/llm/RemediationEngine';
import { ReportGenerator } from './services/llm/ReportGenerator';
import { ArchitectureDiagramGenerator } from './services/llm/ArchitectureDiagramGenerator';
import { DiagramLevel } from './models/diagram-types';
import { ErrorHandler } from './utils/ErrorHandler';
import { PerformanceMonitor } from './utils/PerformanceMonitor';
import { IncrementalAnalyzer } from './utils/IncrementalAnalyzer';
import { Debouncer } from './utils/BatchProcessor';

let languageClient: LanguageClient;
let codeLensProvider: RepoSenseCodeLensProvider;
let codeActionProvider: RepoSenseCodeActionProvider;
let diagnosticsManager: DiagnosticsManager;
let lastAnalysisResult: { gaps: GapItem[], summary: any } | undefined;

// Epic 4: Intelligence Layer services
let ollamaService: OllamaService;
let testGenerator: TestGenerator;
let remediationEngine: RemediationEngine;
let reportGenerator: ReportGenerator;
let diagramGenerator: ArchitectureDiagramGenerator;

// Epic 5: Error handling
let errorHandler: ErrorHandler;

// Epic 5: Performance optimization
let performanceMonitor: PerformanceMonitor;
let incrementalAnalyzer: IncrementalAnalyzer;
let scanDebouncer: Debouncer;

export function activate(context: vscode.ExtensionContext) {
    const perfTimer = PerformanceMonitor.getInstance().startTimer('extension.activate', {
        component: 'extension'
    });

    console.log('RepoSense extension is now active!');

    // Epic 5: Initialize error handling
    errorHandler = ErrorHandler.getInstance();

    // Epic 5: Initialize performance optimization
    performanceMonitor = PerformanceMonitor.getInstance();
    incrementalAnalyzer = new IncrementalAnalyzer();
    scanDebouncer = new Debouncer();

    // Epic 4: Initialize LLM services
    ollamaService = new OllamaService();
    testGenerator = new TestGenerator(ollamaService);
    remediationEngine = new RemediationEngine(ollamaService);
    reportGenerator = new ReportGenerator(ollamaService);
    diagramGenerator = new ArchitectureDiagramGenerator(ollamaService);

    // Check Ollama availability on startup
    ollamaService.checkHealth().then(isHealthy => {
        if (isHealthy) {
            console.log('Ollama service is available');
            vscode.window.showInformationMessage('RepoSense AI powered by Ollama is ready');
        } else {
            console.warn('Ollama service is not available');
            vscode.window.showWarningMessage(
                'Ollama is not running. AI features will be unavailable.',
                'Learn More'
            ).then(action => {
                if (action === 'Learn More') {
                    vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai'));
                }
            });
        }
    });

    // Start Language Server
    languageClient = startLanguageServer(context);

    // Register TreeView Providers
    const gapAnalysisProvider = new GapAnalysisProvider();
    vscode.window.registerTreeDataProvider('reposense.gapAnalysis', gapAnalysisProvider);

    const testCaseProvider = new TestCaseProvider();
    vscode.window.registerTreeDataProvider('reposense.testCases', testCaseProvider);

    const remediationProvider = new RemediationProvider();
    vscode.window.registerTreeDataProvider('reposense.remediation', remediationProvider);

    // Register CodeLens Provider
    codeLensProvider = new RepoSenseCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            [
                { language: 'typescript', scheme: 'file' },
                { language: 'javascript', scheme: 'file' },
                { language: 'typescriptreact', scheme: 'file' },
                { language: 'javascriptreact', scheme: 'file' },
                { language: 'python', scheme: 'file' }
            ],
            codeLensProvider
        )
    );

    // Register CodeAction Provider for quick fixes
    codeActionProvider = new RepoSenseCodeActionProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            [
                { language: 'typescript', scheme: 'file' },
                { language: 'javascript', scheme: 'file' },
                { language: 'typescriptreact', scheme: 'file' },
                { language: 'javascriptreact', scheme: 'file' },
                { language: 'python', scheme: 'file' }
            ],
            codeActionProvider,
            {
                providedCodeActionKinds: [
                    vscode.CodeActionKind.QuickFix,
                    vscode.CodeActionKind.RefactorExtract,
                    vscode.CodeActionKind.RefactorInline
                ]
            }
        )
    );

    // Initialize Diagnostics Manager
    diagnosticsManager = new DiagnosticsManager();
    context.subscriptions.push(diagnosticsManager);

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    statusBarItem.text = '$(pulse) RepoSense Ready';
    statusBarItem.tooltip = 'Click to scan repository';
    statusBarItem.command = 'reposense.scanRepository';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register commands
    const scanCommand = vscode.commands.registerCommand(
        'reposense.scanRepository',
        async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const scanTimer = performanceMonitor.startTimer('scan.repository', {
                workspaceRoot: workspaceFolder.uri.fsPath
            });

            statusBarItem.text = '$(sync~spin) RepoSense: Scanning...';
            
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'RepoSense: Analyzing repository...',
                    cancellable: true
                },
                async (progress, token) => {
                    progress.report({ increment: 0, message: 'Initializing...' });
                    
                    try {
                        // Send analysis request to language server
                        const result = await languageClient.sendRequest('reposense/analyze', {
                            workspaceRoot: workspaceFolder.uri.fsPath
                        }) as any;
                        
                        progress.report({ increment: 50, message: 'Processing results...' });
                        
                        if (token.isCancellationRequested) {
                            statusBarItem.text = '$(pulse) RepoSense Ready';
                            performanceMonitor.endTimer(scanTimer);
                            return;
                        }
                        
                        // Update TreeViews with real data
                        gapAnalysisProvider.update(result.gaps);
                        
                        // Update CodeLens provider
                        codeLensProvider.updateGaps(result.gaps);
                        
                        // Update CodeAction provider
                        codeActionProvider.updateGaps(result.gaps);
                        
                        // Update Diagnostics (Problems Panel)
                        diagnosticsManager.updateDiagnostics(result.gaps);
                        
                        // Store result for report panel
                        lastAnalysisResult = {
                            gaps: result.gaps,
                            summary: result.summary
                        };
                        
                        const totalGaps = result.gaps.length;
                        statusBarItem.text = `$(${totalGaps > 0 ? 'warning' : 'check'}) RepoSense: ${totalGaps} gaps found`;
                        
                        progress.report({ increment: 100, message: 'Complete!' });

                        performanceMonitor.endTimer(scanTimer);

                        // Check performance budgets
                        const budgetViolations = performanceMonitor.checkBudgets();
                        if (budgetViolations.length > 0) {
                            const critical = budgetViolations.filter(v => v.severity === 'critical');
                            if (critical.length > 0) {
                                console.warn('Performance budget violations:', critical);
                            }
                        }
                        
                        vscode.window.showInformationMessage(
                            `RepoSense scan complete! Found ${totalGaps} gaps (${result.summary.critical} critical, ${result.summary.high} high)`
                        );
                    } catch (error) {
                        performanceMonitor.endTimer(scanTimer);
                        statusBarItem.text = '$(error) RepoSense: Scan failed';
                        vscode.window.showErrorMessage(`RepoSense scan failed: ${error}`);
                    }
                }
            );
        }
    );

    const generateTestsCommand = vscode.commands.registerCommand(
        'reposense.generateTests',
        async () => {
            if (!lastAnalysisResult || !lastAnalysisResult.gaps.length) {
                vscode.window.showWarningMessage(
                    'No gaps found. Please run a scan first.',
                    'Scan Now'
                ).then(action => {
                    if (action === 'Scan Now') {
                        vscode.commands.executeCommand('reposense.scanRepository');
                    }
                });
                return;
            }

            const isHealthy = await ollamaService.checkHealth();
            if (!isHealthy) {
                vscode.window.showErrorMessage(
                    'Ollama is not running. Please start Ollama to use AI features.',
                    'Learn More'
                ).then(action => {
                    if (action === 'Learn More') {
                        vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai'));
                    }
                });
                return;
            }

            const testGenTimer = performanceMonitor.startTimer('llm.generateTests', {
                gapCount: lastAnalysisResult.gaps.length
            });

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Generating AI-powered tests...',
                    cancellable: false
                },
                async (progress) => {
                    try {
                        progress.report({ increment: 0, message: 'Analyzing gaps...' });
                        const testCases = await testGenerator.generateTestsForGaps(
                            lastAnalysisResult!.gaps
                        );
                        
                        progress.report({ increment: 50, message: 'Creating test suite...' });
                        const testSuite = await testGenerator.generateTestSuite(
                            lastAnalysisResult!.gaps
                        );
                        
                        // Save test suite to workspace
                        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                        if (workspaceFolder) {
                            const testPath = path.join(
                                workspaceFolder.uri.fsPath,
                                'tests',
                                'e2e',
                                'generated',
                                'reposense-tests.spec.ts'
                            );
                            
                            await vscode.workspace.fs.writeFile(
                                vscode.Uri.file(testPath),
                                Buffer.from(testSuite)
                            );
                            
                            progress.report({ increment: 100, message: 'Complete!' });

                            performanceMonitor.endTimer(testGenTimer);
                            
                            const action = await vscode.window.showInformationMessage(
                                `Generated ${testCases.length} AI-powered tests!`,
                                'View Tests',
                                'Run Tests'
                            );
                            
                            if (action === 'View Tests') {
                                vscode.window.showTextDocument(vscode.Uri.file(testPath));
                            }
                        }
                    } catch (error) {
                        performanceMonitor.endTimer(testGenTimer);
                        vscode.window.showErrorMessage(`Test generation failed: ${error}`);
                    }
                }
            );
        }
    );

    const showReportCommand = vscode.commands.registerCommand(
        'reposense.showReport',
        () => {
            if (!lastAnalysisResult) {
                vscode.window.showWarningMessage(
                    'No analysis data available. Please run a scan first.',
                    'Scan Now'
                ).then(action => {
                    if (action === 'Scan Now') {
                        vscode.commands.executeCommand('reposense.scanRepository');
                    }
                });
                return;
            }
            
            ReportPanel.createOrShow(
                context.extensionUri,
                lastAnalysisResult.gaps,
                lastAnalysisResult.summary
            );
        }
    );

    const fixGapCommand = vscode.commands.registerCommand(
        'reposense.fixGap',
        async (gap?: GapItem) => {
            let gapToFix = gap;
            
            if (!gapToFix && lastAnalysisResult) {
                // Show quick pick if no gap provided
                const items = lastAnalysisResult.gaps.map(g => ({
                    label: g.message,
                    description: `${g.severity} - ${g.file}:${g.line}`,
                    gap: g
                }));
                
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a gap to fix'
                });
                
                if (selected) {
                    gapToFix = selected.gap;
                }
            }
            
            if (!gapToFix) {
                vscode.window.showWarningMessage('No gap selected');
                return;
            }

            const fixTimer = performanceMonitor.startTimer('llm.fixGap', {
                severity: gapToFix.severity,
                type: gapToFix.type
            });

            const isHealthy = await ollamaService.checkHealth();
            if (!isHealthy) {
                performanceMonitor.endTimer(fixTimer);
                vscode.window.showErrorMessage(
                    'Ollama is not running. Please start Ollama to use AI features.',
                    'Learn More'
                ).then(action => {
                    if (action === 'Learn More') {
                        vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai'));
                    }
                });
                return;
            }

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Generating AI remediation...',
                    cancellable: false
                },
                async (progress) => {
                    try {
                        progress.report({ increment: 0, message: 'Analyzing gap...' });
                        const remediation = await remediationEngine.generateRemediationForGap(gapToFix!);
                        
                        progress.report({ increment: 50, message: 'Preparing fix...' });
                        
                        if (remediation.autoApplicable) {
                            const action = await vscode.window.showInformationMessage(
                                `AI remediation ready (${remediation.confidence} confidence, ~${remediation.estimatedTime})\n\n${remediation.description}`,
                                'Preview',
                                'Apply Now',
                                'Cancel'
                            );
                            
                            if (action === 'Preview') {
                                await remediationEngine.previewRemediation(remediation);
                            } else if (action === 'Apply Now') {
                                const success = await remediationEngine.applyRemediation(remediation);
                                if (success) {
                                    performanceMonitor.endTimer(fixTimer);
                                    vscode.window.showInformationMessage('Remediation applied successfully!');
                                    // Re-scan to update gaps
                                    vscode.commands.executeCommand('reposense.scanRepository');
                                }
                            }
                        } else {
                            performanceMonitor.endTimer(fixTimer);
                            vscode.window.showInformationMessage(
                                `Manual fix required:\n\n${remediation.description}`,
                                'View Details'
                            );
                        }
                    } catch (error) {
                        performanceMonitor.endTimer(fixTimer);
                        vscode.window.showErrorMessage(`Remediation failed: ${error}`);
                    }
                }
            );
        }
    );

    // New commands for enhanced TreeView interactions
    const changeGroupingCommand = vscode.commands.registerCommand(
        'reposense.changeGrouping',
        async () => {
            const options = ['Severity', 'Type', 'File'];
            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select grouping mode'
            });
            
            if (selected) {
                const groupBy = selected.toLowerCase() as 'severity' | 'type' | 'file';
                gapAnalysisProvider.setGrouping(groupBy);
                vscode.window.showInformationMessage(`Grouped by ${selected}`);
            }
        }
    );

    const openInEditorCommand = vscode.commands.registerCommand(
        'reposense.openInEditor',
        (item: any) => {
            if (item?.gap?.file && item?.gap?.line) {
                const uri = vscode.Uri.file(item.gap.file);
                vscode.window.showTextDocument(uri, {
                    selection: new vscode.Range(item.gap.line - 1, 0, item.gap.line - 1, 0)
                });
            } else if (item?.remediation?.file && item?.remediation?.line) {
                const uri = vscode.Uri.file(item.remediation.file);
                vscode.window.showTextDocument(uri, {
                    selection: new vscode.Range(item.remediation.line - 1, 0, item.remediation.line - 1, 0)
                });
            } else if (item?.testCase?.file && item?.testCase?.line) {
                const uri = vscode.Uri.file(item.testCase.file);
                vscode.window.showTextDocument(uri, {
                    selection: new vscode.Range(item.testCase.line - 1, 0, item.testCase.line - 1, 0)
                });
            }
        }
    );

    const applyAutoFixCommand = vscode.commands.registerCommand(
        'reposense.applyAutoFix',
        (item: any) => {
            if (item?.remediation?.autoFixAvailable) {
                vscode.window.showInformationMessage(
                    `Auto-fix for "${item.remediation.title}" will be implemented in Epic 5`
                );
            } else {
                vscode.window.showWarningMessage('Auto-fix not available for this item');
            }
        }
    );

    const runTestCommand = vscode.commands.registerCommand(
        'reposense.runTest',
        (item: any) => {
            if (item?.testCase) {
                vscode.window.showInformationMessage(
                    `Running test "${item.testCase.name}" - Test execution will be implemented in Epic 5`
                );
            }
        }
    );

    const copyGapDetailsCommand = vscode.commands.registerCommand(
        'reposense.copyGapDetails',
        (item: any) => {
            if (item?.gap) {
                const details = `Gap: ${item.gap.message}\nFile: ${item.gap.file}:${item.gap.line}\nSeverity: ${item.gap.severity}\nSuggested Fix: ${item.gap.suggestedFix || 'N/A'}`;
                vscode.env.clipboard.writeText(details);
                vscode.window.showInformationMessage('Gap details copied to clipboard');
            }
        }
    );

    // CodeLens commands
    const showGapDetailsCommand = vscode.commands.registerCommand(
        'reposense.showGapDetails',
        (gap: any) => {
            const message = `**${gap.type.toUpperCase()}**\n\n${gap.message}\n\nSeverity: ${gap.severity}\n\n${gap.suggestedFix ? 'Suggested Fix: ' + gap.suggestedFix : ''}`;
            vscode.window.showInformationMessage(message, 'Fix Gap', 'Ignore').then(action => {
                if (action === 'Fix Gap') {
                    vscode.commands.executeCommand('reposense.fixGap', gap);
                }
            });
        }
    );

    const applyQuickFixCommand = vscode.commands.registerCommand(
        'reposense.applyQuickFix',
        (gap: any) => {
            vscode.window.showInformationMessage(
                `Quick fix: ${gap.suggestedFix}\n\nAuto-remediation will be implemented in Epic 5`,
                'Apply', 'Cancel'
            );
        }
    );

    const analyzeEndpointCommand = vscode.commands.registerCommand(
        'reposense.analyzeEndpoint',
        (endpoint: string, file: string, line: number) => {
            vscode.window.showInformationMessage(
                `Analyzing endpoint: ${endpoint}\n\nEndpoint coverage analysis will show which backends match this call.`,
                'View Backend', 'Generate Endpoint'
            );
        }
    );

    const generateEndpointCommand = vscode.commands.registerCommand(
        'reposense.generateEndpoint',
        (endpoint: string) => {
            vscode.window.showInformationMessage(
                `Generate backend endpoint: ${endpoint}\n\nEndpoint scaffolding will be implemented in Epic 5`,
                'Generate', 'Cancel'
            );
        }
    );

    const checkEndpointUsageCommand = vscode.commands.registerCommand(
        'reposense.checkEndpointUsage',
        (method: string, path: string, file: string, line: number) => {
            vscode.window.showInformationMessage(
                `Checking frontend usage for: ${method} ${path}\n\nUsage tracking will show all frontend calls to this endpoint.`,
                'View Callers'
            );
        }
    );

    const showUnusedEndpointCommand = vscode.commands.registerCommand(
        'reposense.showUnusedEndpoint',
        (method: string, path: string) => {
            vscode.window.showWarningMessage(
                `Unused endpoint detected: ${method} ${path}\n\nConsider removing this endpoint or adding frontend usage.`,
                'Remove Endpoint', 'Keep', 'Generate Frontend Call'
            );
        }
    );

    // Additional CodeAction commands
    const ignoreGapCommand = vscode.commands.registerCommand(
        'reposense.ignoreGap',
        (gap: any) => {
            vscode.window.showInformationMessage(
                `Gap ignored. Ignore functionality will be implemented in Epic 5.`,
                'Undo'
            );
        }
    );

    const removeUnusedEndpointCommand = vscode.commands.registerCommand(
        'reposense.removeUnusedEndpoint',
        (gap: any) => {
            vscode.window.showInformationMessage(
                `Remove endpoint: ${gap.message}\n\nCode removal will be implemented in Epic 5`,
                'Remove', 'Cancel'
            );
        }
    );

    const generateFrontendCallCommand = vscode.commands.registerCommand(
        'reposense.generateFrontendCall',
        (gap: any) => {
            vscode.window.showInformationMessage(
                `Generate frontend API call for: ${gap.message}\n\nCode generation will be implemented in Epic 5`,
                'Generate', 'Cancel'
            );
        }
    );

    // Epic 4: AI-powered commands
    const analyzeCodeWithAICommand = vscode.commands.registerCommand(
        'reposense.analyzeCodeWithAI',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }

            const isHealthy = await ollamaService.checkHealth();
            if (!isHealthy) {
                vscode.window.showErrorMessage(
                    'Ollama is not running. Please start Ollama to use AI features.'
                );
                return;
            }

            const selection = editor.selection;
            const code = selection.isEmpty 
                ? editor.document.getText()
                : editor.document.getText(selection);
            
            const language = editor.document.languageId;

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'AI analyzing code...',
                    cancellable: false
                },
                async () => {
                    try {
                        const analysis = await ollamaService.analyzeCode(code, language);
                        
                        // Show analysis in new document
                        const doc = await vscode.workspace.openTextDocument({
                            content: analysis,
                            language: 'markdown'
                        });
                        await vscode.window.showTextDocument(doc);
                    } catch (error) {
                        vscode.window.showErrorMessage(`AI analysis failed: ${error}`);
                    }
                }
            );
        }
    );

    const generateReportCommand = vscode.commands.registerCommand(
        'reposense.generateReport',
        async () => {
            if (!lastAnalysisResult || !lastAnalysisResult.gaps.length) {
                vscode.window.showWarningMessage(
                    'No analysis data available. Please run a scan first.',
                    'Scan Now'
                ).then(action => {
                    if (action === 'Scan Now') {
                        vscode.commands.executeCommand('reposense.scanRepository');
                    }
                });
                return;
            }

            const format = await vscode.window.showQuickPick(
                [
                    'Markdown', 
                    'Markdown with Diagrams',
                    'HTML', 
                    'Executive Summary'
                ],
                { placeHolder: 'Select report format' }
            );

            if (!format) return;

            const isHealthy = await ollamaService.checkHealth();
            if (!isHealthy && (format === 'Executive Summary' || format === 'Markdown with Diagrams')) {
                vscode.window.showErrorMessage(
                    'Ollama is required for this report format. Please start Ollama.',
                    'Learn More'
                ).then(action => {
                    if (action === 'Learn More') {
                        vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai'));
                    }
                });
                return;
            }

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Generating report...',
                    cancellable: false
                },
                async () => {
                    try {
                        let content: string;
                        let extension: string;
                        
                        if (format === 'Markdown') {
                            content = await reportGenerator.generateMarkdownReport(
                                lastAnalysisResult!.gaps,
                                lastAnalysisResult!.summary
                            );
                            extension = 'md';
                        } else if (format === 'Markdown with Diagrams') {
                            content = await reportGenerator.generateReportWithDiagrams(
                                lastAnalysisResult!.gaps,
                                lastAnalysisResult!.summary,
                                true,  // Include L1
                                true,  // Include L2
                                false  // Skip L3 for now (can be heavy)
                            );
                            extension = 'md';
                        } else if (format === 'HTML') {
                            content = await reportGenerator.generateHTMLReport(
                                lastAnalysisResult!.gaps,
                                lastAnalysisResult!.summary
                            );
                            extension = 'html';
                        } else {
                            const execReport = await reportGenerator.generateExecutiveReport(
                                lastAnalysisResult!.gaps,
                                lastAnalysisResult!.summary
                            );
                            content = JSON.stringify(execReport, null, 2);
                            extension = 'json';
                        }

                        // Save report
                        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                        if (workspaceFolder) {
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
                            const reportPath = path.join(
                                workspaceFolder.uri.fsPath,
                                'reports',
                                `reposense-report-${timestamp}.${extension}`
                            );
                            
                            await vscode.workspace.fs.writeFile(
                                vscode.Uri.file(reportPath),
                                Buffer.from(content)
                            );
                            
                            const action = await vscode.window.showInformationMessage(
                                `Report generated successfully!`,
                                'View Report',
                                'Open Folder'
                            );
                            
                            if (action === 'View Report') {
                                vscode.window.showTextDocument(vscode.Uri.file(reportPath));
                            } else if (action === 'Open Folder') {
                                vscode.commands.executeCommand(
                                    'revealFileInOS',
                                    vscode.Uri.file(reportPath)
                                );
                            }
                        }
                    } catch (error) {
                        vscode.window.showErrorMessage(`Report generation failed: ${error}`);
                    }
                }
            );
        }
    );

    const configureOllamaCommand = vscode.commands.registerCommand(
        'reposense.configureOllama',
        async () => {
            const config = vscode.workspace.getConfiguration('reposense');
            const currentEndpoint = config.get<string>('ollamaEndpoint', 'http://localhost:11434');
            const currentModel = config.get<string>('llmModel', 'deepseek-coder:6.7b');

            const endpoint = await vscode.window.showInputBox({
                prompt: 'Enter Ollama endpoint URL',
                value: currentEndpoint,
                placeHolder: 'http://localhost:11434'
            });

            if (!endpoint) return;

            // Test connection
            const tempService = new OllamaService();
            const isHealthy = await tempService.checkHealth();
            
            if (!isHealthy) {
                vscode.window.showWarningMessage(
                    'Cannot connect to Ollama at this endpoint. Save anyway?',
                    'Yes', 'No'
                ).then(async action => {
                    if (action === 'Yes') {
                        await config.update('ollamaEndpoint', endpoint, true);
                    }
                });
                return;
            }

            // Get available models
            const models = await tempService.listModels();
            const modelNames = models.map(m => m.name);
            
            const selectedModel = await vscode.window.showQuickPick(
                modelNames,
                {
                    placeHolder: 'Select LLM model',
                    canPickMany: false
                }
            );

            if (selectedModel) {
                await config.update('ollamaEndpoint', endpoint, true);
                await config.update('llmModel', selectedModel, true);
                
                // Reinitialize services
                ollamaService = new OllamaService();
                testGenerator = new TestGenerator(ollamaService);
                remediationEngine = new RemediationEngine(ollamaService);
                reportGenerator = new ReportGenerator(ollamaService);
                diagramGenerator = new ArchitectureDiagramGenerator(ollamaService);
                
                vscode.window.showInformationMessage(
                    `Ollama configured: ${selectedModel} at ${endpoint}`
                );
            }
        }
    );

    const showPerformanceReportCommand = vscode.commands.registerCommand(
        'reposense.showPerformanceReport',
        () => {
            const report = performanceMonitor.generateReport();
            const violations = performanceMonitor.checkBudgets();
            const cacheStats = incrementalAnalyzer.getStats();

            const fullReport = `${report}

## Incremental Analysis Cache

- **Hit Rate**: ${cacheStats.cacheHitRate.toFixed(1)}%
- **Cache Size**: ${cacheStats.cacheSizeMB.toFixed(2)}MB
- **Modified Files**: ${cacheStats.modifiedFiles}
- **Changed Files**: ${incrementalAnalyzer.getChangedFiles().length}

## Performance Budget Violations

${violations.length === 0 ? '*No violations detected*' : violations.map(v => 
    `- **${v.operation}** [${v.severity.toUpperCase()}]: ${v.actual.toFixed(0)}ms (expected: ${v.expected}ms, ${((v.actual - v.expected) / v.expected * 100).toFixed(0)}% over)`
).join('\n')}

## Recommendations

${violations.length > 0 ? `
Some operations exceeded performance budgets:
${violations.filter(v => v.severity === 'critical').length > 0 ? '- **Critical**: Consider optimizing these operations immediately' : ''}
${violations.filter(v => v.severity === 'warning').length > 0 ? '- **Warning**: Monitor these operations for future optimization' : ''}
` : 'All operations are within performance budgets. Great work!'}
`;

            // Show in new document
            vscode.workspace.openTextDocument({
                content: fullReport,
                language: 'markdown'
            }).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        }
    );

    const openAIChatCommand = vscode.commands.registerCommand(
        'reposense.openAIChat',
        async () => {
            const isHealthy = await ollamaService.checkHealth();
            if (!isHealthy) {
                const action = await vscode.window.showWarningMessage(
                    'Ollama is not running. The AI chat requires Ollama to be active.',
                    'Learn More',
                    'Continue Anyway'
                );
                
                if (action === 'Learn More') {
                    vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai'));
                    return;
                } else if (action !== 'Continue Anyway') {
                    return;
                }
            }

            // Open chat panel with current analysis context if available
            await ChatPanel.createOrShow(
                context.extensionUri,
                ollamaService,
                lastAnalysisResult?.gaps,
                lastAnalysisResult?.summary
    const generateArchitectureDiagramsCommand = vscode.commands.registerCommand(
        'reposense.generateArchitectureDiagrams',
        async () => {
            if (!lastAnalysisResult || !lastAnalysisResult.gaps.length) {
                vscode.window.showWarningMessage(
                    'No analysis data available. Please run a scan first.',
                    'Scan Now'
                ).then(action => {
                    if (action === 'Scan Now') {
                        vscode.commands.executeCommand('reposense.scanRepository');
                    }
                });
                return;
            }

            const isHealthy = await ollamaService.checkHealth();
            if (!isHealthy) {
                vscode.window.showErrorMessage(
                    'Ollama is required for architecture diagram generation. Please start Ollama.',
                    'Learn More'
                ).then(action => {
                    if (action === 'Learn More') {
                        vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai'));
                    }
                });
                return;
            }

            // Ask user for diagram level
            const level = await vscode.window.showQuickPick(
                [
                    { label: 'L1 - High-level Overview', value: 'L1', description: 'System overview and major components' },
                    { label: 'L2 - Component Details', value: 'L2', description: 'Component interactions and data flows' },
                    { label: 'L3 - Technical Implementation', value: 'L3', description: 'Detailed UI/UX patterns and implementation' }
                ],
                { placeHolder: 'Select diagram detail level' }
            );

            if (!level) return;

            const diagramType = await vscode.window.showQuickPick(
                [
                    { label: 'As-Is (Current State)', value: 'as-is', description: 'Shows current architecture with defects' },
                    { label: 'To-Be (Proposed State)', value: 'to-be', description: 'Shows improved architecture after remediation' },
                    { label: 'Comparison (Side-by-side)', value: 'comparison', description: 'Shows both as-is and to-be with differences' }
                ],
                { placeHolder: 'Select diagram type' }
            );

            if (!diagramType) return;

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Generating architecture diagrams...',
                    cancellable: false
                },
                async (progress) => {
                    try {
                        progress.report({ increment: 0, message: 'Analyzing architecture...' });

                        let content: string;
                        let fileName: string;
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

                        if (diagramType.value === 'comparison') {
                            progress.report({ increment: 30, message: 'Generating as-is diagram...' });
                            const comparison = await diagramGenerator.generateComparison(
                                lastAnalysisResult!.gaps,
                                level.value as DiagramLevel
                            );

                            progress.report({ increment: 60, message: 'Generating to-be diagram...' });
                            
                            // Create comparison report with both diagrams
                            content = `# Architecture Comparison - ${level.label}

${comparison.summary}

## As-Is Architecture (Current State)

${comparison.asIsDiagram.description}

### Annotations
${comparison.asIsDiagram.annotations.map(a => `- ${a}`).join('\n')}

\`\`\`mermaid
${diagramGenerator.toMermaid(comparison.asIsDiagram)}
\`\`\`

## To-Be Architecture (Proposed State)

${comparison.toBeDiagram.description}

### Annotations
${comparison.toBeDiagram.annotations.map(a => `- ${a}`).join('\n')}

\`\`\`mermaid
${diagramGenerator.toMermaid(comparison.toBeDiagram)}
\`\`\`

## Key Differences

${comparison.differences.map(d => `- [${d.impact.toUpperCase()}] ${d.type.toUpperCase()}: ${d.description}`).join('\n')}

---
*Generated on ${new Date().toLocaleString()}*
`;
                            fileName = `architecture-comparison-${level.value}-${timestamp}.md`;
                        } else if (diagramType.value === 'as-is') {
                            progress.report({ increment: 50, message: 'Generating as-is diagram...' });
                            const diagram = await diagramGenerator.generateAsIsDiagram(
                                lastAnalysisResult!.gaps,
                                level.value as DiagramLevel
                            );

                            content = `# ${diagram.title}

${diagram.description}

## Annotations
${diagram.annotations.map(a => `- ${a}`).join('\n')}

## Architecture Diagram

\`\`\`mermaid
${diagramGenerator.toMermaid(diagram)}
\`\`\`

## Legend

### Symbols
${diagram.legend.symbols.map(s => `- ${s.icon}: ${s.description}`).join('\n')}

### Colors
${diagram.legend.colors.map(c => `- ${c.color}: ${c.meaning}`).join('\n')}

---
*Generated on ${new Date().toLocaleString()}*
`;
                            fileName = `architecture-as-is-${level.value}-${timestamp}.md`;
                        } else {
                            progress.report({ increment: 50, message: 'Generating to-be diagram...' });
                            const diagram = await diagramGenerator.generateToBeDiagram(
                                lastAnalysisResult!.gaps,
                                level.value as DiagramLevel
                            );

                            content = `# ${diagram.title}

${diagram.description}

## Annotations
${diagram.annotations.map(a => `- ${a}`).join('\n')}

## Architecture Diagram

\`\`\`mermaid
${diagramGenerator.toMermaid(diagram)}
\`\`\`

## Legend

### Symbols
${diagram.legend.symbols.map(s => `- ${s.icon}: ${s.description}`).join('\n')}

### Colors
${diagram.legend.colors.map(c => `- ${c.color}: ${c.meaning}`).join('\n')}

---
*Generated on ${new Date().toLocaleString()}*
`;
                            fileName = `architecture-to-be-${level.value}-${timestamp}.md`;
                        }

                        progress.report({ increment: 80, message: 'Saving diagram...' });

                        // Save diagram to workspace
                        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                        if (workspaceFolder) {
                            const diagramsPath = path.join(
                                workspaceFolder.uri.fsPath,
                                'diagrams',
                                fileName
                            );

                            await vscode.workspace.fs.createDirectory(
                                vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, 'diagrams'))
                            );

                            await vscode.workspace.fs.writeFile(
                                vscode.Uri.file(diagramsPath),
                                Buffer.from(content)
                            );

                            progress.report({ increment: 100, message: 'Complete!' });

                            const action = await vscode.window.showInformationMessage(
                                `Architecture diagram generated successfully!`,
                                'View Diagram',
                                'Open Folder'
                            );

                            if (action === 'View Diagram') {
                                vscode.window.showTextDocument(vscode.Uri.file(diagramsPath));
                            } else if (action === 'Open Folder') {
                                vscode.commands.executeCommand(
                                    'revealFileInOS',
                                    vscode.Uri.file(diagramsPath)
                                );
                            }
                        }
                    } catch (error) {
                        vscode.window.showErrorMessage(`Diagram generation failed: ${error}`);
                    }
                }
            );
        }
    );

    context.subscriptions.push(
        scanCommand,
        generateTestsCommand,
        showReportCommand,
        fixGapCommand,
        changeGroupingCommand,
        openInEditorCommand,
        applyAutoFixCommand,
        runTestCommand,
        copyGapDetailsCommand,
        showGapDetailsCommand,
        applyQuickFixCommand,
        analyzeEndpointCommand,
        generateEndpointCommand,
        checkEndpointUsageCommand,
        showUnusedEndpointCommand,
        ignoreGapCommand,
        removeUnusedEndpointCommand,
        generateFrontendCallCommand,
        analyzeCodeWithAICommand,
        generateReportCommand,
        configureOllamaCommand,
        showPerformanceReportCommand,
        openAIChatCommand
        generateArchitectureDiagramsCommand
    );

    // Complete extension activation
    performanceMonitor.endTimer(perfTimer);
    
    const activationStats = performanceMonitor.getStats('extension.activate');
    if (activationStats && activationStats.count > 0) {
        console.log(`Extension activated in ${activationStats.avgDuration.toFixed(0)}ms`);
    }
}

export function deactivate(): Thenable<void> | undefined {
    console.log('RepoSense extension is deactivating...');
    
    try {
        // Dispose chat panel if open
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel.dispose();
        }
        
        // Dispose report panel if open
        if (ReportPanel.currentPanel) {
            ReportPanel.currentPanel.dispose();
        }
        
        // Clear performance monitor data
        if (performanceMonitor) {
            performanceMonitor.clearMetrics();
        }
        
        // Dispose incremental analyzer
        if (incrementalAnalyzer) {
            incrementalAnalyzer.dispose();
        }
        
        // Stop language client
        if (languageClient) {
            console.log('Stopping language client...');
            return languageClient.stop().then(
                () => {
                    console.log('RepoSense extension deactivated successfully');
                },
                (error) => {
                    console.error('Error stopping language client:', error);
                }
            );
        }
        
        console.log('RepoSense extension deactivated (no language client)');
        return undefined;
    } catch (error) {
        console.error('Error during deactivation:', error);
        return undefined;
    }
}

function startLanguageServer(context: vscode.ExtensionContext): LanguageClient {
    // Path to the server module
    const serverModule = context.asAbsolutePath(
        path.join('out', 'server', 'server.js')
    );

    // Server options: run the server in Node.js
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: { execArgv: ['--nolazy', '--inspect=6009'] }
        }
    };

    // Client options: define which documents to sync
    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'typescript' },
            { scheme: 'file', language: 'javascript' },
            { scheme: 'file', language: 'typescriptreact' },
            { scheme: 'file', language: 'javascriptreact' },
            { scheme: 'file', language: 'python' }
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{ts,js,tsx,jsx,py}')
        }
    };

    // Create and start the language client
    const client = new LanguageClient(
        'reposense',
        'RepoSense Language Server',
        serverOptions,
        clientOptions
    );

    client.start();

    return client;
}
