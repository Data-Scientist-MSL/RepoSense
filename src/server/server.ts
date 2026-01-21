import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    InitializeResult,
    TextDocumentSyncKind
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { AnalysisEngine } from './analysis/AnalysisEngine';

// Create connection to the language client
const connection = createConnection(ProposedFeatures.all);

// Create document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Analysis engine instance
let analysisEngine: AnalysisEngine;

connection.onInitialize((params: InitializeParams) => {
    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental
        }
    };

    connection.console.log('RepoSense Language Server initializing...');
    return result;
});

connection.onInitialized(() => {
    connection.console.log('RepoSense Language Server initialized');
    analysisEngine = new AnalysisEngine(connection);
});

// Custom request: Analyze repository
connection.onRequest('reposense/analyze', async (params: { workspaceRoot: string }) => {
    connection.console.log(`Analyzing repository: ${params.workspaceRoot}`);
    
    // Set a timeout for the analysis operation
    const timeoutMs = 300000; // 5 minutes
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout: operation took longer than 5 minutes')), timeoutMs);
    });
    
    try {
        const analysisPromise = analysisEngine.analyzeRepository(params.workspaceRoot);
        const result = await Promise.race([analysisPromise, timeoutPromise]) as any;
        connection.console.log(`Analysis complete. Found ${result.gaps.length} gaps`);
        return result;
    } catch (error: any) {
        const errorMessage = error?.message || String(error);
        connection.console.error(`Analysis failed: ${errorMessage}`);
        
        // Log the stack trace for debugging
        if (error?.stack) {
            connection.console.error(`Stack trace: ${error.stack}`);
        }
        
        // Return empty result with error indication
        return {
            gaps: [],
            apiCalls: [],
            endpoints: [],
            timestamp: Date.now(),
            summary: { critical: 0, high: 0, medium: 0, low: 0 },
            error: errorMessage
        };
    }
});

// Custom request: Analyze single file
connection.onRequest('reposense/analyzeFile', async (params: { filePath: string }) => {
    connection.console.log(`Analyzing file: ${params.filePath}`);
    
    // Set a timeout for file analysis
    const timeoutMs = 30000; // 30 seconds
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('File analysis timeout: operation took longer than 30 seconds')), timeoutMs);
    });
    
    try {
        const analysisPromise = analysisEngine.analyzeFile(params.filePath);
        const result = await Promise.race([analysisPromise, timeoutPromise]) as any;
        return result;
    } catch (error: any) {
        const errorMessage = error?.message || String(error);
        connection.console.error(`File analysis failed: ${errorMessage}`);
        
        // Log the stack trace for debugging
        if (error?.stack) {
            connection.console.error(`Stack trace: ${error.stack}`);
        }
        
        return { gaps: [], error: errorMessage };
    }
});

// Document change handler (for incremental analysis)
documents.onDidChangeContent(async change => {
    connection.console.log(`Document changed: ${change.document.uri}`);
    // Future: Implement incremental analysis
});

// Document close handler
documents.onDidClose(e => {
    connection.console.log(`Document closed: ${e.document.uri}`);
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen for connection
connection.listen();

connection.console.log('RepoSense Language Server started');
