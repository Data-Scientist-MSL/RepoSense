/**
 * Redactor.ts (Sprint 12 - Security)
 * 
 * Redacts secrets from logs, errors, and artifacts.
 * Prevents accidental exposure of API keys, tokens, auth headers.
 */

export interface RedactionPattern {
  pattern: RegExp;
  replacement: string;
  category: string;
}

export class Redactor {
  private static readonly PATTERNS: RedactionPattern[] = [
    // API Keys
    {
      pattern: /api[_-]?key['":\s]*(['\"]?)([A-Za-z0-9_-]{20,})\1/gi,
      replacement: 'api_key="[REDACTED_API_KEY]"',
      category: 'API_KEY',
    },
    // AWS Keys
    {
      pattern: /(AKIA[0-9A-Z]{16})/g,
      replacement: '[REDACTED_AWS_KEY]',
      category: 'AWS_KEY',
    },
    // Bearer Tokens
    {
      pattern: /bearer[\s]+([A-Za-z0-9._-]+)/gi,
      replacement: 'bearer [REDACTED_TOKEN]',
      category: 'BEARER_TOKEN',
    },
    // OAuth Tokens
    {
      pattern: /oauth[_-]?token['":\s]*(['\"]?)([A-Za-z0-9._-]{20,})\1/gi,
      replacement: 'oauth_token="[REDACTED_TOKEN]"',
      category: 'OAUTH_TOKEN',
    },
    // GitHub Tokens
    {
      pattern: /(gh[pousr]{1,2}_[A-Za-z0-9_]{36,255})/g,
      replacement: '[REDACTED_GITHUB_TOKEN]',
      category: 'GITHUB_TOKEN',
    },
    // Private Keys
    {
      pattern: /-----BEGIN (RSA|PRIVATE|EC) PRIVATE KEY-----[\s\S]*?-----END \1 PRIVATE KEY-----/g,
      replacement: '[REDACTED_PRIVATE_KEY]',
      category: 'PRIVATE_KEY',
    },
    // Authorization Headers
    {
      pattern: /authorization['":\s]*(['\"]?)Bearer ([A-Za-z0-9._-]+)\1/gi,
      replacement: 'Authorization: Bearer [REDACTED]',
      category: 'AUTH_HEADER',
    },
    // Password Strings
    {
      pattern: /password['":\s]*(['\"])([^'"]+)\1/gi,
      replacement: 'password="[REDACTED_PASSWORD]"',
      category: 'PASSWORD',
    },
    // Connection Strings
    {
      pattern: /(?:mongodb|mysql|postgres):[\/\/]*[^:]+:[^@]+@/gi,
      replacement: 'connection_string=[REDACTED_CREDENTIALS]@',
      category: 'CONNECTION_STRING',
    },
    // AWS Secrets
    {
      pattern: /aws[_-]?secret[_-]?access[_-]?key['":\s]*(['\"]?)([A-Za-z0-9/+=]{40})\1/gi,
      replacement: 'aws_secret_access_key="[REDACTED_SECRET]"',
      category: 'AWS_SECRET',
    },
  ];

  /**
   * Redact secrets from a string.
   * Returns redacted string and list of detected secrets.
   */
  static redact(
    text: string
  ): { redacted: string; detected: Array<{ category: string; count: number }> } {
    let redacted = text;
    const detected: Array<{ category: string; count: number }> = [];

    for (const pattern of this.PATTERNS) {
      const matches = text.match(pattern.pattern);
      if (matches) {
        detected.push({
          category: pattern.category,
          count: matches.length,
        });
        redacted = redacted.replace(pattern.pattern, pattern.replacement);
      }
    }

    return { redacted, detected };
  }

  /**
   * Redact secrets from an object (recursively).
   */
  static redactObject(
    obj: unknown
  ): { redacted: unknown; detected: Array<{ category: string; count: number }> } {
    const detected: Map<string, number> = new Map();

    const redactRecursive = (val: unknown): unknown => {
      if (typeof val === 'string') {
        const { redacted, detected: found } = this.redact(val);
        found.forEach((d) => {
          detected.set(d.category, (detected.get(d.category) || 0) + d.count);
        });
        return redacted;
      }

      if (Array.isArray(val)) {
        return val.map((item) => redactRecursive(item));
      }

      if (val !== null && typeof val === 'object') {
        const redacted: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
          redacted[key] = redactRecursive(value);
        }
        return redacted;
      }

      return val;
    };

    const redacted = redactRecursive(obj);

    return {
      redacted,
      detected: Array.from(detected.entries()).map(([category, count]) => ({
        category,
        count,
      })),
    };
  }

  /**
   * Redact an error message.
   */
  static redactError(error: Error): string {
    const { redacted } = this.redact(error.message);
    if (error.cause) {
      const causeStr = error.cause instanceof Error ? error.cause.message : String(error.cause);
      const { redacted: causeRedacted } = this.redact(causeStr);
      return `${redacted} (cause: ${causeRedacted})`;
    }
    return redacted;
  }

  /**
   * Check if a string contains secrets (without redacting).
   */
  static containsSecrets(text: string): boolean {
    for (const pattern of this.PATTERNS) {
      if (pattern.pattern.test(text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * List all secret categories that are being monitored.
   */
  static getMonitoredCategories(): string[] {
    return [...new Set(this.PATTERNS.map((p) => p.category))];
  }
}
