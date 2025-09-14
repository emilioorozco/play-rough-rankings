#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Play Rough Rankings setup...\n');

// Check required files
const requiredFiles = [
  'package.json',
  'next.config.js',
  'tsconfig.json',
  'app/layout.tsx',
  'app/page.tsx',
  'app/globals.css',
  'app/api/trpc/[trpc]/route.ts',
  'lib/prisma.ts',
  'lib/trpc/server.ts',
  'lib/trpc/client.ts',
  'lib/trpc/provider.tsx',
  'prisma/schema.prisma',
  '.env'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json dependencies
console.log('\n📦 Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
  'next',
  'react',
  'react-dom',
  'typescript',
  '@types/node',
  '@types/react',
  '@types/react-dom',
  '@picocss/pico',
  'prisma',
  '@prisma/client',
  '@trpc/server',
  '@trpc/client',
  '@trpc/react-query',
  '@trpc/next',
  '@tanstack/react-query',
  'zod'
];

let allDepsInstalled = true;

requiredDeps.forEach(dep => {
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    console.log(`✅ ${dep} - ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep} - MISSING`);
    allDepsInstalled = false;
  }
});

// Check Prisma schema
console.log('\n🗄️  Checking Prisma schema...');
const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
const requiredModels = ['Game', 'Player', 'PlayerGameStats', 'Store', 'Tournament', 'Match'];

requiredModels.forEach(model => {
  if (schemaContent.includes(`model ${model}`)) {
    console.log(`✅ ${model} model defined`);
  } else {
    console.log(`❌ ${model} model - MISSING`);
    allFilesExist = false;
  }
});

// Summary
console.log('\n📋 Setup Summary:');
if (allFilesExist && allDepsInstalled) {
  console.log('🎉 All components are properly configured!');
  console.log('\n📝 Next steps:');
  console.log('1. Configure your PostgreSQL database URL in .env');
  console.log('2. Run: npm run db:push (to sync schema with database)');
  console.log('3. Run: npm run dev (to start development server)');
  console.log('4. Visit: http://localhost:3000');
} else {
  console.log('❌ Setup incomplete. Please check the missing components above.');
  process.exit(1);
}