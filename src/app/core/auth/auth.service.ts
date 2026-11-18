import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

const TOKEN_KEY = 'spotify_access_token';
const EXPIRY_KEY = 'spotify_token_expiry';
const VERIFIER_KEY = 'spotify_pkce_verifier';
const STATE_KEY = 'spotify_auth_state';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  readonly accessToken = signal<string | null>(this.readStoredToken());

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
      scope: [
        'streaming',
        'user-read-private',
        'user-read-email',
        'user-read-playback-state',
        'user-modify-playback-state',
      ].join(' '),
      code_challenge_method: 'S256',
      code_challenge: this.base64Url(new Uint8Array(digest)),
      state,
    });

    window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
  }

  async completeLogin(search: string): Promise<void> {
    this.assertBrowser();

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

    sessionStorage.setItem(TOKEN_KEY, token.access_token);
    sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + token.expires_in * 1000));
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    this.accessToken.set(token.access_token);
  }

  isAuthenticated(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const token = this.accessToken();
    const expiry = Number(sessionStorage.getItem(EXPIRY_KEY));

    if (!token || !expiry || Date.now() >= expiry) {
      this.logout();
      return false;
    }

    return true;
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(EXPIRY_KEY);
      sessionStorage.removeItem(VERIFIER_KEY);
      sessionStorage.removeItem(STATE_KEY);
    }
    this.accessToken.set(null);
  }

  private readStoredToken(): string | null {
    return isPlatformBrowser(this.platformId) ? sessionStorage.getItem(TOKEN_KEY) : null;
  }

  private assertBrowser(): void {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Spotify login can only run in a browser.');
    }
  }

  private assertClientId(): void {
    if (!environment.spotifyClientId || environment.spotifyClientId === 'YOUR_SPOTIFY_CLIENT_ID') {
      throw new Error('Set spotifyClientId in src/environments/environment.ts.');
    }
  }

  private base64Url(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((byte) => (binary += String.fromCharCode(byte)));

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
