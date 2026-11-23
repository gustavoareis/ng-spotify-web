import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SpotifyApiService } from '../spotify/spotify-api.service';
import {
  SpotifyCurrentPlayback,
  SpotifyDevice,
  SpotifyEpisode,
  SpotifyRepeatMode,
  SpotifyTrack,
} from '../spotify/spotify.models';

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
  shuffle: boolean;
  repeat_mode: number;
  track_window: {
    current_track: SpotifyTrack & {
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
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  toggleShuffle(): Promise<void>;
  setRepeatMode(mode: SpotifyRepeatMode): Promise<void>;
}

interface SpotifySdk {
  Player: new (options: {
    name: string;
    volume: number;
    enableMediaSession: boolean;
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
const REPEAT_MODES: SpotifyRepeatMode[] = ['off', 'context', 'track'];

@Injectable({ providedIn: 'root' })
export class SpotifyPlayerService {
  private readonly auth = inject(AuthService);
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private player: SpotifyPlayer | null = null;
  private sdkLoadPromise: Promise<SpotifySdk> | null = null;
  private connectionPromise: Promise<void> | null = null;
  private deviceReadyResolver: (() => void) | null = null;
  private progressTimer: number | null = null;
  private externalPollTimer: number | null = null;

  readonly deviceId = signal<string | null>(null);
  readonly selectedDeviceId = signal<string | null>(null);
  readonly playbackState = signal<SpotifyPlaybackState | null>(null);
  readonly positionMs = signal(0);
  readonly volume = signal(0.5);
  readonly shuffle = signal(false);
  readonly repeatMode = signal<SpotifyRepeatMode>('off');
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

  async getAvailableDevices(): Promise<SpotifyDevice[]> {
    const response = await firstValueFrom(this.spotifyApi.getAvailableDevices());
    return response.devices;
  }

  async transferToDevice(deviceId: string): Promise<void> {
    await firstValueFrom(this.spotifyApi.transferPlayback(deviceId));
    this.selectedDeviceId.set(deviceId);
    if (deviceId !== this.deviceId()) {
      this.startExternalPolling();
      await this.syncExternalPlayback();
    } else {
      this.stopExternalPolling();
    }
  }

  async syncExternalPlayback(): Promise<void> {
    if (this.selectedDeviceId() === this.deviceId()) {
      return;
    }
    const state = await firstValueFrom(this.spotifyApi.getCurrentPlayback());
    this.setPlaybackState(state ? this.toPlaybackState(state) : null);
  }

  async playContext(contextUri: string): Promise<void> {
    const deviceId = this.requireDevice();
    if (deviceId === this.deviceId()) {
      await this.requirePlayer().activateElement();
    }
    await firstValueFrom(this.spotifyApi.playContext(contextUri, deviceId));
  }

  async playTrack(trackUri: string): Promise<void> {
    const deviceId = this.requireDevice();
    if (deviceId === this.deviceId()) {
      await this.requirePlayer().activateElement();
    }
    await firstValueFrom(this.spotifyApi.playTrack(trackUri, deviceId));
  }

  async togglePlayback(): Promise<void> {
    const deviceId = this.requireDevice();
    if (deviceId === this.deviceId()) {
      await this.requirePlayer().togglePlay();
    } else if (this.playbackState()?.paused) {
      await firstValueFrom(this.spotifyApi.resume(deviceId));
    } else {
      await firstValueFrom(this.spotifyApi.pause(deviceId));
    }
  }

  async nextTrack(): Promise<void> {
    const deviceId = this.requireDevice();
    if (deviceId === this.deviceId()) {
      await this.requirePlayer().nextTrack();
    } else {
      await firstValueFrom(this.spotifyApi.next(deviceId));
    }
  }

  async previousTrack(): Promise<void> {
    const deviceId = this.requireDevice();
    if (deviceId === this.deviceId()) {
      await this.requirePlayer().previousTrack();
    } else {
      await firstValueFrom(this.spotifyApi.previous(deviceId));
    }
  }

  async seek(positionMs: number): Promise<void> {
    const deviceId = this.requireDevice();
    const position = Math.max(
      0,
      Math.min(positionMs, this.playbackState()?.duration ?? positionMs),
    );
    if (deviceId === this.deviceId()) {
      await this.requirePlayer().seek(position);
    } else {
      await firstValueFrom(this.spotifyApi.seek(position, deviceId));
    }
    this.positionMs.set(position);
  }

  async setVolume(volume: number): Promise<void> {
    const normalized = Math.max(0, Math.min(1, volume));
    const deviceId = this.selectedDeviceId();
    if (deviceId && deviceId !== this.deviceId()) {
      await firstValueFrom(this.spotifyApi.setVolume(normalized * 100, deviceId));
    } else if (this.player) {
      await this.player.setVolume(normalized);
    }
    this.volume.set(normalized);
  }

  async toggleShuffle(): Promise<void> {
    const enabled = !this.shuffle();
    const deviceId = this.requireDevice();
    if (deviceId === this.deviceId()) {
      await this.requirePlayer().toggleShuffle();
    } else {
      await firstValueFrom(this.spotifyApi.setShuffle(enabled, deviceId));
    }
    this.shuffle.set(enabled);
  }

  async cycleRepeatMode(): Promise<void> {
    const currentIndex = REPEAT_MODES.indexOf(this.repeatMode());
    const nextMode = REPEAT_MODES[(currentIndex + 1) % REPEAT_MODES.length];
    const deviceId = this.requireDevice();
    if (deviceId === this.deviceId()) {
      await this.requirePlayer().setRepeatMode(nextMode);
    } else {
      await firstValueFrom(this.spotifyApi.setRepeatMode(nextMode, deviceId));
    }
    this.repeatMode.set(nextMode);
  }

  disconnect(): void {
    this.player?.disconnect();
    this.player = null;
    this.deviceId.set(null);
    this.selectedDeviceId.set(null);
    this.setPlaybackState(null);
    this.connected.set(false);
    this.connecting.set(false);
    this.stopExternalPolling();
  }

  private registerListeners(player: SpotifyPlayer): void {
    player.addListener('ready', ({ device_id }) => {
      this.deviceId.set(device_id);
      this.selectedDeviceId.set(device_id);
      this.connected.set(true);
      this.error.set(null);
      this.deviceReadyResolver?.();
      this.deviceReadyResolver = null;
    });

    player.addListener('not_ready', ({ device_id }) => {
      this.connected.set(false);
      if (this.selectedDeviceId() === device_id) {
        this.deviceId.set(null);
        this.selectedDeviceId.set(null);
      }
    });

    player.addListener('player_state_changed', (state) => {
      if (this.selectedDeviceId() === this.deviceId()) {
        this.setPlaybackState(state);
      }
    });

    const handleSdkError = ({ message }: SdkErrorEvent) => {
      this.error.set(message);
    };
    player.addListener('initialization_error', handleSdkError);
    player.addListener('authentication_error', handleSdkError);
    player.addListener('account_error', handleSdkError);
    player.addListener('playback_error', handleSdkError);
  }

  private async initializePlayer(): Promise<void> {
    await this.auth.getValidAccessToken();
    const sdk = await this.loadSdk();
    const player = new sdk.Player({
      name: 'NgSpotifyWeb',
      volume: this.volume(),
      enableMediaSession: true,
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
      this.selectedDeviceId.set(null);
      this.connected.set(false);
      throw error;
    }
  }

  private requireDevice(): string {
    const deviceId = this.selectedDeviceId();
    if (!deviceId) {
      throw new Error('Connect a Spotify playback device first.');
    }
    return deviceId;
  }

  private requirePlayer(): SpotifyPlayer {
    if (!this.player) {
      throw new Error('Connect the Spotify player first.');
    }
    return this.player;
  }

  private setPlaybackState(state: SpotifyPlaybackState | null): void {
    this.playbackState.set(state);
    this.positionMs.set(state?.position ?? 0);
    this.shuffle.set(state?.shuffle ?? false);
    this.repeatMode.set(this.repeatModeFromApiValue(state?.repeat_mode ?? 0));
    this.updateProgressTimer(state);
  }

  private updateProgressTimer(state: SpotifyPlaybackState | null): void {
    if (!state || state.paused) {
      if (this.progressTimer !== null) {
        window.clearInterval(this.progressTimer);
        this.progressTimer = null;
      }
      return;
    }
    if (this.progressTimer !== null) {
      return;
    }
    this.progressTimer = window.setInterval(() => {
      const currentState = this.playbackState();
      if (!currentState || currentState.paused) {
        this.updateProgressTimer(currentState);
        return;
      }
      this.positionMs.update((position) => Math.min(position + 1000, currentState.duration));
    }, 1000);
  }

  private toPlaybackState(state: SpotifyCurrentPlayback): SpotifyPlaybackState | null {
    const track = state.item;
    if (!track || track.type === 'episode') {
      return null;
    }
    return {
      paused: !state.is_playing,
      position: state.progress_ms ?? 0,
      duration: track.duration_ms,
      shuffle: state.shuffle_state,
      repeat_mode: this.repeatModeToApiValue(state.repeat_state),
      track_window: {
        current_track: {
          ...track,
          album: track.album ?? { id: '', uri: '', name: '', images: [] },
        },
      },
    };
  }

  private repeatModeFromApiValue(value: number): SpotifyRepeatMode {
    if (value === 1) {
      return 'context';
    }
    return value === 2 ? 'track' : 'off';
  }

  private repeatModeToApiValue(mode: SpotifyRepeatMode): number {
    return mode === 'context' ? 1 : mode === 'track' ? 2 : 0;
  }

  private startExternalPolling(): void {
    this.stopExternalPolling();
    this.externalPollTimer = window.setInterval(() => {
      void this.syncExternalPlayback().catch((error: unknown) =>
        this.error.set(this.messageFor(error)),
      );
    }, 3000);
  }

  private stopExternalPolling(): void {
    if (this.externalPollTimer !== null) {
      window.clearInterval(this.externalPollTimer);
      this.externalPollTimer = null;
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
