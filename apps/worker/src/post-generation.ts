export const MONTHLY_POST_ROTATION = [
  { eventType: 'OFFER', instruction: 'Create an offer-style GBP post with no phone number in the body.' },
  { eventType: 'UPDATE', instruction: 'Create a business update GBP post with no phone number in the body.' },
  { eventType: 'PROOF', instruction: 'Create a social proof GBP post with no phone number in the body.' },
  { eventType: 'SEASONAL', instruction: 'Create a seasonal GBP post with no phone number in the body.' },
] as const;

export type MonthlyPostEventType = (typeof MONTHLY_POST_ROTATION)[number]['eventType'];

export function containsPhoneNumber(text: string): boolean {
  return /\b(?:\+?\d[\d\s().-]{7,}\d)\b/.test(text);
}

export function assertPostBodyCompliant(content: string): void {
  if (containsPhoneNumber(content)) {
    throw new Error('Post compliance failed: body must not contain phone numbers.');
  }
}

export function buildMonthlyPostDrafts(
  contents: string[],
): Array<{ eventType: MonthlyPostEventType; content: string }> {
  if (contents.length !== MONTHLY_POST_ROTATION.length) {
    throw new Error(`Monthly post generation requires exactly ${MONTHLY_POST_ROTATION.length} draft bodies.`);
  }

  return MONTHLY_POST_ROTATION.map((rotation, index) => {
    const content = contents[index];
    assertPostBodyCompliant(content);
    return {
      eventType: rotation.eventType,
      content,
    };
  });
}
