const { spawnSync } = require('child_process');

const reviewedHighRisk = new Map([
  ['@sentry/nextjs', 'Requires Sentry major upgrade; tracked as dependency hardening debt.'],
  ['nodemailer', 'Pulled by Auth.js/Nodemailer provider; npm reports no fix available.'],
  ['rollup', 'Transitive through @sentry/nextjs; fixed by the same Sentry major upgrade.'],
  ['fast-uri', 'Transitive dependency through schema validation.'],
  ['js-yaml', 'Transitive dependency through doc/build tooling.'],
  ['next', 'Requires Next.js framework upgrade; tracked as dependency debt.'],
  ['sharp', 'Transitive dependency through Next.js image optimization.'],
]);

function runAudit() {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  const result = spawnSync(npm, ['audit', '--json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (!result.stdout) {
    console.error(result.stderr || 'npm audit did not return JSON output.');
    process.exit(1);
  }

  return result.stdout;
}

const report = JSON.parse(runAudit());
const vulnerabilities = Object.values(report.vulnerabilities ?? {});
const unreviewed = vulnerabilities.filter(
  (vulnerability) =>
    ['high', 'critical'].includes(vulnerability.severity) &&
    !reviewedHighRisk.has(vulnerability.name)
);

if (unreviewed.length) {
  console.error('Unreviewed high/critical dependency vulnerabilities found:');
  for (const vulnerability of unreviewed) {
    console.error(`- ${vulnerability.name} (${vulnerability.severity})`);
  }
  process.exit(1);
}

const reviewed = vulnerabilities.filter(
  (vulnerability) =>
    ['high', 'critical'].includes(vulnerability.severity) &&
    reviewedHighRisk.has(vulnerability.name)
);

if (reviewed.length) {
  console.log('Reviewed high/critical dependency vulnerabilities still present:');
  for (const vulnerability of reviewed) {
    console.log(`- ${vulnerability.name}: ${reviewedHighRisk.get(vulnerability.name)}`);
  }
}

console.log('Dependency audit gate verified.');
