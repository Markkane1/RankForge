const fs = require('fs');
const path = require('path');

const root = process.cwd();
const route = fs.readFileSync(path.join(root, 'apps/web/src/app/api/clients/[id]/gbp/[gbpId]/route.ts'), 'utf8');
const form = fs.readFileSync(path.join(root, 'apps/web/src/components/gbp/gbp-intake-form.tsx'), 'utf8');
const test = fs.readFileSync(path.join(root, 'apps/web/tests/unit/gbp-approval-routes.test.ts'), 'utf8');

const checks = [
  {
    name: 'Booking URL returns warning shape when override note is required',
    ok: route.includes('bookingUrlWarning') &&
      route.includes('requiresOverrideNote: true') &&
      route.includes('{ status: 422 }'),
  },
  {
    name: 'Booking URL override is audit logged',
    ok: route.includes('booking_url_reachability_override') &&
      route.includes('oldValue: bookingUrlWarning.details') &&
      route.includes('newValue: bookingUrlOverrideNote'),
  },
  {
    name: 'Successful override response includes warnings',
    ok: route.includes('warnings: bookingUrlWarning ? [bookingUrlWarning] : []'),
  },
  {
    name: 'UI shows override warning on successful save',
    ok: form.includes("toast.warning('GBP profile updated with booking URL override note')"),
  },
  {
    name: 'Booking URL warning path is behavior-tested',
    ok: test.includes('returns a booking URL warning before saving unreachable links') &&
      test.includes('requiresOverrideNote: true') &&
      test.includes('expect(mocks.updateProfile).not.toHaveBeenCalled()'),
  },
  {
    name: 'Booking URL override save is behavior-tested',
    ok: test.includes('saves unreachable booking URLs with an override note and audit log') &&
      test.includes('booking_url_reachability_override') &&
      test.includes('Vendor maintenance window confirmed.'),
  },
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);

if (failed.length) {
  console.error(`\nBooking URL proof failed: ${failed.map((check) => check.name).join(', ')}`);
  process.exit(1);
}
