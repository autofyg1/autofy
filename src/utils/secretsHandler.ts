/**
 * Utilities for handling secure secrets in Autofy workflows
 * This module provides functions to identify, replace, and validate secret references
 * in workflow configurations using the {{secrets.KEY}} pattern
 */

export interface SecretReference {
  key: string;
  field: string;
  stepIndex: number;
  originalValue: string;
}

export interface SecretsValidationResult {
  isValid: boolean;
  errors: string[];
  secretsFound: SecretReference[];
  processedZap: any;
}

// Common patterns that indicate sensitive data
const SENSITIVE_FIELD_PATTERNS = [
  /api[_\-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /auth/i,
  /credential/i,
  /private[_\-]?key/i,
  /access[_\-]?key/i,
  /service[_\-]?key/i,
];

// Email patterns that might contain sensitive data
const SENSITIVE_EMAIL_PATTERNS = [
  /@[^@\s]+\.(com|org|net|edu|gov)/i
];

// Known service-specific secret mappings
const SERVICE_SECRET_MAPPINGS: Record<string, Record<string, string>> = {
  openrouter: {
    'api_key': 'OPENROUTER_API_KEY',
    'authorization': 'OPENROUTER_API_KEY'
  },
  telegram: {
    'bot_token': 'TELEGRAM_BOT_TOKEN',
    'api_key': 'TELEGRAM_BOT_TOKEN'
  },
  notion: {
    'api_key': 'NOTION_API_KEY',
    'authorization': 'NOTION_API_KEY',
    'integration_token': 'NOTION_API_KEY'
  },
  gmail: {
    'client_secret': 'GMAIL_CLIENT_SECRET',
    'refresh_token': 'GMAIL_REFRESH_TOKEN',
    'access_token': 'GMAIL_ACCESS_TOKEN'
  }
};

/**
 * Detects if a field name or value appears to contain sensitive data
 */
export function isSensitiveField(fieldName: string, value?: string): boolean {
  // Check field name patterns
  const fieldMatches = SENSITIVE_FIELD_PATTERNS.some(pattern => 
    pattern.test(fieldName)
  );

  if (fieldMatches) return true;

  // Check value patterns if provided
  if (value) {
    // Long alphanumeric strings that look like API keys
    if (value.length > 20 && /^[A-Za-z0-9_\-+/=]{20,}$/.test(value)) {
      return true;
    }

    // JWT tokens
    if (/^eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]*$/.test(value)) {
      return true;
    }

    // Base64 encoded values that are suspiciously long
    if (value.length > 30 && /^[A-Za-z0-9+/=]{30,}$/.test(value)) {
      return true;
    }
  }

  return false;
}

/**
 * Suggests a secret key name based on service and field name
 */
export function suggestSecretKey(serviceName: string, fieldName: string): string {
  const serviceMapping = SERVICE_SECRET_MAPPINGS[serviceName.toLowerCase()];
  
  if (serviceMapping && serviceMapping[fieldName.toLowerCase()]) {
    return serviceMapping[fieldName.toLowerCase()];
  }

  // Generate a reasonable secret key name
  const cleanServiceName = serviceName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const cleanFieldName = fieldName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  
  return `${cleanServiceName}_${cleanFieldName}`;
}

/**
 * Replaces sensitive values with secret references in a workflow configuration
 */
export function replaceSensitiveValuesWithSecrets(zapData: any): SecretsValidationResult {
  const errors: string[] = [];
  const secretsFound: SecretReference[] = [];
  const processedZap = JSON.parse(JSON.stringify(zapData)); // Deep clone

  if (!processedZap.steps || !Array.isArray(processedZap.steps)) {
    return {
      isValid: false,
      errors: ['Invalid zap structure: steps array is required'],
      secretsFound: [],
      processedZap: zapData
    };
  }

  processedZap.steps.forEach((step: any, stepIndex: number) => {
    if (!step.configuration || typeof step.configuration !== 'object') {
      return;
    }

    Object.entries(step.configuration).forEach(([fieldName, value]) => {
      if (typeof value === 'string' && value.trim() && !value.startsWith('{{')) {
        if (isSensitiveField(fieldName, value)) {
          const secretKey = suggestSecretKey(step.service_name, fieldName);
          const secretReference = `{{secrets.${secretKey}}}`;
          
          // Replace the value with secret reference
          step.configuration[fieldName] = secretReference;
          
          secretsFound.push({
            key: secretKey,
            field: fieldName,
            stepIndex,
            originalValue: value
          });
        }
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    secretsFound,
    processedZap
  };
}

/**
 * Validates that all secret references in a workflow are properly formatted
 */
export function validateSecretReferences(zapData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!zapData.steps || !Array.isArray(zapData.steps)) {
    return { isValid: false, errors: ['Invalid zap structure'] };
  }

  zapData.steps.forEach((step: any, stepIndex: number) => {
    if (!step.configuration) return;

    Object.entries(step.configuration).forEach(([fieldName, value]) => {
      if (typeof value === 'string' && value.includes('{{secrets.')) {
        // Validate secret reference format
        const secretMatches = value.match(/\{\{secrets\.([A-Z0-9_]+)\}\}/g);
        
        if (secretMatches) {
          secretMatches.forEach(match => {
            const keyMatch = match.match(/\{\{secrets\.([A-Z0-9_]+)\}\}/);
            if (!keyMatch) {
              errors.push(`Step ${stepIndex + 1}, field '${fieldName}': Invalid secret reference format '${match}'`);
            } else {
              const secretKey = keyMatch[1];
              if (!/^[A-Z0-9_]+$/.test(secretKey)) {
                errors.push(`Step ${stepIndex + 1}, field '${fieldName}': Secret key '${secretKey}' should only contain uppercase letters, numbers, and underscores`);
              }
            }
          });
        } else if (value.includes('{{secrets.')) {
          errors.push(`Step ${stepIndex + 1}, field '${fieldName}': Malformed secret reference in '${value}'`);
        }
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extracts all secret keys referenced in a workflow
 */
export function extractSecretKeys(zapData: any): string[] {
  const secretKeys: Set<string> = new Set();
  
  if (!zapData.steps || !Array.isArray(zapData.steps)) {
    return [];
  }

  zapData.steps.forEach((step: any) => {
    if (!step.configuration) return;

    Object.values(step.configuration).forEach((value) => {
      if (typeof value === 'string') {
        const matches = value.match(/\{\{secrets\.([A-Z0-9_]+)\}\}/g);
        if (matches) {
          matches.forEach(match => {
            const keyMatch = match.match(/\{\{secrets\.([A-Z0-9_]+)\}\}/);
            if (keyMatch) {
              secretKeys.add(keyMatch[1]);
            }
          });
        }
      }
    });
  });

  return Array.from(secretKeys).sort();
}

/**
 * Generates documentation for the secrets used in a workflow
 */
export function generateSecretsDocumentation(zapData: any): string {
  const secretKeys = extractSecretKeys(zapData);
  
  if (secretKeys.length === 0) {
    return 'This workflow does not use any secrets.';
  }

  const docs = [
    '# Secrets Configuration',
    '',
    'This workflow requires the following secrets to be configured:',
    ''
  ];

  secretKeys.forEach(key => {
    docs.push(`## ${key}`);
    docs.push(`- **Key**: \`${key}\``);
    docs.push(`- **Description**: ${getSecretDescription(key)}`);
    docs.push(`- **Reference**: \`{{secrets.${key}}}\``);
    docs.push('');
  });

  docs.push('## Security Notes');
  docs.push('- Never hardcode these values in your workflow configuration');
  docs.push('- Store secrets securely in your environment or secrets manager');
  docs.push('- The workflow executor will replace {{secrets.KEY}} with actual values at runtime');

  return docs.join('\n');
}

/**
 * Provides a description for common secret keys
 */
function getSecretDescription(secretKey: string): string {
  const descriptions: Record<string, string> = {
    'OPENROUTER_API_KEY': 'API key for OpenRouter AI service',
    'TELEGRAM_BOT_TOKEN': 'Bot token for Telegram API',
    'NOTION_API_KEY': 'Integration token for Notion API',
    'GMAIL_CLIENT_SECRET': 'OAuth client secret for Gmail API',
    'GMAIL_REFRESH_TOKEN': 'OAuth refresh token for Gmail API',
    'GMAIL_ACCESS_TOKEN': 'OAuth access token for Gmail API',
  };

  return descriptions[secretKey] || `Secret value for ${secretKey.toLowerCase().replace(/_/g, ' ')}`;
}

/**
 * Creates a template environment file for the secrets
 */
export function generateEnvTemplate(zapData: any): string {
  const secretKeys = extractSecretKeys(zapData);
  
  if (secretKeys.length === 0) {
    return '# No secrets required for this workflow';
  }

  const envLines = [
    '# Environment variables for Autofy workflow secrets',
    '# Copy this file to .env and fill in your actual values',
    ''
  ];

  secretKeys.forEach(key => {
    envLines.push(`# ${getSecretDescription(key)}`);
    envLines.push(`${key}=your_${key.toLowerCase()}_here`);
    envLines.push('');
  });

  return envLines.join('\n');
}
