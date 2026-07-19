/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 250 KB in bytes
const MAX_SIZE = 250 * 1024;

console.log('Running bundle analysis...');
try {
  execSync('npm run build', { stdio: 'inherit', env: { ...process.env, ANALYZE: 'true' } });
} catch (error) {
  console.error('Build failed');
  process.exit(1);
}

const chunksDir = path.join(__dirname, '..', '.next', 'static', 'chunks');

if (!fs.existsSync(chunksDir)) {
  console.error('Could not find .next/static/chunks directory');
  process.exit(1);
}

let exceeded = false;

function checkSize(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      checkSize(fullPath);
    } else if (file.endsWith('.js')) {
      if (stats.size > MAX_SIZE) {
        const sizeKb = (stats.size / 1024).toFixed(2);
        console.error(`ERROR: Bundle size budget exceeded!`);
        console.error(`File ${file} is ${sizeKb}KB (Max allowed is 250KB)`);
        exceeded = true;
      }
    }
  }
}

checkSize(chunksDir);

if (exceeded) {
  process.exit(1);
} else {
  console.log('Bundle size budget verified. All chunks are under 250KB.');
}
