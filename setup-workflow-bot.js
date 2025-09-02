#!/usr/bin/env node

/**
 * Autofy Workflow Bot Setup Script
 * This script helps you set up the workflow bot components
 */

import fs from 'fs';
import path from 'path';

console.log('🤖 Autofy Workflow Bot Setup');
console.log('==============================\n');

// Check if required files exist
const requiredFiles = [
  'src/components/WorkflowBotChat.tsx',
  'src/pages/WorkflowBotDemo.tsx',
  'src/utils/secretsHandler.ts',
  'src/types/workflowBot.ts',
  'supabase/functions/chat-bot/index.ts',
  'supabase/functions/create-zap/index.ts',
  'supabase/migrations/20240102000001_create_chat_schema.sql',
  'supabase/migrations/20240102000002_create_match_messages_function.sql'
];

console.log('✅ Checking required files...');
const missingFiles = [];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✓ ${file}`);
  } else {
    console.log(`   ✗ ${file} (MISSING)`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log(`\n❌ Missing ${missingFiles.length} required files. Please ensure all components are created.`);
  process.exit(1);
}

console.log('\n✅ All required files are present!');

// Check package.json dependencies
console.log('\n📦 Checking dependencies...');

const packageJsonPath = 'package.json';
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = ['@supabase/supabase-js', 'lucide-react'];
  const missingDeps = [];
  
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`   ✓ ${dep}`);
    } else {
      console.log(`   ✗ ${dep} (MISSING)`);
      missingDeps.push(dep);
    }
  });
  
  if (missingDeps.length > 0) {
    console.log(`\n⚠️  Missing dependencies. Run: npm install ${missingDeps.join(' ')}`);
  } else {
    console.log('\n✅ All dependencies are installed!');
  }
} else {
  console.log('   ⚠️  package.json not found');
}

// Check environment variables
console.log('\n🔧 Environment Variables Setup');
console.log('Add these to your Supabase project environment:');
console.log('');
console.log('GEMINI_API_KEY=your_gemini_api_key_here');
console.log('');
console.log('Your existing Supabase variables should work:');
console.log('- VITE_SUPABASE_URL');
console.log('- VITE_SUPABASE_ANON_KEY');

// Next steps
console.log('\n🚀 Next Steps:');
console.log('');
console.log('1. Run the database migrations in Supabase SQL editor:');
console.log('   - supabase/migrations/20240102000001_create_chat_schema.sql');
console.log('   - supabase/migrations/20240102000002_create_match_messages_function.sql');
console.log('');
console.log('2. Add GEMINI_API_KEY to your Supabase project environment');
console.log('');
console.log('3. Deploy the edge functions:');
console.log('   supabase functions deploy chat-bot');
console.log('   supabase functions deploy create-zap');
console.log('');
console.log('4. Start your development server:');
console.log('   npm run dev');
console.log('');
console.log('5. Navigate to /bot in your app to access the workflow bot!');
console.log('');
console.log('🎉 The workflow bot is ready! You can now:');
console.log('   - Create zaps through natural conversation');
console.log('   - Get real-time JSON validation');
console.log('   - Secure API key handling with {{secrets.KEY}}');
console.log('   - One-click deployment to your dashboard');
console.log('');
console.log('📚 For more details, see docs/WORKFLOW_BOT_SETUP.md');
