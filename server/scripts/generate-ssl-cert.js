/**
 * Generate self-signed cert.pem and key.pem for local HTTPS (no OpenSSL required).
 * Run from server/: npm run ssl:gen
 */

const fs = require('fs');
const path = require('path');

let selfsigned;
try {
  selfsigned = require('selfsigned');
} catch (_) {
  console.error('Run: npm install selfsigned --save-dev');
  process.exit(1);
}

const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365, keySize: 2048 });

const dir = path.join(__dirname, '..');
fs.writeFileSync(path.join(dir, 'cert.pem'), pems.cert);
fs.writeFileSync(path.join(dir, 'key.pem'), pems.private);

console.log('Created cert.pem and key.pem in server/');
