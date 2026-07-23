import { describe, expect, it } from 'vitest';

import { getScoredCategoryCandidates } from '../../src/components/gbp/gbp-intake-form';

describe('GBP category candidate scoring', () => {
  it('ranks live competitor-derived category candidates by competitor coverage and strength', () => {
    const candidates = getScoredCategoryCandidates([
      {
        categories: JSON.stringify(['Plumber', 'Emergency Plumber']),
        avgRating: 4.7,
        photoCount: 30,
      },
      {
        categories: JSON.stringify(['Emergency Plumber']),
        avgRating: 4.9,
        photoCount: 50,
      },
      {
        categories: 'Drainage Service',
        avgRating: 4.5,
        photoCount: 10,
      },
    ]);

    expect(candidates[0]).toMatchObject({
      category: 'Emergency Plumber',
      competitorCount: 2,
      avgRating: 4.8,
      photoTarget: 50,
    });
    expect(candidates.map((candidate) => candidate.category)).toEqual([
      'Emergency Plumber',
      'Plumber',
      'Drainage Service',
    ]);
  });
});
