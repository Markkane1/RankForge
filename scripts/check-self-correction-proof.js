const fs = require('fs');
const path = require('path');

const root = process.cwd();
const worker = fs.readFileSync(path.join(root, 'apps/worker/src/index.ts'), 'utf8');
const selfCorrection = fs.readFileSync(path.join(root, 'apps/worker/src/self-correction.ts'), 'utf8');
const selfCorrectionTest = fs.readFileSync(path.join(root, 'apps/worker/tests/self-correction.test.ts'), 'utf8');
const toggleRoute = fs.readFileSync(path.join(root, 'apps/web/src/app/api/tasks/[id]/subtasks/[subtaskId]/route.ts'), 'utf8');
const reorderRoute = fs.readFileSync(path.join(root, 'apps/web/src/app/api/tasks/[id]/subtasks/reorder/route.ts'), 'utf8');
const routeTest = fs.readFileSync(path.join(root, 'apps/web/tests/unit/self-correction-routes.test.ts'), 'utf8');
const seed = fs.readFileSync(path.join(root, 'packages/database/prisma/seed.ts'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

const steps = [
  'Profile intact?',
  'Tracking intact?',
  'Algorithm update?',
  'Competitor surge?',
  'Own-work attribution?',
];

const checks = [
  {
    name: 'Worker generates self-correction tasks after two flat or declining months',
    ok: worker.includes('createSelfCorrectionDiagnosisTasks(currentYear, currentMonth)') &&
      worker.includes('createSelfCorrectionDiagnosisTasksWithDeps') &&
      selfCorrection.includes('SelfCorrectionDiagnosis:${client.id}') &&
      selfCorrection.includes('isFlatOrDecliningMonth'),
  },
  {
    name: 'Diagnosis task uses the canonical REQ-M5-05 checklist order',
    ok: selfCorrection.includes("taskId: 'REQ-M5-05'") &&
      steps.every((step) => selfCorrection.includes(step)) &&
      selfCorrection.indexOf(steps[0]) < selfCorrection.indexOf(steps[1]) &&
      selfCorrection.indexOf(steps[1]) < selfCorrection.indexOf(steps[2]) &&
      selfCorrection.indexOf(steps[2]) < selfCorrection.indexOf(steps[3]) &&
      selfCorrection.indexOf(steps[3]) < selfCorrection.indexOf(steps[4]),
  },
  {
    name: 'Subtask completion blocks skipping diagnosis order',
    ok: toggleRoute.includes("task.taskId === 'REQ-M5-05'") &&
      toggleRoute.includes('previousOpenStep') &&
      toggleRoute.includes('own tactics'),
  },
  {
    name: 'Subtask reorder blocks bypassing diagnosis order',
    ok: reorderRoute.includes("task.taskId === 'REQ-M5-05'") &&
      reorderRoute.includes('Cannot reorder self-correction diagnosis checklist'),
  },
  {
    name: 'Self-correction diagnosis routes have behavioral coverage',
    ok: routeTest.includes("blocks completing later diagnosis steps before earlier open steps") &&
      routeTest.includes("allows the next diagnosis step when previous steps are complete") &&
      routeTest.includes("blocks reordering the canonical diagnosis checklist") &&
      routeTest.includes("returns auth failures before reading subtasks"),
  },
  {
    name: 'Self-correction worker creator has simulated monthly-report coverage',
    ok: selfCorrectionTest.includes('Worker self-correction diagnosis behavior verified.') &&
      selfCorrectionTest.includes('decliningReports') &&
      selfCorrectionTest.includes('healthyRun') &&
      selfCorrectionTest.includes('duplicateRun') &&
      selfCorrectionTest.includes('SELF_CORRECTION_STEPS'),
  },
  {
    name: 'BuildRequirement seed maps REQ-M5-04 and REQ-M5-05 to the SRS meanings',
    ok: seed.includes('reqId: "REQ-M5-04"') &&
      seed.includes('title: "Monthly report v2 with competitor comparison"') &&
      seed.includes('reqId: "REQ-M5-05"') &&
      seed.includes('title: "Self-correction diagnosis workflow"'),
  },
  {
    name: 'Self-correction proof is wired into npm check',
    ok: pkg.includes('"check:self-correction": "node scripts/check-self-correction-proof.js"') &&
      pkg.includes('npm run check:self-correction'),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);

if (failed.length) {
  console.error(`\nSelf-correction proof failed: ${failed.map((check) => check.name).join(', ')}`);
  process.exit(1);
}
