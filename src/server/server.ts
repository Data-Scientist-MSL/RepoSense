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
    
    try {
        const result = await analysisEngine.analyzeRepository(params.workspaceRoot);
        connection.console.log(`Analysis complete. Found ${result.gaps.length} gaps`);
        return result;
    } catch (error) {
        connection.console.error(`Analysis failed: ${error}`);
        return {
            gaps: [],
            apiCalls: [],
            endpoints: [],
            timestamp: Date.now(),
            summary: { critical: 0, high: 0, medium: 0, low: 0 }
        };
    }
});

// Custom request: Analyze single file
connection.onRequest('reposense/analyzeFile', async (params: { filePath: string }) => {
    connection.console.log(`Analyzing file: ${params.filePath}`);
    
    try {
        const result = await analysisEngine.analyzeFile(params.filePath);
        return result;
    } catch (error) {
        connection.console.error(`File analysis failed: ${error}`);
        return { gaps: [] };
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
