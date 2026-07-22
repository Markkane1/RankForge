import { Test, TestingModule } from '@nestjs/testing';
import { GbpService } from './gbp.service';
import { CredentialsService } from '../security/credentials.service';

describe('GbpService OAuth state signing (REQ-M1-03)', () => {
  let service: GbpService;

  beforeEach(async () => {
    process.env.OAUTH_STATE_SECRET = 'test-nest-oauth-state-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GbpService,
        {
          provide: CredentialsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(GbpService);
  });

  it('round-trips a signed client callback state', () => {
    const state = service.createOAuthState('client-1');

    expect(service.verifyOAuthState(state)).toBe('client-1');
  });

  it('rejects tampered callback state', () => {
    const [, signature] = service.createOAuthState('client-1').split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ clientId: 'client-2', iat: Date.now() }),
    ).toString('base64url');

    expect(() =>
      service.verifyOAuthState(`${tamperedPayload}.${signature}`),
    ).toThrow('Invalid OAuth state');
  });

  it('rejects expired callback state', () => {
    const state = service.createOAuthState('client-1');

    expect(() => service.verifyOAuthState(state, -1)).toThrow(
      'Invalid OAuth state',
    );
  });
});
