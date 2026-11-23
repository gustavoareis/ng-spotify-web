import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SpotifyApiService } from '../../core/spotify/spotify-api.service';
import {
  SpotifyAlbum,
  SpotifyPlaylist,
  SpotifySavedAlbum,
} from '../../core/spotify/spotify.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="flex items-center gap-2">
      <button class="rounded-full bg-white px-4 py-2 text-sm font-bold text-black" type="button">All</button>
      <button class="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20" type="button">Music</button>
      <button class="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20" type="button">Podcasts</button>
    </header>

    @if (loading()) {
      <p class="mt-8 text-zinc-300" role="status">Loading your Spotify library…</p>
    }
    @if (errorMessage(); as message) {
      <p class="mt-6 rounded-lg bg-red-950 p-4 text-red-200" role="alert">{{ message }}</p>
    }

    <section class="mt-7">
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        @for (playlist of playlists().slice(0, 6); track playlist.id) {
          <a
            class="group flex min-w-0 items-center overflow-hidden rounded-md bg-white/10 transition hover:bg-white/20"
            [routerLink]="playlist.id ? ['/playlist', playlist.id] : ['/collection']"
          >
            @if (playlist.images?.[0]; as image) {
              <img
                class="h-14 w-14 shrink-0 object-cover shadow-lg"
                [src]="image.url"
                [alt]="playlist.name || 'Playlist cover'"
              />
            } @else {
              <div class="grid h-14 w-14 shrink-0 place-items-center bg-zinc-700 text-zinc-400">
                ♫
              </div>
            }
            <h3 class="min-w-0 truncate px-3 text-sm font-bold">
              {{ playlist.name || 'Spotify playlist' }}
            </h3>
            <span
              class="mr-3 ml-auto hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1ed760] text-black opacity-0 shadow-xl transition group-hover:grid group-hover:opacity-100"
              aria-hidden="true"
              >▶</span
            >
          </a>
        } @empty {
          @if (!loading()) {
            <div class="col-span-full rounded-lg bg-white/5 p-5 text-sm text-zinc-400">
              No playlists yet. Search for music to get started.
            </div>
          }
        }
      </div>
    </section>

    <section class="mt-9">
      <div class="mb-4 flex items-center justify-between gap-4">
        <h2 class="text-2xl font-bold tracking-tight hover:underline">Made for you</h2>
        <a class="text-sm font-semibold text-zinc-300 hover:underline" routerLink="/collection"
          >Show all</a
        >
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        @for (saved of savedAlbums().slice(0, 5); track saved.album.id) {
          <a
            class="group min-w-0 rounded-lg bg-white/[0.03] p-3 transition hover:bg-white/10"
            [routerLink]="['/album', saved.album.id]"
          >
            @if (saved.album.images[0]; as image) {
              <img
                class="aspect-square w-full rounded-md object-cover shadow-lg"
                [src]="image.url"
                [alt]="saved.album.name"
              />
            } @else {
              <div
                class="grid aspect-square place-items-center rounded-md bg-zinc-700 text-3xl text-zinc-400"
              >
                ♫
              </div>
            }
            <h3 class="mt-3 truncate text-sm font-bold">{{ saved.album.name }}</h3>
            <p class="mt-1 line-clamp-2 min-h-10 text-sm text-zinc-400">
              {{ artistNames(saved.album) }}
            </p>
            <span
              class="mt-3 grid h-10 w-10 place-items-center rounded-full bg-[#1ed760] text-black opacity-0 shadow-xl transition group-hover:translate-y-0 group-hover:opacity-100"
              aria-hidden="true"
              >▶</span
            >
          </a>
        } @empty {
          @if (!loading()) {
            <p class="col-span-full text-sm text-zinc-400">No saved albums found yet.</p>
          }
        }
      </div>
    </section>

    <section class="mt-9">
      <div class="mb-4 flex items-center justify-between gap-4">
        <h2 class="text-2xl font-bold tracking-tight">Your playlists</h2>
        <a class="text-sm font-semibold text-zinc-300 hover:underline" routerLink="/collection"
          >Open library</a
        >
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        @for (playlist of playlists().slice(0, 5); track playlist.id) {
          <a
            class="group min-w-0 rounded-lg bg-white/[0.03] p-3 transition hover:bg-white/10"
            [routerLink]="playlist.id ? ['/playlist', playlist.id] : ['/collection']"
          >
            @if (playlist.images?.[0]; as image) {
              <img
                class="aspect-square w-full rounded-md object-cover shadow-lg"
                [src]="image.url"
                [alt]="playlist.name || 'Playlist cover'"
              />
            } @else {
              <div
                class="grid aspect-square place-items-center rounded-md bg-zinc-700 text-3xl text-zinc-400"
              >
                ♫
              </div>
            }
            <h3 class="mt-3 truncate text-sm font-bold">
              {{ playlist.name || 'Spotify playlist' }}
            </h3>
            <p class="mt-1 truncate text-sm text-zinc-400">
              {{ playlist.owner?.display_name || 'Playlist' }}
            </p>
            <span
              class="mt-3 grid h-10 w-10 place-items-center rounded-full bg-[#1ed760] text-black opacity-0 shadow-xl transition group-hover:opacity-100"
              aria-hidden="true"
              >▶</span
            >
          </a>
        } @empty {
          @if (!loading()) {
            <p class="col-span-full text-sm text-zinc-400">No playlists found.</p>
          }
        }
      </div>
    </section>
  `,
})
export class HomeComponent implements OnInit {
  private readonly spotifyApi = inject(SpotifyApiService);

  readonly playlists = signal<SpotifyPlaylist[]>([]);
  readonly savedAlbums = signal<SpotifySavedAlbum[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadLibrary();
  }

  artistNames(album: SpotifyAlbum): string {
    return album.artists.map((artist) => artist.name).join(', ');
  }

  private async loadLibrary(): Promise<void> {
    try {
      const [playlists, savedAlbums] = await Promise.all([
        firstValueFrom(this.spotifyApi.getMyPlaylists()),
        firstValueFrom(this.spotifyApi.getSavedAlbums()),
      ]);
      this.playlists.set(playlists.items);
      this.savedAlbums.set(savedAlbums.items);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Could not load your library.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
