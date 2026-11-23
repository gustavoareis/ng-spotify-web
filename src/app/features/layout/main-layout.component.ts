import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SpotifyPlayerService } from '../../core/player/spotify-player.service';
import { SpotifyApiService } from '../../core/spotify/spotify-api.service';
import { SpotifyDevice, SpotifyProfile } from '../../core/spotify/spotify.models';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <div
      class="h-dvh min-h-[560px] overflow-hidden bg-black p-2 pb-[112px] text-white sm:p-3 sm:pb-[112px] lg:pb-[96px]"
    >
      <header
        class="mx-auto mb-2 grid h-12 max-w-[1800px] grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3"
      >
        <a
          class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
          routerLink="/"
          aria-label="Spotify home"
        >
          <svg viewBox="0 0 24 24" class="h-7 w-7" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Zm4.82 15.14a.8.8 0 0 1-1.1.26c-2.99-1.83-6.75-2.24-11.18-1.22a.8.8 0 1 1-.36-1.56c4.85-1.11 9.02-.63 12.38 1.42.38.23.5.72.26 1.1Zm1.46-3.25a1 1 0 0 1-1.37.33c-3.42-2.1-8.64-2.7-12.69-1.48a1 1 0 0 1-.58-1.91c4.63-1.4 10.39-.73 14.3 1.67.47.28.62.9.34 1.38Zm.12-3.38C14.3 7.5 8.04 7.3 4.42 8.4a1.2 1.2 0 1 1-.7-2.3c4.15-1.26 11.05-1.02 15.4 1.56a1.2 1.2 0 0 1-1.22 2.07Z"
            />
          </svg>
        </a>

        <div class="flex items-center justify-center gap-3">
          <a
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-zinc-300 transition hover:scale-105 hover:bg-zinc-800 hover:text-white"
            routerLink="/"
            aria-label="Home"
          >
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="m12 3 9 8h-3v9h-5v-6h-3v6H5v-9H3l9-8Z" />
            </svg>
          </a>
          <form
            class="flex h-12 min-w-0 max-w-[540px] flex-1 items-center gap-3 rounded-full bg-zinc-900 px-4 transition hover:bg-zinc-800 focus-within:ring-2 focus-within:ring-white"
            (submit)="submitGlobalSearch($event)"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-6 w-6 shrink-0 text-zinc-400"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 4 4" />
            </svg>
            <label class="sr-only" for="global-search">Search</label>
            <input
              id="global-search"
              class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
              type="search"
              placeholder="What do you want to listen to?"
              (input)="updateGlobalSearch($event)"
            />
            <span class="hidden h-6 border-l border-zinc-600 sm:block"></span>
            <a
              class="hidden text-zinc-400 hover:text-white sm:block"
              routerLink="/collection"
              aria-label="Browse your library"
            >
              <svg
                viewBox="0 0 24 24"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              >
                <path d="M4 5h16v14H4z" />
                <path d="M8 9h8M8 13h8M8 17h5" />
              </svg>
            </a>
          </form>
        </div>

        <div class="flex min-w-0 items-center justify-end gap-3">
          <span class="hidden truncate text-sm font-semibold text-zinc-300 sm:block">{{
            profile()?.display_name || profile()?.id || 'Spotify listener'
          }}</span>
          @if (profile()?.images?.[0]; as image) {
            <img
              class="h-9 w-9 rounded-full object-cover"
              [src]="image.url"
              [alt]="profile()?.display_name || 'Profile'"
            />
          } @else {
            <span
              class="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold"
              >{{ profileInitial() }}</span
            >
          }
          <button
            class="hidden rounded-full border border-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-white hover:text-white sm:block"
            type="button"
            (click)="logout()"
          >
            Sign out
          </button>
        </div>
      </header>

      <div
        class="mx-auto grid h-[calc(100%-56px)] max-w-[1800px] grid-cols-[64px_minmax(0,1fr)] gap-2"
      >
        <aside class="hidden min-h-0 flex-col items-center overflow-hidden rounded-lg bg-[#121212] py-3 md:flex">
          <a
            class="grid h-10 w-10 place-items-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white"
            routerLink="/collection"
            aria-label="Your Library"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h8M8 17h5" />
            </svg>
          </a>
          <a
            class="mt-2 grid h-10 w-10 place-items-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
            routerLink="/search"
            aria-label="Search"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" />
            </svg>
          </a>
          <nav aria-label="Library shortcuts" class="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto">
            <a class="grid h-10 w-10 place-items-center rounded-md bg-gradient-to-br from-purple-500 to-blue-700 text-white" routerLink="/collection" aria-label="Liked songs">
              ♥
            </a>
          </nav>
          <a class="mt-auto grid h-10 w-10 place-items-center rounded-md bg-emerald-700 text-white" routerLink="/" aria-label="Home">⌂</a>
        </aside>

        <main class="min-h-0 min-w-0 overflow-y-auto rounded-lg bg-[#121212]">
          <div
            class="min-h-full bg-gradient-to-b from-[#5b1a1b] via-[#201314] to-[#121212] px-4 pb-8 pt-5 sm:px-6 lg:px-10"
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

      <footer class="fixed inset-x-0 bottom-0 z-10 bg-black px-3 pt-3 sm:px-5">
        <div
          class="mx-auto grid max-w-[1800px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 lg:grid-cols-[minmax(12rem,1fr)_minmax(20rem,1.5fr)_minmax(12rem,1fr)]"
        >
          <div class="flex min-w-0 items-center gap-3">
            @if (player.playbackState(); as state) {
              @if (state.track_window.current_track.album.images[0]; as image) {
                <img
                  class="h-12 w-12 shrink-0 rounded object-cover sm:h-14 sm:w-14"
                  [src]="image.url"
                  [alt]="state.track_window.current_track.album.name"
                />
              }
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold hover:underline">
                  {{ state.track_window.current_track.name }}
                </p>
                <p class="truncate text-xs text-zinc-400">
                  {{ artistNames(state.track_window.current_track.artists) }}
                </p>
              </div>
            } @else {
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold">Nothing playing</p>
                <p class="truncate text-xs text-zinc-500">Choose an album, playlist, or track</p>
              </div>
            }
          </div>

          <div class="flex flex-col items-center gap-1 lg:col-start-2 lg:row-start-1">
            <div class="flex items-center gap-1 sm:gap-3">
              <button
                class="rounded p-2 text-zinc-400 transition hover:text-emerald-400 disabled:opacity-40"
                type="button"
                aria-label="Toggle shuffle"
                [attr.aria-pressed]="player.shuffle()"
                [disabled]="!player.selectedDeviceId()"
                (click)="runPlayerAction(() => player.toggleShuffle())"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path d="M16 3h5v5M4 20l5-5m7-8 5-4M14 19h7v-7M4 4l5 5" />
                </svg>
              </button>
              <button
                class="rounded p-2 text-zinc-300 transition hover:text-white disabled:opacity-40"
                type="button"
                aria-label="Previous track"
                [disabled]="!player.selectedDeviceId()"
                (click)="runPlayerAction(() => player.previousTrack())"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M6 5h2v14H6zM20 6v12l-10-6z" />
                </svg>
              </button>
              <button
                class="grid h-9 w-9 place-items-center rounded-full bg-white text-black transition hover:scale-105 disabled:opacity-40"
                type="button"
                [attr.aria-label]="player.playbackState()?.paused ? 'Play' : 'Pause'"
                [disabled]="!player.selectedDeviceId() || !player.playbackState()"
                (click)="runPlayerAction(() => player.togglePlayback())"
              >
                @if (player.playbackState()?.paused) {
                  <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="m8 5 12 7-12 7z" />
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="M7 5h4v14H7zM15 5h4v14h-4z" />
                  </svg>
                }
              </button>
              <button
                class="rounded p-2 text-zinc-300 transition hover:text-white disabled:opacity-40"
                type="button"
                aria-label="Next track"
                [disabled]="!player.selectedDeviceId()"
                (click)="runPlayerAction(() => player.nextTrack())"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M16 5h2v14h-2zM4 6v12l10-6z" />
                </svg>
              </button>
              <button
                class="rounded p-2 text-zinc-400 transition hover:text-emerald-400 disabled:opacity-40"
                type="button"
                [attr.aria-label]="'Repeat ' + player.repeatMode()"
                [disabled]="!player.selectedDeviceId()"
                (click)="runPlayerAction(() => player.cycleRepeatMode())"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path
                    d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"
                  />
                </svg>
              </button>
            </div>
            <div class="flex w-full items-center gap-2 text-[10px] text-zinc-400 sm:text-xs">
              <span>{{ formatTime(seeking() ? seekPreview() : player.positionMs()) }}</span>
              <input
                class="spotify-range h-1 min-w-0 flex-1 cursor-pointer"
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

          <div
            class="col-span-2 flex items-center justify-end gap-2 lg:col-span-1 lg:col-start-3 lg:row-start-1"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5 text-zinc-400"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <rect x="4" y="5" width="16" height="14" rx="1" />
              <path d="M8 19v2m8-2v2" />
            </svg>
            <label class="sr-only" for="playback-device">Playback device</label>
            <select
              id="playback-device"
              class="max-w-36 bg-transparent text-xs text-zinc-300 outline-none"
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
              class="spotify-range hidden w-20 lg:block sm:w-28"
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
        <div
          class="mx-auto mt-2 flex h-[18px] max-w-[1800px] items-center justify-center gap-2 rounded-t-md bg-[#1ed760] text-[10px] font-semibold text-black"
        >
          <span aria-hidden="true">◉</span>
          {{
            player.selectedDeviceId()
              ? 'Playing on ' + selectedDeviceName()
              : 'Connect a Spotify device to start listening'
          }}
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
  readonly globalSearch = signal('');

  ngOnInit(): void {
    void this.loadProfile();
    void this.connectPlayer();
  }

  artistNames(artists: Array<{ name: string }>): string {
    return artists.map((artist) => artist.name).join(', ');
  }

  profileInitial(): string {
    return (this.profile()?.display_name || this.profile()?.id || 'S').charAt(0).toUpperCase();
  }

  selectedDeviceName(): string {
    const selectedId = this.player.selectedDeviceId();
    return this.devices().find((device) => device.id === selectedId)?.name || 'NgSpotifyWeb';
  }

  updateGlobalSearch(event: Event): void {
    this.globalSearch.set((event.target as HTMLInputElement).value);
  }

  submitGlobalSearch(event: SubmitEvent): void {
    event.preventDefault();
    const query = this.globalSearch().trim();
    void this.router.navigate(['/search'], { queryParams: query ? { q: query } : {} });
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
