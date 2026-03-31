#!/usr/bin/env node

/**
 * Prepares the server folder for Azure App Service deployment (file upload).
 *
 * client/vite.config.js sets build.outDir to ../server/public, so `vite build`
 * writes the production UI directly into server/public/. Do NOT copy client/dist
 * afterward — an old client/dist would overwrite the fresh build (stale UI in prod).
 *
 * Run from project root: node scripts/prepare-deploy.js
 * Or from server: npm run deploy:prepare
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const clientDir = path.join(projectRoot, 'client');
const serverPublic = path.join(projectRoot, 'server', 'public');

console.log('Building client (output → server/public per vite.config.js)...');
execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

const indexHtml = path.join(serverPublic, 'index.html');
if (!fs.existsSync(indexHtml)) {
  console.error('Client build output not found at', indexHtml);
  console.error('Check client/vite.config.js build.outDir is ../server/public');
  process.exit(1);
}

console.log('Deploy preparation complete. Zip the server folder (including public/) and upload.');
