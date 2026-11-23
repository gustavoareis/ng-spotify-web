import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
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

  it('refreshes an expired access token and keeps the returned refresh token', async () => {
    sessionStorage.setItem('spotify_access_token', 'expired-token');
    sessionStorage.setItem('spotify_token_expiry', '1');
    sessionStorage.setItem('spotify_refresh_token', 'old-refresh-token');
    auth = TestBed.inject(AuthService);

    const tokenPromise = auth.getValidAccessToken();
    const request = http.expectOne('https://accounts.spotify.com/api/token');

    expect(request.request.body).toContain('grant_type=refresh_token');
    expect(request.request.body).toContain('refresh_token=old-refresh-token');
    request.flush({
      access_token: 'fresh-token',
      expires_in: 3600,
      refresh_token: 'rotated-refresh-token',
      token_type: 'Bearer',
    });

    await expect(tokenPromise).resolves.toBe('fresh-token');
    expect(sessionStorage.getItem('spotify_access_token')).toBe('fresh-token');
    expect(sessionStorage.getItem('spotify_refresh_token')).toBe('rotated-refresh-token');
    expect(auth.accessToken()).toBe('fresh-token');
  });

  it('shares a single refresh request between concurrent callers', async () => {
    sessionStorage.setItem('spotify_refresh_token', 'stored-refresh-token');
    auth = TestBed.inject(AuthService);

    const first = auth.refreshAccessToken();
    const second = auth.refreshAccessToken();
    const request = http.expectOne('https://accounts.spotify.com/api/token');

    request.flush({
      access_token: 'fresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
    });

    await expect(Promise.all([first, second])).resolves.toEqual(['fresh-token', 'fresh-token']);
  });
});
