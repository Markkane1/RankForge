/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

// REQ-NFR-02: initial JS bundle for authenticated routes must be <= 250KB gzipped.
const MAX_SIZE = 250 * 1024;

console.log('Checking initial JS bundle budgets...');
try {
  execSync('npm run build', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
} catch (error) {
  console.error('Build failed');
  process.exit(1);
}

const nextDir = path.join(__dirname, '..', '.next');
const appServerDir = path.join(nextDir, 'server', 'app');

if (!fs.existsSync(appServerDir)) {
  console.error('Could not find .next/server/app directory');
  process.exit(1);
}

function findPageManifests(dir, manifests = []) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      findPageManifests(fullPath, manifests);
    } else if (file === 'build-manifest.json' && path.basename(dir) === 'page') {
      manifests.push(fullPath);
    }
  }

  return manifests;
}

function routeName(manifestPath) {
  const routeDir = path.dirname(manifestPath);
  const relative = path.relative(appServerDir, path.dirname(routeDir));
  return `/${relative.replaceAll(path.sep, '/')}`.replace(/\/$/, '') || '/';
}

function initialJsFiles(manifest) {
  return [...new Set([
    ...(manifest.polyfillFiles ?? []),
    ...(manifest.rootMainFiles ?? []),
    ...Object.values(manifest.pages ?? {}).flat(),
  ].filter((file) => file.endsWith('.js')))];
}

let exceeded = false;
let checked = 0;

for (const manifestPath of findPageManifests(appServerDir)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const files = initialJsFiles(manifest);
  let total = 0;

  for (const file of files) {
    const fullPath = path.join(nextDir, file);
    if (!fs.existsSync(fullPath)) {
      console.error(`Missing bundle asset referenced by ${manifestPath}: ${file}`);
      exceeded = true;
      continue;
    }

    total += zlib.gzipSync(fs.readFileSync(fullPath)).length;
  }

  checked += 1;
  if (total > MAX_SIZE) {
    const sizeKb = (total / 1024).toFixed(2);
    console.error('ERROR: Initial JS bundle size budget exceeded!');
    console.error(`Route ${routeName(manifestPath)} is ${sizeKb}KB gzipped (Max allowed is 250KB)`);
    exceeded = true;
  }
}

if (checked === 0) {
  console.error('No app page build manifests found');
  process.exit(1);
}

if (exceeded) {
  process.exit(1);
} else {
  console.log(`Bundle size budget verified. ${checked} app route(s) are under 250KB gzipped initial JS.`);
}
