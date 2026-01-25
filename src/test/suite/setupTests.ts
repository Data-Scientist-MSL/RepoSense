import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost'
});

(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).navigator = dom.window.navigator;
(global as any).Node = dom.window.Node;
(global as any).Element = dom.window.Element;
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).HTMLInputElement = dom.window.HTMLInputElement;
(global as any).HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
(global as any).HTMLSelectElement = dom.window.HTMLSelectElement;
(global as any).HTMLButtonElement = dom.window.HTMLButtonElement;

// Mock VS Code API
const vscodeMock = {
    workspace: {
        getConfiguration: () => ({
            get: (key: string, defaultValue: any) => defaultValue,
            update: () => Promise.resolve()
        }),
        fs: {
            writeFile: () => Promise.resolve()
        }
    },
    window: {
        showInformationMessage: () => Promise.resolve(),
        showErrorMessage: () => Promise.resolve(),
        showSaveDialog: () => Promise.resolve(),
        createWebviewPanel: (...args: any[]) => ({
            webview: {
                onDidReceiveMessage: () => ({ dispose: () => {} }),
                postMessage: () => {},
                html: '',
                asWebviewUri: (uri: any) => uri
            },
            onDidDispose: () => ({ dispose: () => {} }),
            reveal: () => {},
            dispose: () => {}
        }),
        activeTextEditor: undefined,
        ViewColumn: { Two: 2 }
    },
    Uri: {
        file: (path: string) => ({ fsPath: path, toString: () => `file://${path}` }),
        joinPath: (uri: any, ...parts: string[]) => ({ ...uri, fsPath: `${uri.fsPath}/${parts.join('/')}` })
    },
    ProgressLocation: { Notification: 1 }
};

(global as any).vscode = vscodeMock;
(global as any).acquireVsCodeApi = () => vscodeMock.window.createWebviewPanel({} as any, {} as any, {} as any).webview;

