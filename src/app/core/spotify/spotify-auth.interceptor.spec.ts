import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { spotifyAuthInterceptor } from './spotify-auth.interceptor';

describe('spotifyAuthInterceptor', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;
  const auth = {
    getValidAccessToken: vi.fn(),
    refreshAccessToken: vi.fn(),
  };

  beforeEach(() => {
    auth.getValidAccessToken.mockReset().mockResolvedValue('access-token');
    auth.refreshAccessToken.mockReset().mockResolvedValue('refreshed-token');
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        provideHttpClient(withInterceptors([spotifyAuthInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('adds a bearer token to Spotify Web API requests', async () => {
    const response = firstValueFrom(httpClient.get('https://api.spotify.com/v1/me'));
    await Promise.resolve();
    const request = http.expectOne('https://api.spotify.com/v1/me');

    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush({ id: 'listener' });
    await expect(response).resolves.toEqual({ id: 'listener' });
  });

  it('refreshes the token and retries a request once after a 401', async () => {
    const response = firstValueFrom(httpClient.get('https://api.spotify.com/v1/me'));
    await Promise.resolve();
    http
      .expectOne('https://api.spotify.com/v1/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await Promise.resolve();
    await Promise.resolve();

    const retry = http.expectOne('https://api.spotify.com/v1/me');
    expect(auth.refreshAccessToken).toHaveBeenCalledOnce();
    expect(retry.request.headers.get('Authorization')).toBe('Bearer refreshed-token');
    retry.flush({ id: 'listener' });

    await expect(response).resolves.toEqual({ id: 'listener' });
  });
});
