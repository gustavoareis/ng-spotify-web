import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

const TOKEN_KEY = 'spotify_access_token';
const EXPIRY_KEY = 'spotify_token_expiry';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const VERIFIER_KEY = 'spotify_pkce_verifier';
const STATE_KEY = 'spotify_auth_state';
const TOKEN_REFRESH_MARGIN_MS = 60_000;

const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private refreshInFlight: Promise<string> | null = null;

  readonly accessToken = signal<string | null>(this.readStoredToken());
  readonly authError = signal<string | null>(null);

  async login(): Promise<void> {
    this.assertBrowser();
    this.assertClientId();

    const verifier = this.base64Url(crypto.getRandomValues(new Uint8Array(64)));
    const state = this.base64Url(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));

    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);

    const params = new URLSearchParams({
      client_id: environment.spotifyClientId,
      response_type: 'code',
      redirect_uri: environment.spotifyRedirectUri,
      scope: SPOTIFY_SCOPES.join(' '),
      code_challenge_method: 'S256',
      code_challenge: this.base64Url(new Uint8Array(digest)),
      state,
    });

    window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
  }

  async completeLogin(search: string): Promise<void> {
    this.assertBrowser();
    this.assertClientId();

    const params = new URLSearchParams(search);
    const spotifyError = params.get('error');
    if (spotifyError) {
      throw new Error(`Spotify login failed: ${spotifyError}`);
    }

    const code = params.get('code');
    const returnedState = params.get('state');
    const expectedState = sessionStorage.getItem(STATE_KEY);
    const verifier = sessionStorage.getItem(VERIFIER_KEY);

    if (!code || !returnedState || returnedState !== expectedState || !verifier) {
      throw new Error('Invalid or incomplete Spotify login callback.');
    }

    const body = new URLSearchParams({
      client_id: environment.spotifyClientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: environment.spotifyRedirectUri,
      code_verifier: verifier,
    });

    const token = await firstValueFrom(
      this.http.post<SpotifyTokenResponse>(
        'https://accounts.spotify.com/api/token',
        body.toString(),
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        },
      ),
    );

    this.storeToken(token);
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    this.authError.set(null);
  }

  async ensureAuthenticated(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (!this.accessToken() && !sessionStorage.getItem(REFRESH_TOKEN_KEY)) {
      return false;
    }

    try {
      await this.getValidAccessToken();
      this.authError.set(null);
      return true;
    } catch (error) {
      const message = this.errorMessage(error);
      this.logout();
      this.authError.set(message);
      return false;
    }
  }

  async getValidAccessToken(): Promise<string> {
    this.assertBrowser();

    const token = this.accessToken();
    const expiry = Number(sessionStorage.getItem(EXPIRY_KEY));

    if (token && expiry > Date.now() + TOKEN_REFRESH_MARGIN_MS) {
      return token;
    }

    return this.refreshAccessToken();
  }

  refreshAccessToken(): Promise<string> {
    this.assertBrowser();

    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      this.logout();
      return Promise.reject(new Error('Spotify session expired. Sign in again.'));
    }

    const body = new URLSearchParams({
      client_id: environment.spotifyClientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    this.refreshInFlight = firstValueFrom(
      this.http.post<SpotifyTokenResponse>(
        'https://accounts.spotify.com/api/token',
        body.toString(),
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        },
      ),
    )
      .then((token) => {
        this.storeToken(token);
        this.authError.set(null);
        return token.access_token;
      })
      .catch((error: unknown) => {
        this.logout();
        throw error;
      })
      .finally(() => {
        this.refreshInFlight = null;
      });

    return this.refreshInFlight;
  }

  isAuthenticated(): boolean {
    return (
      isPlatformBrowser(this.platformId) &&
      (!!this.accessToken() || !!sessionStorage.getItem(REFRESH_TOKEN_KEY))
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(EXPIRY_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(VERIFIER_KEY);
      sessionStorage.removeItem(STATE_KEY);
    }
    this.accessToken.set(null);
    this.authError.set(null);
  }

  private storeToken(token: SpotifyTokenResponse): void {
    sessionStorage.setItem(TOKEN_KEY, token.access_token);
    sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + token.expires_in * 1000));
    if (token.refresh_token) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, token.refresh_token);
    }
    this.accessToken.set(token.access_token);
  }

  private readStoredToken(): string | null {
    return isPlatformBrowser(this.platformId) ? sessionStorage.getItem(TOKEN_KEY) : null;
  }

  private assertBrowser(): void {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Spotify authentication can only run in a browser.');
    }
  }

  private assertClientId(): void {
    if (!environment.spotifyClientId || environment.spotifyClientId === 'YOUR_SPOTIFY_CLIENT_ID') {
      throw new Error('Set spotifyClientId in src/environments/environment.ts.');
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Spotify authentication failed.';
  }

  private base64Url(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((byte) => (binary += String.fromCharCode(byte)));

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
