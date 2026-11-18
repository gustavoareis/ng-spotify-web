import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('rejects a callback with a state that does not match the login request', async () => {
    sessionStorage.setItem('spotify_auth_state', 'expected-state');
    sessionStorage.setItem('spotify_pkce_verifier', 'verifier');
    auth = TestBed.inject(AuthService);

    await expect(
      auth.completeLogin('?code=authorization-code&state=unexpected-state'),
    ).rejects.toThrow('Invalid or incomplete Spotify login callback.');
  });

  it('clears an expired access token', () => {
    sessionStorage.setItem('spotify_access_token', 'expired-token');
    sessionStorage.setItem('spotify_token_expiry', '1');
    auth = TestBed.inject(AuthService);

    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('spotify_access_token')).toBeNull();
    expect(auth.accessToken()).toBeNull();
  });
});
