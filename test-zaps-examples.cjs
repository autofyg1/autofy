#!/usr/bin/env node

/**
 * Comprehensive test suite for validating zaps_examples
 * This script validates all JSON files in the zaps_examples folder
 * and ensures they conform to the Autofy workflow specification.
 */

const fs = require('fs');
const path = require('path');

// __dirname is already available in CommonJS

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Supported service configurations
const supportedServices = {
  gmail: {
    triggers: ['new_email'],
    actions: ['send_email', 'send_reply'],
    requiredFields: {
      new_email: ['keywords'],
      send_email: ['to_email', 'subject_template', 'body_template'],
      send_reply: ['body_template']
    },
    optionalFields: {
      new_email: ['from_email'],
      send_email: ['is_html'],
      send_reply: ['custom_to_email']
    }
  },
  notion: {
    triggers: [],
    actions: ['create_page'],
    requiredFields: {
      create_page: ['database_id', 'title_template']
    },
    optionalFields: {
      create_page: ['content_template', 'properties']
    }
  },
  openrouter: {
    triggers: [],
    actions: ['process_with_ai'],
    requiredFields: {
      process_with_ai: ['model', 'prompt']
    },
    optionalFields: {
      process_with_ai: ['max_tokens', 'temperature']
    }
  },
  telegram: {
    triggers: [],
    actions: ['send_message'],
    requiredFields: {
      send_message: [] // Either message_template or message_title is required
    },
    optionalFields: {
      send_message: ['chat_id', 'message_template', 'message_title', 'parse_mode', 'disable_web_page_preview', 'disable_notification']
    }
  }
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Validate basic zap structure
 */
function validateZapStructure(zapData, filename) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!zapData.name || typeof zapData.name !== 'string') {
    errors.push('Name is required and must be a string');
  } else if (zapData.name.length > 100) {
    errors.push('Name must be 100 characters or less');
  }

  if (zapData.description && typeof zapData.description !== 'string') {
    errors.push('Description must be a string');
  } else if (zapData.description && zapData.description.length > 500) {
    errors.push('Description must be 500 characters or less');
  }

  if (!zapData.steps || !Array.isArray(zapData.steps) || zapData.steps.length === 0) {
    errors.push('Steps array is required and must contain at least one step');
  } else if (zapData.steps.length > 10) {
    errors.push('Maximum 10 steps allowed');
  }

  // Check for exactly one trigger
  const triggerSteps = zapData.steps?.filter(step => step.step_type === 'trigger') || [];
  if (triggerSteps.length !== 1) {
    errors.push('Exactly one trigger step is required');
  }

  return { errors, warnings };
}

/**
 * Validate individual step configuration
 */
function validateStep(step, stepIndex) {
  const errors = [];
  const warnings = [];

  // Basic step structure
  if (!step.step_type || !['trigger', 'action'].includes(step.step_type)) {
    errors.push(`Step ${stepIndex + 1}: step_type must be 'trigger' or 'action'`);
  }

  if (!step.service_name || typeof step.service_name !== 'string') {
    errors.push(`Step ${stepIndex + 1}: service_name is required`);
  }

  if (!step.event_type || typeof step.event_type !== 'string') {
    errors.push(`Step ${stepIndex + 1}: event_type is required`);
  }

  if (!step.configuration || typeof step.configuration !== 'object') {
    errors.push(`Step ${stepIndex + 1}: configuration object is required`);
    return { errors, warnings };
  }

  // Service-specific validation
  const serviceName = step.service_name;
  const eventType = step.event_type;
  const config = step.configuration;

  if (!supportedServices[serviceName]) {
    errors.push(`Step ${stepIndex + 1}: Unsupported service '${serviceName}'`);
    return { errors, warnings };
  }

  const serviceConfig = supportedServices[serviceName];
  const supportedEvents = [...serviceConfig.triggers, ...serviceConfig.actions];

  if (!supportedEvents.includes(eventType)) {
    errors.push(`Step ${stepIndex + 1}: Unsupported event type '${eventType}' for service '${serviceName}'`);
    return { errors, warnings };
  }

  // Check required fields
  const requiredFields = serviceConfig.requiredFields[eventType] || [];
  const optionalFields = serviceConfig.optionalFields[eventType] || [];

  // Special validation for telegram send_message
  if (serviceName === 'telegram' && eventType === 'send_message') {
    if (!config.message_template && !config.message_title) {
      errors.push(`Step ${stepIndex + 1}: Telegram send_message requires either message_template or message_title`);
    }
  } else {
    // Standard required field validation
    requiredFields.forEach(field => {
      if (!config[field]) {
        errors.push(`Step ${stepIndex + 1}: ${serviceName} ${eventType} requires '${field}'`);
      }
    });
  }

  // Check for deprecated field names
  if (serviceName === 'gmail' && eventType === 'new_email' && config.search) {
    warnings.push(`Step ${stepIndex + 1}: 'search' field is deprecated, use 'keywords' instead`);
  }

  if (serviceName === 'notion' && eventType === 'create_page' && config.properties) {
    warnings.push(`Step ${stepIndex + 1}: 'properties' format is deprecated, use 'title_template' instead`);
  }

  // Check for credential fields (should use integration references)
  const credentialFields = ['api_key', 'bot_token', 'client_id', 'client_secret', 'refresh_token', 'access_token', 'integration_token'];
  Object.keys(config).forEach(field => {
    if (credentialFields.includes(field)) {
      if (typeof config[field] === 'string' && !config[field].startsWith('{{integration.')) {
        if (config[field].length > 20) { // Likely an actual credential
          errors.push(`Step ${stepIndex + 1}: Credential field '${field}' should use {{integration.${serviceName}}} format`);
        }
      }
    }
  });

  // Check for unresolved placeholders
  Object.entries(config).forEach(([field, value]) => {
    if (typeof value === 'string') {
      const unresolvedPlaceholders = value.match(/{{[^}]+}}/g);
      if (unresolvedPlaceholders) {
        unresolvedPlaceholders.forEach(placeholder => {
          // Check if it's a valid placeholder format
          if (!placeholder.match(/{{(integration\.\w+|steps\.\d+\.\w+|\w+)}}/) && 
              !['{{subject}}', '{{sender}}', '{{body}}', '{{timestamp}}', '{{ai_content}}'].includes(placeholder)) {
            warnings.push(`Step ${stepIndex + 1}: Potentially invalid placeholder '${placeholder}' in field '${field}'`);
          }
        });
      }
    }
  });

  return { errors, warnings };
}

/**
 * Check for common patterns and best practices
 */
function validateBestPractices(zapData, filename) {
  const warnings = [];

  // Check if OpenRouter model is specified
  const aiSteps = zapData.steps?.filter(step => step.service_name === 'openrouter') || [];
  aiSteps.forEach((step, index) => {
    if (!step.configuration.model) {
      warnings.push(`AI processing step should specify a model`);
    }
  });

  // Check for reasonable message templates
  const telegramSteps = zapData.steps?.filter(step => step.service_name === 'telegram') || [];
  telegramSteps.forEach((step, index) => {
    if (step.configuration.message_template && 
        !step.configuration.message_template.includes('{{') && 
        step.configuration.message_template.length < 10) {
      warnings.push(`Telegram message template seems too simple, consider adding dynamic content`);
    }
  });

  // Check for proper email templates
  const gmailSteps = zapData.steps?.filter(step => 
    step.service_name === 'gmail' && ['send_email', 'send_reply'].includes(step.event_type)
  ) || [];
  
  gmailSteps.forEach((step, index) => {
    if (step.configuration.body_template && 
        !step.configuration.body_template.includes('{{') && 
        step.configuration.body_template.length < 20) {
      warnings.push(`Email body template seems too simple, consider adding dynamic content`);
    }
  });

  return warnings;
}

/**
 * Test a single zap file
 */
function testZapFile(filepath) {
  const filename = path.basename(filepath);
  totalTests++;

  try {
    logInfo(`Testing ${filename}...`);
    
    const fileContent = fs.readFileSync(filepath, 'utf8');
    let zapData;
    
    try {
      zapData = JSON.parse(fileContent);
    } catch (parseError) {
      const error = `Invalid JSON format: ${parseError.message}`;
      logError(`${filename}: ${error}`);
      testResults.push({ filename, passed: false, errors: [error], warnings: [] });
      failedTests++;
      return;
    }

    let allErrors = [];
    let allWarnings = [];

    // Basic structure validation
    const structureResult = validateZapStructure(zapData, filename);
    allErrors.push(...structureResult.errors);
    allWarnings.push(...structureResult.warnings);

    // Step validation
    if (zapData.steps && Array.isArray(zapData.steps)) {
      zapData.steps.forEach((step, index) => {
        const stepResult = validateStep(step, index);
        allErrors.push(...stepResult.errors);
        allWarnings.push(...stepResult.warnings);
      });
    }

    // Best practices validation
    const bestPracticesWarnings = validateBestPractices(zapData, filename);
    allWarnings.push(...bestPracticesWarnings);

    // Record results
    const passed = allErrors.length === 0;
    testResults.push({
      filename,
      passed,
      errors: allErrors,
      warnings: allWarnings
    });

    if (passed) {
      passedTests++;
      logSuccess(`${filename}: PASSED`);
      if (allWarnings.length > 0) {
        allWarnings.forEach(warning => logWarning(`  ${warning}`));
      }
    } else {
      failedTests++;
      logError(`${filename}: FAILED`);
      allErrors.forEach(error => logError(`  ${error}`));
      if (allWarnings.length > 0) {
        allWarnings.forEach(warning => logWarning(`  ${warning}`));
      }
    }

  } catch (error) {
    const errorMsg = `Test execution error: ${error.message}`;
    logError(`${filename}: ${errorMsg}`);
    testResults.push({ filename, passed: false, errors: [errorMsg], warnings: [] });
    failedTests++;
  }
}

/**
 * Generate test report
 */
function generateReport() {
  log('\n' + '='.repeat(60), 'bright');
  log('               TEST REPORT', 'bright');
  log('='.repeat(60), 'bright');

  log(`\nTotal Tests: ${totalTests}`);
  logSuccess(`Passed: ${passedTests}`);
  logError(`Failed: ${failedTests}`);
  
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');

  // Detailed results
  if (failedTests > 0) {
    log('\n' + '-'.repeat(40), 'bright');
    log('FAILED TESTS SUMMARY:', 'bright');
    log('-'.repeat(40), 'bright');
    
    testResults.filter(result => !result.passed).forEach(result => {
      logError(`\n${result.filename}:`);
      result.errors.forEach(error => log(`  • ${error}`, 'red'));
    });
  }

  if (testResults.some(result => result.warnings.length > 0)) {
    log('\n' + '-'.repeat(40), 'bright');
    log('WARNINGS SUMMARY:', 'bright');
    log('-'.repeat(40), 'bright');
    
    testResults.filter(result => result.warnings.length > 0).forEach(result => {
      logWarning(`\n${result.filename}:`);
      result.warnings.forEach(warning => log(`  • ${warning}`, 'yellow'));
    });
  }

  // JSON report for CI/CD
  const jsonReport = {
    timestamp: new Date().toISOString(),
    totalTests,
    passedTests,
    failedTests,
    successRate: parseFloat(successRate),
    results: testResults
  };

  fs.writeFileSync(
    path.join(__dirname, 'test-results.json'), 
    JSON.stringify(jsonReport, null, 2)
  );

  log('\n📊 Detailed results saved to test-results.json', 'cyan');
}

/**
 * Main test execution
 */
function main() {
  log('🔍 Starting Autofy Zaps Examples Validation', 'bright');
  log('=' .repeat(50), 'bright');

  const zapExamplesDir = path.join(__dirname, 'zaps_examples');

  if (!fs.existsSync(zapExamplesDir)) {
    logError('zaps_examples directory not found!');
    process.exit(1);
  }

  const files = fs.readdirSync(zapExamplesDir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(zapExamplesDir, file));

  if (files.length === 0) {
    logWarning('No JSON files found in zaps_examples directory');
    process.exit(0);
  }

  logInfo(`Found ${files.length} zap files to test\n`);

  // Test each file
  files.forEach(testZapFile);

  // Generate and display report
  generateReport();

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run if this is the main module
if (require.main === module) {
  main();
}

module.exports = { testZapFile, validateZapStructure, validateStep };
