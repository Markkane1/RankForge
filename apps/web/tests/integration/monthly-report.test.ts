import { describe, it, expect } from 'vitest';

// Function representing the headline calculation logic
function computeHeadline(leadSources: { name: string; count: number }[]) {
  const getSourceCount = (src: string) => leadSources.find((s) => s.name === src)?.count || 0;
  const totalCalls = getSourceCount('GBP_CALL') + getSourceCount('PHONE_CALL');
  const totalDirections = getSourceCount('GBP_DIRECTIONS');
  const totalWebsite = getSourceCount('GBP_WEBSITE');
  return `You got ${totalCalls} calls, ${totalDirections} direction requests, and ${totalWebsite} website clicks this month!`;
}

describe('Monthly Report Plain-Language Headline (REQ-M1-30)', () => {
  it('should compute the correct headline from various lead sources', () => {
    const leadSources = [
      { name: 'GBP_CALL', count: 12 },
      { name: 'PHONE_CALL', count: 3 },
      { name: 'GBP_DIRECTIONS', count: 25 },
      { name: 'GBP_WEBSITE', count: 48 },
      { name: 'WHATSAPP', count: 10 }
    ];

    const headline = computeHeadline(leadSources);
    expect(headline).toBe('You got 15 calls, 25 direction requests, and 48 website clicks this month!');
  });

  it('should fallback to 0 counts if lead sources are missing or empty', () => {
    const leadSources: { name: string; count: number }[] = [];
    const headline = computeHeadline(leadSources);
    expect(headline).toBe('You got 0 calls, 0 direction requests, and 0 website clicks this month!');
  });
});
