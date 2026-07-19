export class ConflictOfInterestError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConflictOfInterestError';
    }
}
