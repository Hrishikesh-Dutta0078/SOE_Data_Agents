#!/usr/bin/env node

/**
 * Prepares the server folder for Azure App Service deployment (file upload).
 * 1. Builds the client (Vite): client/ → client/dist/
 * 2. Copies client/dist/* into server/public/
 *
 * Run from project root: node scripts/prepare-deploy.js
 * Or from server: npm run deploy:prepare
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const clientDir = path.join(projectRoot, 'client');
const clientDist = path.join(clientDir, 'dist');
const serverPublic = path.join(projectRoot, 'server', 'public');

console.log('Building client...');
execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

if (!fs.existsSync(clientDist)) {
  console.error('Client build output not found at', clientDist);
  process.exit(1);
}

if (!fs.existsSync(serverPublic)) {
  fs.mkdirSync(serverPublic, { recursive: true });
  console.log('Created server/public/');
}

console.log('Copying client/dist to server/public...');
fs.cpSync(clientDist, serverPublic, { recursive: true });
console.log('Deploy preparation complete. Server folder (with public/) is ready to zip and upload.');
