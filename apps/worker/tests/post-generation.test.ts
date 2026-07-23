import assert from 'assert/strict';
import {
  MONTHLY_POST_ROTATION,
  assertPostBodyCompliant,
  buildMonthlyPostDrafts,
} from '../src/post-generation';

const drafts = buildMonthlyPostDrafts([
  'Limited spring maintenance offer for local homeowners.',
  'Our team has updated booking availability for the coming month.',
  'Recent customers mention fast arrivals and clean job sites.',
  'Prepare your property before peak summer heat arrives.',
]);

assert.deepEqual(
  MONTHLY_POST_ROTATION.map((rotation) => rotation.eventType),
  ['OFFER', 'UPDATE', 'PROOF', 'SEASONAL'],
);
assert.deepEqual(
  drafts.map((draft) => draft.eventType),
  ['OFFER', 'UPDATE', 'PROOF', 'SEASONAL'],
);
assert.throws(
  () => assertPostBodyCompliant('Book now at +1 555 123 4567.'),
  /Post compliance failed: body must not contain phone numbers\./,
);

console.log('Worker post generation behavior verified.');
