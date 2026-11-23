import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SpotifyApiService } from '../spotify/spotify-api.service';

interface SdkDeviceEvent {
  device_id: string;
}

interface SdkErrorEvent {
  message: string;
}

export interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      name: string;
      uri: string;
      duration_ms: number;
      artists: Array<{ name: string }>;
      album: {
        name: string;
        images: Array<{ url: string; height: number | null; width: number | null }>;
      };
    };
  };
}

interface SpotifyPlayer {
  addListener(event: 'ready' | 'not_ready', callback: (event: SdkDeviceEvent) => void): boolean;
  addListener(
    event: 'player_state_changed',
    callback: (state: SpotifyPlaybackState | null) => void,
  ): boolean;
  addListener(
    event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error',
    callback: (event: SdkErrorEvent) => void,
  ): boolean;
  activateElement(): Promise<void>;
  connect(): Promise<boolean>;
  disconnect(): void;
  togglePlay(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
}

interface SpotifySdk {
  Player: new (options: {
    name: string;
    volume: number;
    getOAuthToken: (callback: (token: string) => void) => void;
  }) => SpotifyPlayer;
}

declare global {
  interface Window {
    Spotify?: SpotifySdk;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

@Injectable({ providedIn: 'root' })
export class SpotifyPlayerService {
  private readonly auth = inject(AuthService);
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private player: SpotifyPlayer | null = null;
  private sdkLoadPromise: Promise<SpotifySdk> | null = null;
  private connectionPromise: Promise<void> | null = null;
  private deviceReadyResolver: (() => void) | null = null;

  readonly deviceId = signal<string | null>(null);
  readonly playbackState = signal<SpotifyPlaybackState | null>(null);
  readonly error = signal<string | null>(null);
  readonly connected = signal(false);
  readonly connecting = signal(false);

  async connect(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Spotify playback can only run in a browser.');
    }
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    if (this.player) {
      return this.waitForDevice();
    }

    this.error.set(null);
    this.connecting.set(true);
    this.connectionPromise = this.initializePlayer().finally(() => {
      this.connectionPromise = null;
      this.connecting.set(false);
    });
    return this.connectionPromise;
  }

  async playContext(contextUri: string): Promise<void> {
    const player = this.requirePlayer();
    const deviceId = this.deviceId();

    if (!deviceId) {
      throw new Error('Wait for the Spotify player to finish connecting.');
    }

    await player.activateElement();
    await firstValueFrom(this.spotifyApi.playContext(contextUri, deviceId));
  }

  async togglePlayback(): Promise<void> {
    await this.requirePlayer().togglePlay();
  }

  async nextTrack(): Promise<void> {
    await this.requirePlayer().nextTrack();
  }

  async previousTrack(): Promise<void> {
    await this.requirePlayer().previousTrack();
  }

  disconnect(): void {
    this.player?.disconnect();
    this.player = null;
    this.deviceId.set(null);
    this.playbackState.set(null);
    this.connected.set(false);
    this.connecting.set(false);
  }

  private registerListeners(player: SpotifyPlayer): void {
    player.addListener('ready', ({ device_id }) => {
      this.deviceId.set(device_id);
      this.connected.set(true);
      this.error.set(null);
      this.deviceReadyResolver?.();
      this.deviceReadyResolver = null;
    });

    player.addListener('not_ready', () => {
      this.deviceId.set(null);
      this.connected.set(false);
    });

    player.addListener('player_state_changed', (state) => {
      this.playbackState.set(state);
    });

    const handleSdkError = ({ message }: SdkErrorEvent) => {
      this.error.set(message);
    };
    player.addListener('initialization_error', handleSdkError);
    player.addListener('authentication_error', handleSdkError);
    player.addListener('account_error', handleSdkError);
    player.addListener('playback_error', handleSdkError);
  }

  private requirePlayer(): SpotifyPlayer {
    if (!this.player) {
      throw new Error('Connect the Spotify player first.');
    }
    return this.player;
  }

  private async initializePlayer(): Promise<void> {
    await this.auth.getValidAccessToken();
    const sdk = await this.loadSdk();
    const player = new sdk.Player({
      name: 'NgSpotifyWeb',
      volume: 0.5,
      getOAuthToken: (callback) => {
        void this.auth
          .getValidAccessToken()
          .then(callback)
          .catch((error: unknown) => this.error.set(this.messageFor(error)));
      },
    });

    this.player = player;
    this.registerListeners(player);

    try {
      const connected = await player.connect();
      if (!connected) {
        throw new Error('Spotify player could not connect. Try again.');
      }
      await this.waitForDevice();
    } catch (error) {
      player.disconnect();
      this.player = null;
      this.deviceId.set(null);
      this.connected.set(false);
      throw error;
    }
  }

  private waitForDevice(): Promise<void> {
    if (this.deviceId()) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.deviceReadyResolver = null;
        reject(new Error('Timed out waiting for the Spotify player device.'));
      }, 15_000);

      this.deviceReadyResolver = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };
    });
  }

  private loadSdk(): Promise<SpotifySdk> {
    if (window.Spotify) {
      return Promise.resolve(window.Spotify);
    }
    if (this.sdkLoadPromise) {
      return this.sdkLoadPromise;
    }

    this.sdkLoadPromise = new Promise<SpotifySdk>((resolve, reject) => {
      const script =
        document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`) ??
        document.createElement('script');
      let timeoutId = 0;
      let settled = false;

      const finish = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeoutId);
        if (window.Spotify) {
          resolve(window.Spotify);
        } else {
          reject(new Error('Spotify Playback SDK did not initialize.'));
        }
      };

      const fail = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeoutId);
        reject(new Error('Could not load the Spotify Playback SDK.'));
      };

      window.onSpotifyWebPlaybackSDKReady = finish;
      script.addEventListener('error', fail, { once: true });

      if (!script.isConnected) {
        script.src = SDK_URL;
        script.async = true;
        document.head.appendChild(script);
      }

      timeoutId = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Timed out loading the Spotify Playback SDK.'));
        }
      }, 15_000);
    }).catch((error: unknown) => {
      this.sdkLoadPromise = null;
      throw error;
    });

    return this.sdkLoadPromise;
  }

  private messageFor(error: unknown): string {
    return error instanceof Error ? error.message : 'Spotify playback failed.';
  }
}
