import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SpotifyPlayerService } from '../../core/player/spotify-player.service';
import { SpotifyApiService } from '../../core/spotify/spotify-api.service';
import { SpotifyDevice, SpotifyProfile } from '../../core/spotify/spotify.models';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen bg-black p-2 pb-40 text-white sm:p-3 sm:pb-40">
      <div class="mx-auto grid max-w-[1600px] gap-2 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside class="flex flex-col gap-4 rounded-lg bg-zinc-900 p-4 sm:p-6">
          <a class="text-xl font-bold text-emerald-400" routerLink="/">Spotify Web</a>
          <nav aria-label="Main navigation" class="flex gap-4 text-sm text-zinc-300 lg:flex-col">
            <a
              class="rounded px-2 py-2 hover:text-white"
              routerLink="/"
              routerLinkActive="text-white"
              [routerLinkActiveOptions]="{ exact: true }"
            >
              Home
            </a>
            <a
              class="rounded px-2 py-2 hover:text-white"
              routerLink="/search"
              routerLinkActive="text-white"
            >
              Search
            </a>
            <a
              class="rounded px-2 py-2 hover:text-white"
              routerLink="/collection"
              routerLinkActive="text-white"
            >
              Your library
            </a>
          </nav>

          <div class="mt-1 border-t border-zinc-800 pt-4 lg:mt-auto">
            <p class="truncate text-sm font-medium">
              {{ profile()?.display_name || profile()?.id || 'Spotify listener' }}
            </p>
            <button
              class="mt-3 rounded-full border border-zinc-600 px-4 py-2 text-xs hover:border-white"
              type="button"
              (click)="logout()"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main class="min-h-[calc(100vh-1rem)] min-w-0 overflow-hidden rounded-lg bg-zinc-900">
          <div
            class="min-h-full bg-gradient-to-b from-emerald-950/50 via-zinc-900 to-zinc-900 p-4 sm:p-8"
          >
            @if (layoutError(); as message) {
              <p class="mb-5 rounded-lg bg-red-950 p-3 text-sm text-red-200" role="alert">
                {{ message }}
              </p>
            }
            @if (player.error(); as message) {
              <p class="mb-5 rounded-lg bg-red-950 p-3 text-sm text-red-200" role="alert">
                {{ message }}
              </p>
            }
            <router-outlet />
          </div>
        </main>
      </div>

      <footer
        class="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-800 bg-zinc-950/95 px-3 py-3 backdrop-blur sm:px-6"
      >
        <div
          class="mx-auto grid max-w-[1600px] gap-3 lg:grid-cols-[minmax(12rem,1fr)_minmax(20rem,1.5fr)_minmax(12rem,1fr)] lg:items-center"
        >
          <div class="flex min-w-0 items-center gap-3">
            @if (player.playbackState(); as state) {
              @if (state.track_window.current_track.album.images[0]; as image) {
                <img
                  class="h-12 w-12 rounded object-cover"
                  [src]="image.url"
                  [alt]="state.track_window.current_track.album.name"
                />
              }
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">
                  {{ state.track_window.current_track.name }}
                </p>
                <p class="truncate text-xs text-zinc-400">
                  {{ artistNames(state.track_window.current_track.artists) }}
                </p>
              </div>
            } @else {
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">Nothing playing</p>
                <p class="truncate text-xs text-zinc-500">Choose an album, playlist, or track</p>
              </div>
            }
          </div>

          <div class="flex flex-col items-center gap-1">
            <div class="flex items-center gap-2">
              <button
                class="rounded px-2 py-1 text-sm hover:text-emerald-400 disabled:opacity-40"
                type="button"
                aria-label="Toggle shuffle"
                [attr.aria-pressed]="player.shuffle()"
                [disabled]="!player.selectedDeviceId()"
                (click)="runPlayerAction(() => player.toggleShuffle())"
              >
                {{ player.shuffle() ? 'Shuffle on' : 'Shuffle' }}
              </button>
              <button
                class="rounded-full px-3 py-2 hover:bg-zinc-800 disabled:opacity-40"
                type="button"
                aria-label="Previous track"
                [disabled]="!player.selectedDeviceId()"
                (click)="runPlayerAction(() => player.previousTrack())"
              >
                ◀
              </button>
              <button
                class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
                type="button"
                [attr.aria-label]="player.playbackState()?.paused ? 'Play' : 'Pause'"
                [disabled]="!player.selectedDeviceId() || !player.playbackState()"
                (click)="runPlayerAction(() => player.togglePlayback())"
              >
                {{ player.playbackState()?.paused ? 'Play' : 'Pause' }}
              </button>
              <button
                class="rounded-full px-3 py-2 hover:bg-zinc-800 disabled:opacity-40"
                type="button"
                aria-label="Next track"
                [disabled]="!player.selectedDeviceId()"
                (click)="runPlayerAction(() => player.nextTrack())"
              >
                ▶
              </button>
              <button
                class="rounded px-2 py-1 text-sm hover:text-emerald-400 disabled:opacity-40"
                type="button"
                [attr.aria-label]="'Repeat ' + player.repeatMode()"
                [disabled]="!player.selectedDeviceId()"
                (click)="runPlayerAction(() => player.cycleRepeatMode())"
              >
                Repeat: {{ player.repeatMode() }}
              </button>
            </div>
            <div
              class="flex w-full max-w-2xl items-center gap-2 text-[10px] text-zinc-400 sm:text-xs"
            >
              <span>{{ formatTime(seeking() ? seekPreview() : player.positionMs()) }}</span>
              <input
                class="h-1 min-w-0 flex-1 cursor-pointer accent-emerald-500"
                type="range"
                min="0"
                [max]="player.playbackState()?.duration || 0"
                [value]="seeking() ? seekPreview() : player.positionMs()"
                [disabled]="!player.playbackState()"
                aria-label="Track position"
                (pointerdown)="beginSeek()"
                (input)="previewSeek($event)"
                (change)="commitSeek($event)"
              />
              <span>{{ formatTime(player.playbackState()?.duration ?? 0) }}</span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3">
            <label class="sr-only" for="playback-device">Playback device</label>
            <select
              id="playback-device"
              class="max-w-40 rounded bg-zinc-800 px-2 py-2 text-xs text-white"
              [value]="player.selectedDeviceId() ?? ''"
              (change)="selectDevice($event)"
            >
              <option value="">Select device</option>
              @for (device of devices(); track device.id || device.name) {
                @if (device.id) {
                  <option [value]="device.id">{{ device.name }}</option>
                }
              }
            </select>
            <label class="sr-only" for="player-volume">Volume</label>
            <input
              id="player-volume"
              class="w-20 accent-emerald-500 sm:w-28"
              type="range"
              min="0"
              max="1"
              step="0.01"
              [value]="player.volume()"
              [disabled]="!player.selectedDeviceId()"
              aria-label="Volume"
              (input)="setVolume($event)"
            />
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class MainLayoutComponent implements OnInit {
  protected readonly player = inject(SpotifyPlayerService);
  private readonly auth = inject(AuthService);
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly router = inject(Router);

  readonly profile = signal<SpotifyProfile | null>(null);
  readonly devices = signal<SpotifyDevice[]>([]);
  readonly layoutError = signal<string | null>(null);
  readonly seeking = signal(false);
  readonly seekPreview = signal(0);

  ngOnInit(): void {
    void this.loadProfile();
    void this.connectPlayer();
  }

  artistNames(artists: Array<{ name: string }>): string {
    return artists.map((artist) => artist.name).join(', ');
  }

  formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
  }

  beginSeek(): void {
    this.seeking.set(true);
    this.seekPreview.set(this.player.positionMs());
  }

  previewSeek(event: Event): void {
    this.seeking.set(true);
    this.seekPreview.set(Number((event.target as HTMLInputElement).value));
  }

  async commitSeek(event: Event): Promise<void> {
    const position = Number((event.target as HTMLInputElement).value);
    this.seeking.set(false);
    await this.runPlayerAction(() => this.player.seek(position));
  }

  async setVolume(event: Event): Promise<void> {
    const volume = Number((event.target as HTMLInputElement).value);
    await this.runPlayerAction(() => this.player.setVolume(volume));
  }

  async selectDevice(event: Event): Promise<void> {
    const deviceId = (event.target as HTMLSelectElement).value;
    if (!deviceId) {
      return;
    }
    await this.runPlayerAction(() => this.player.transferToDevice(deviceId));
  }

  private async connectPlayer(): Promise<void> {
    this.layoutError.set(null);
    try {
      await this.player.connect();
      await this.refreshDevices();
    } catch (error) {
      this.layoutError.set(this.messageFor(error));
    }
  }

  async runPlayerAction(action: () => Promise<void>): Promise<void> {
    this.layoutError.set(null);
    try {
      await action();
    } catch (error) {
      this.layoutError.set(this.messageFor(error));
    }
  }

  logout(): void {
    this.player.disconnect();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private async loadProfile(): Promise<void> {
    try {
      this.profile.set(await firstValueFrom(this.spotifyApi.getCurrentProfile()));
    } catch (error) {
      this.layoutError.set(this.messageFor(error));
    }
  }

  private async refreshDevices(): Promise<void> {
    try {
      const available = await this.player.getAvailableDevices();
      const currentDeviceId = this.player.deviceId();
      if (currentDeviceId && !available.some((device) => device.id === currentDeviceId)) {
        available.unshift({
          id: currentDeviceId,
          name: 'NgSpotifyWeb',
          type: 'Computer',
          is_active: true,
          is_private_session: false,
          is_restricted: false,
          volume_percent: null,
        });
      }
      this.devices.set(available);
    } catch (error) {
      this.layoutError.set(this.messageFor(error));
    }
  }

  private messageFor(error: unknown): string {
    return error instanceof Error ? error.message : 'Spotify action failed.';
  }
}
