import { HttpException } from '@nestjs/common';
import { GbpController } from './gbp.controller';

describe('GbpController OAuth callback route (REQ-M1-03)', () => {
  const service = {
    getAuthUrl: jest.fn(),
    handleOAuthCallback: jest.fn(),
    updateProfile: jest.fn(),
  };
  const res = {
    redirect: jest.fn(),
  };
  let controller: GbpController;

  beforeEach(() => {
    process.env.FRONTEND_URL = 'http://frontend.test';
    jest.clearAllMocks();
    controller = new GbpController(service as any);
  });

  it('rejects callbacks missing code or state', async () => {
    await expect(
      controller.oauthCallback('', 'state', '', res as any),
    ).rejects.toBeInstanceOf(HttpException);
    await expect(
      controller.oauthCallback('code', '', '', res as any),
    ).rejects.toBeInstanceOf(HttpException);
    expect(service.handleOAuthCallback).not.toHaveBeenCalled();
  });

  it('redirects provider errors without exchanging tokens', async () => {
    await controller.oauthCallback('', '', 'access_denied', res as any);

    expect(res.redirect).toHaveBeenCalledWith(
      'http://frontend.test/clients?error=access_denied',
    );
    expect(service.handleOAuthCallback).not.toHaveBeenCalled();
  });

  it('redirects tampered or expired state failures to the OAuth error page', async () => {
    service.handleOAuthCallback.mockRejectedValue(
      new Error('Invalid OAuth state'),
    );

    await controller.oauthCallback('code', 'bad-state', '', res as any);

    expect(service.handleOAuthCallback).toHaveBeenCalledWith(
      'code',
      'bad-state',
    );
    expect(res.redirect).toHaveBeenCalledWith(
      'http://frontend.test/clients?error=oauth_failed',
    );
  });

  it('redirects to the connected client after a valid callback', async () => {
    service.handleOAuthCallback.mockResolvedValue('client-1');

    await controller.oauthCallback('code', 'good-state', '', res as any);

    expect(res.redirect).toHaveBeenCalledWith(
      'http://frontend.test/clients/client-1?gbp_connected=true',
    );
  });
});
