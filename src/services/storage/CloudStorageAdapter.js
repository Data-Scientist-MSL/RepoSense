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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudStorageAdapter = exports.MockStorageProvider = void 0;
exports.getCloudStorage = getCloudStorage;
const path = __importStar(require("path"));
class MockStorageProvider {
    async uploadFile(localPath, remotePath) {
        console.log(`[MockStorage] Uploading ${localPath} to ${remotePath}`);
        return `https://cloud-storage.mock/${remotePath}`;
    }
    async downloadFile(remotePath, localPath) {
        console.log(`[MockStorage] Downloading ${remotePath} to ${localPath}`);
    }
    async getSignedUrl(remotePath, expiresInSeconds) {
        return `https://cloud-storage.mock/${remotePath}?expires=${Date.now() + expiresInSeconds * 1000}`;
    }
    async deleteFile(remotePath) {
        console.log(`[MockStorage] Deleting ${remotePath}`);
    }
}
exports.MockStorageProvider = MockStorageProvider;
class CloudStorageAdapter {
    constructor(provider) {
        // Default to Mock for now, can be configured to S3/GCS later
        this.provider = provider || new MockStorageProvider();
    }
    async uploadArtifact(localPath, runId, artifactType) {
        const fileName = path.basename(localPath);
        const remotePath = `runs/${runId}/${artifactType}/${fileName}`;
        return this.provider.uploadFile(localPath, remotePath);
    }
    async generateReportLink(runId) {
        const remotePath = `runs/${runId}/reports/report.html`;
        return this.provider.getSignedUrl(remotePath, 3600 * 24 * 7); // 7 days
    }
}
exports.CloudStorageAdapter = CloudStorageAdapter;
let instance = null;
function getCloudStorage() {
    if (!instance) {
        instance = new CloudStorageAdapter();
    }
    return instance;
}
