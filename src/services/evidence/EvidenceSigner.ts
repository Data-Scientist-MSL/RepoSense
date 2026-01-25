import * as crypto from 'crypto';
import * as fs from 'fs';

export class EvidenceSigner {
    private privateKey: string;
    private publicKey: string;

    constructor() {
        // In a real application, these would be loaded from a secure vault or config
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });
        this.privateKey = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
        this.publicKey = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    }

    /**
     * Sign a data string or object
     */
    sign(data: string | object): string {
        const content = typeof data === 'string' ? data : JSON.stringify(data);
        const signer = crypto.createSign('sha256');
        signer.update(content);
        signer.end();
        return signer.sign(this.privateKey, 'base64');
    }

    /**
     * Verify a signature against data
     */
    verify(data: string | object, signature: string): boolean {
        const content = typeof data === 'string' ? data : JSON.stringify(data);
        const verifier = crypto.createVerify('sha256');
        verifier.update(content);
        verifier.end();
        return verifier.verify(this.publicKey, signature, 'base64');
    }

    /**
     * Get the public key for external verification
     */
    getPublicKey(): string {
        return this.publicKey;
    }
}

let instance: EvidenceSigner | null = null;
export function getEvidenceSigner(): EvidenceSigner {
    if (!instance) {
        instance = new EvidenceSigner();
    }
    return instance;
}
