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
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm text-zinc-300">Your music, in one place</p>
        <h1 class="mt-1 text-3xl font-bold sm:text-4xl">Good to see you</h1>
      </div>
      <a
        class="rounded-full bg-white px-5 py-3 font-semibold text-black hover:bg-zinc-200"
        routerLink="/search"
      >
        Discover music
      </a>
    </header>

    @if (loading()) {
      <p class="mt-8 text-zinc-300" role="status">Loading your Spotify library…</p>
    }
    @if (errorMessage(); as message) {
      <p class="mt-6 rounded-lg bg-red-950 p-4 text-red-200" role="alert">{{ message }}</p>
    }

    <section class="mt-10">
      <div class="mb-4 flex items-center justify-between gap-4">
        <h2 class="text-2xl font-bold">Your playlists</h2>
        <a class="text-sm text-zinc-300 hover:text-white" routerLink="/collection">Show all</a>
      </div>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        @for (playlist of playlists().slice(0, 8); track playlist.id) {
          <a
            class="rounded-lg bg-zinc-800/70 p-3 transition hover:bg-zinc-800"
            [routerLink]="playlist.id ? ['/playlist', playlist.id] : ['/collection']"
          >
            @if (playlist.images?.[0]; as image) {
              <img
                class="aspect-square w-full rounded-md object-cover"
                [src]="image.url"
                [alt]="playlist.name || 'Playlist cover'"
              />
            } @else {
              <div
                class="grid aspect-square place-items-center rounded-md bg-zinc-700 text-zinc-400"
              >
                Playlist
              </div>
            }
            <h3 class="mt-3 truncate font-semibold">{{ playlist.name || 'Spotify playlist' }}</h3>
            <p class="truncate text-sm text-zinc-400">
              {{ playlist.owner?.display_name || 'Playlist' }}
            </p>
          </a>
        } @empty {
          @if (!loading()) {
            <p class="text-zinc-400">No playlists found.</p>
          }
        }
      </div>
    </section>

    <section class="mt-12">
      <div class="mb-4 flex items-center justify-between gap-4">
        <h2 class="text-2xl font-bold">Saved albums</h2>
        <a class="text-sm text-zinc-300 hover:text-white" routerLink="/collection">Open library</a>
      </div>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        @for (saved of savedAlbums().slice(0, 8); track saved.album.id) {
          <a
            class="rounded-lg bg-zinc-800/70 p-3 transition hover:bg-zinc-800"
            [routerLink]="['/album', saved.album.id]"
          >
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
                Album
              </div>
            }
            <h3 class="mt-3 truncate font-semibold">{{ saved.album.name }}</h3>
            <p class="truncate text-sm text-zinc-400">{{ artistNames(saved.album) }}</p>
          </a>
        } @empty {
          @if (!loading()) {
            <p class="text-zinc-400">No saved albums found.</p>
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
