export class ConflictOfInterestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictOfInterestError';
  }
}
