import { describe, expect, it } from 'vitest';

import { getCompetitorPhotoTarget } from '../../src/components/gbp/gbp-photos-manager';

describe('GBP photo benchmark target', () => {
  it('uses the highest stored competitor photoCount as the upload target', () => {
    expect(getCompetitorPhotoTarget([
      { photoCount: 12 },
      { photoCount: 24 },
      { photoCount: null },
    ])).toBe(24);
  });
});
