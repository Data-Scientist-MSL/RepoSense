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
exports.EvidenceSigner = void 0;
exports.getEvidenceSigner = getEvidenceSigner;
const crypto = __importStar(require("crypto"));
class EvidenceSigner {
    constructor() {
        // In a real application, these would be loaded from a secure vault or config
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });
        this.privateKey = privateKey.export({ type: 'pkcs8', format: 'pem' });
        this.publicKey = publicKey.export({ type: 'spki', format: 'pem' });
    }
    /**
     * Sign a data string or object
     */
    sign(data) {
        const content = typeof data === 'string' ? data : JSON.stringify(data);
        const signer = crypto.createSign('sha256');
        signer.update(content);
        signer.end();
        return signer.sign(this.privateKey, 'base64');
    }
    /**
     * Verify a signature against data
     */
    verify(data, signature) {
        const content = typeof data === 'string' ? data : JSON.stringify(data);
        const verifier = crypto.createVerify('sha256');
        verifier.update(content);
        verifier.end();
        return verifier.verify(this.publicKey, signature, 'base64');
    }
    /**
     * Get the public key for external verification
     */
    getPublicKey() {
        return this.publicKey;
    }
}
exports.EvidenceSigner = EvidenceSigner;
let instance = null;
function getEvidenceSigner() {
    if (!instance) {
        instance = new EvidenceSigner();
    }
    return instance;
}
