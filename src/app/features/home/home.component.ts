import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SpotifyPlayerService } from '../../core/player/spotify-player.service';
import { SpotifyApiService } from '../../core/spotify/spotify-api.service';
import {
  SpotifyAlbum,
  SpotifyPlaylist,
  SpotifyProfile,
  SpotifySavedAlbum,
} from '../../core/spotify/spotify.models';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <main class="min-h-screen bg-zinc-950 px-3 py-3 pb-32 text-white sm:px-6">
      <div class="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside class="flex flex-col gap-5 rounded-xl bg-zinc-900 p-5">
          <a class="text-xl font-bold text-emerald-400" href="/">Spotify Web</a>
          <nav aria-label="Main navigation" class="flex gap-4 text-sm text-zinc-300 lg:flex-col">
            <a class="hover:text-white" href="#library">Your library</a>
            <a class="hover:text-white" href="#search">Search albums</a>
          </nav>

          <div class="mt-auto border-t border-zinc-800 pt-4">
            <p class="text-xs uppercase tracking-wider text-zinc-500">Signed in as</p>
            <p class="mt-1 truncate font-medium">
              {{ profile()?.display_name || profile()?.id || 'Spotify listener' }}
            </p>
            <button
              class="mt-4 rounded-full border border-zinc-600 px-4 py-2 text-sm hover:border-white"
              type="button"
              (click)="logout()"
            >
              Sign out
            </button>
          </div>
        </aside>

        <section
          class="min-w-0 rounded-xl bg-gradient-to-b from-emerald-950/60 to-zinc-900 p-5 sm:p-8"
        >
          <header class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-sm text-zinc-300">Your music, in one place</p>
              <h1 class="mt-1 text-3xl font-bold sm:text-4xl">Good to see you</h1>
            </div>
            <button
              class="rounded-full bg-emerald-500 px-5 py-3 font-semibold text-black hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
              type="button"
              [disabled]="player.connected() || player.connecting()"
              (click)="connectPlayer()"
            >
              {{
                player.connected()
                  ? 'Player connected'
                  : player.connecting()
                    ? 'Connecting…'
                    : 'Connect player'
              }}
            </button>
          </header>

          @if (loading()) {
            <p class="mt-8 text-zinc-300" role="status">Loading your Spotify library…</p>
          }
          @if (pageError(); as message) {
            <p class="mt-6 rounded-lg bg-red-950 p-4 text-red-200" role="alert">{{ message }}</p>
          }
          @if (actionError(); as message) {
            <p class="mt-4 rounded-lg bg-red-950 p-4 text-red-200" role="alert">{{ message }}</p>
          }
          @if (player.error(); as message) {
            <p class="mt-4 rounded-lg bg-red-950 p-4 text-red-200" role="alert">{{ message }}</p>
          }

          <section id="search" class="mt-10">
            <div class="mb-4">
              <h2 class="text-2xl font-bold">Find albums</h2>
              <p class="mt-1 text-sm text-zinc-400">
                Search Spotify and play an album on your connected device.
              </p>
            </div>
            <form class="flex flex-col gap-3 sm:flex-row" (submit)="searchAlbums($event)">
              <label class="sr-only" for="album-search">Search albums</label>
              <input
                id="album-search"
                class="min-w-0 flex-1 rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 outline-none placeholder:text-zinc-500 focus:border-emerald-400"
                type="search"
                autocomplete="off"
                placeholder="Album, artist, or keyword"
                [value]="query()"
                (input)="updateQuery($event)"
              />
              <button
                class="rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
                type="submit"
                [disabled]="searching()"
              >
                {{ searching() ? 'Searching…' : 'Search' }}
              </button>
            </form>

            @if (
              searchPerformed() && !searching() && !pageError() && searchResults().length === 0
            ) {
              <p class="mt-5 text-zinc-400">No albums found. Try another search.</p>
            }
            @if (searchResults().length > 0) {
              <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                @for (album of searchResults(); track album.id) {
                  <article class="rounded-lg bg-zinc-800/70 p-3 transition hover:bg-zinc-800">
                    <div class="aspect-square overflow-hidden rounded-md bg-zinc-700">
                      @if (album.images[0]; as image) {
                        <img
                          class="h-full w-full object-cover"
                          [src]="image.url"
                          [alt]="album.name"
                        />
                      } @else {
                        <div class="grid h-full place-items-center text-zinc-400">No cover</div>
                      }
                    </div>
                    <h3 class="mt-3 truncate font-semibold" [title]="album.name">
                      {{ album.name }}
                    </h3>
                    <p class="truncate text-sm text-zinc-400">{{ artistNames(album) }}</p>
                    <button
                      class="mt-3 w-full rounded-full bg-emerald-500 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
                      type="button"
                      (click)="play(album.uri)"
                    >
                      Play album
                    </button>
                  </article>
                }
              </div>
            }
          </section>

          <section id="library" class="mt-12">
            <h2 class="text-2xl font-bold">Your playlists</h2>
            @if (!loading() && playlists().length === 0) {
              <p class="mt-4 text-zinc-400">No playlists are available for this account.</p>
            }
            <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              @for (playlist of playlists(); track playlist.id) {
                <article class="flex min-w-0 items-center gap-3 rounded-lg bg-zinc-800/70 p-3">
                  @if (playlist.images?.[0]; as image) {
                    <img
                      class="h-16 w-16 rounded object-cover"
                      [src]="image.url"
                      [alt]="playlist.name || 'Playlist cover'"
                    />
                  } @else {
                    <div
                      class="grid h-16 w-16 shrink-0 place-items-center rounded bg-zinc-700 text-xs text-zinc-400"
                    >
                      No cover
                    </div>
                  }
                  <div class="min-w-0 flex-1">
                    <h3
                      class="truncate font-semibold"
                      [title]="playlist.name || 'Spotify playlist'"
                    >
                      {{ playlist.name || 'Spotify playlist' }}
                    </h3>
                    <p class="text-sm text-zinc-400">
                      {{ playlist.tracks?.total ?? 'Track count unavailable' }}
                      @if (playlist.tracks?.total != null) {
                        tracks
                      }
                    </p>
                    <p class="truncate text-xs text-zinc-500">
                      {{ playlist.owner?.display_name || 'Spotify user' }}
                    </p>
                  </div>
                  <button
                    class="rounded-full bg-emerald-500 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
                    type="button"
                    [attr.aria-label]="'Play ' + (playlist.name || 'Spotify playlist')"
                    [disabled]="!playlist.uri"
                    (click)="play(playlist.uri)"
                  >
                    Play
                  </button>
                </article>
              }
            </div>
          </section>

          <section class="mt-12">
            <h2 class="text-2xl font-bold">Saved albums</h2>
            @if (!loading() && savedAlbums().length === 0) {
              <p class="mt-4 text-zinc-400">No saved albums are available for this account.</p>
            }
            <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              @for (saved of savedAlbums(); track saved.album.id) {
                <article class="rounded-lg bg-zinc-800/70 p-3">
                  @if (saved.album.images[0]; as image) {
                    <img
                      class="aspect-square w-full rounded-md object-cover"
                      [src]="image.url"
                      [alt]="saved.album.name"
                    />
                  } @else {
                    <div
                      class="grid aspect-square place-items-center rounded-md bg-zinc-700 text-zinc-400"
                    >
                      No cover
                    </div>
                  }
                  <h3 class="mt-3 truncate font-semibold">{{ saved.album.name }}</h3>
                  <p class="truncate text-sm text-zinc-400">{{ artistNames(saved.album) }}</p>
                  <button
                    class="mt-3 w-full rounded-full bg-emerald-500 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
                    type="button"
                    (click)="play(saved.album.uri)"
                  >
                    Play album
                  </button>
                </article>
              }
            </div>
          </section>
        </section>
      </div>

      <footer
        class="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur"
      >
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div class="min-w-0 flex-1">
            @if (player.playbackState(); as state) {
              <p class="truncate font-medium">{{ state.track_window.current_track.name }}</p>
              <p class="truncate text-sm text-zinc-400">
                @for (
                  artist of state.track_window.current_track.artists;
                  track artist.name;
                  let last = $last
                ) {
                  {{ artist.name }}{{ last ? '' : ', ' }}
                }
              </p>
            } @else {
              <p class="truncate font-medium">Nothing playing</p>
              <p class="text-sm text-zinc-500">
                Connect the player and choose an album or playlist.
              </p>
            }
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button
              class="rounded-full px-3 py-2 hover:bg-zinc-800 disabled:opacity-40"
              type="button"
              aria-label="Previous track"
              [disabled]="!player.playbackState()"
              (click)="control('previous')"
            >
              ◀
            </button>
            <button
              class="rounded-full bg-white px-5 py-2 font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
              type="button"
              [disabled]="!player.playbackState()"
              (click)="control('toggle')"
            >
              {{ player.playbackState()?.paused ? 'Play' : 'Pause' }}
            </button>
            <button
              class="rounded-full px-3 py-2 hover:bg-zinc-800 disabled:opacity-40"
              type="button"
              aria-label="Next track"
              [disabled]="!player.playbackState()"
              (click)="control('next')"
            >
              ▶
            </button>
          </div>
        </div>
      </footer>
    </main>
  `,
})
export class HomeComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly player = inject(SpotifyPlayerService);
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly router = inject(Router);

  readonly profile = signal<SpotifyProfile | null>(null);
  readonly playlists = signal<SpotifyPlaylist[]>([]);
  readonly savedAlbums = signal<SpotifySavedAlbum[]>([]);
  readonly searchResults = signal<SpotifyAlbum[]>([]);
  readonly query = signal('');
  readonly loading = signal(true);
  readonly searching = signal(false);
  readonly searchPerformed = signal(false);
  readonly pageError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadLibrary();
    void this.connectPlayer();
  }

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  async searchAlbums(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const query = this.query().trim();
    this.searchResults.set([]);
    this.pageError.set(null);

    if (!query) {
      this.searchPerformed.set(false);
      return;
    }

    this.searchPerformed.set(true);
    this.searching.set(true);
    try {
      const response = await firstValueFrom(this.spotifyApi.searchAlbums(query));
      this.searchResults.set(response.albums.items);
    } catch (error) {
      this.pageError.set(this.messageFor(error));
    } finally {
      this.searching.set(false);
    }
  }

  async connectPlayer(): Promise<void> {
    this.actionError.set(null);
    try {
      await this.player.connect();
    } catch (error) {
      this.actionError.set(this.messageFor(error));
    }
  }

  async play(contextUri: string | undefined): Promise<void> {
    this.actionError.set(null);
    try {
      if (!contextUri) {
        throw new Error('This Spotify item cannot be played from the available metadata.');
      }
      if (!this.player.connected()) {
        throw new Error('Connect the player first, then choose an album or playlist.');
      }
      await this.player.playContext(contextUri);
    } catch (error) {
      this.actionError.set(this.messageFor(error));
    }
  }

  async control(action: 'previous' | 'toggle' | 'next'): Promise<void> {
    this.actionError.set(null);
    try {
      if (action === 'previous') {
        await this.player.previousTrack();
      } else if (action === 'next') {
        await this.player.nextTrack();
      } else {
        await this.player.togglePlayback();
      }
    } catch (error) {
      this.actionError.set(this.messageFor(error));
    }
  }

  artistNames(album: SpotifyAlbum): string {
    return album.artists.map((artist) => artist.name).join(', ');
  }

  logout(): void {
    this.player.disconnect();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private async loadLibrary(): Promise<void> {
    this.loading.set(true);
    this.pageError.set(null);
    try {
      const [profile, playlists, savedAlbums] = await Promise.all([
        firstValueFrom(this.spotifyApi.getCurrentProfile()),
        firstValueFrom(this.spotifyApi.getMyPlaylists()),
        firstValueFrom(this.spotifyApi.getSavedAlbums()),
      ]);
      this.profile.set(profile);
      this.playlists.set(playlists.items);
      this.savedAlbums.set(savedAlbums.items);
    } catch (error) {
      this.pageError.set(this.messageFor(error));
    } finally {
      this.loading.set(false);
    }
  }

  private messageFor(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong.';
  }
}
