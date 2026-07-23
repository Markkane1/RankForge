const fs = require('fs');
const path = require('path');

const srcRoot = path.join(process.cwd(), 'apps', 'web', 'src');
const apiRoot = path.join(srcRoot, 'app', 'api');

const frameworkOrPublicRoutes = [
  /^\/api\/?$/,
  /^\/api\/auth\//,
  /^\/api\/webhooks\//,
  /^\/api\/health$/,
];

const reviewedUnwiredRoutes = new Set([]);

function walk(dir, predicate, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, predicate, files);
    else if (predicate(entry.name)) files.push(file);
  }

  return files;
}

function apiRouteFromFile(file) {
  const relativeDir = path.relative(apiRoot, path.dirname(file)).replace(/\\/g, '/');
  return `/api${relativeDir === '' ? '' : `/${relativeDir}`}`;
}

function routeReferenceRegex(route) {
  const pattern = route
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (/^\[.+\]$/.test(segment)) return '\\$\\{[^}]+\\}';
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('\\/');

  return new RegExp(`\\/${pattern}`);
}

const sourceFiles = walk(srcRoot, (name) => /\.(ts|tsx)$/.test(name));
const sourceText = sourceFiles
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');

const orphaned = [];

for (const file of walk(apiRoot, (name) => name === 'route.ts')) {
  const route = apiRouteFromFile(file);
  if (frameworkOrPublicRoutes.some((allowed) => allowed.test(route))) continue;
  if (reviewedUnwiredRoutes.has(route)) continue;

  const routeSource = fs.readFileSync(file, 'utf8');
  const references = sourceText.replace(routeSource, '');

  if (!routeReferenceRegex(route).test(references)) {
    orphaned.push(route);
  }
}

if (orphaned.length) {
  console.error('Unreferenced API route files found:');
  for (const route of orphaned) console.error(`- ${route}`);
  console.error('Wire the route from UI/lib code or add a reviewed exception.');
  process.exit(1);
}

console.log('API route reachability verified.');
