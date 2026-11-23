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
  selector: 'app-library',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header>
      <p class="text-sm text-zinc-400">Everything you saved</p>
      <h1 class="mt-1 text-3xl font-bold">Your library</h1>
    </header>

    @if (loading()) {
      <p class="mt-8 text-zinc-300" role="status">Loading your library…</p>
    }
    @if (errorMessage(); as message) {
      <p class="mt-6 rounded-lg bg-red-950 p-4 text-red-200" role="alert">{{ message }}</p>
    }

    <section class="mt-10">
      <h2 class="mb-4 text-2xl font-bold">Playlists</h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        @for (playlist of playlists(); track playlist.id) {
          <a
            class="flex min-w-0 items-center gap-4 rounded-lg bg-zinc-800/70 p-4 hover:bg-zinc-800"
            [routerLink]="['/playlist', playlist.id]"
          >
            @if (playlist.images?.[0]; as image) {
              <img
                class="h-20 w-20 rounded object-cover"
                [src]="image.url"
                [alt]="playlist.name || 'Playlist cover'"
              />
            } @else {
              <div
                class="grid h-20 w-20 shrink-0 place-items-center rounded bg-zinc-700 text-zinc-400"
              >
                Playlist
              </div>
            }
            <div class="min-w-0">
              <h3 class="truncate font-semibold">{{ playlist.name || 'Spotify playlist' }}</h3>
              <p class="truncate text-sm text-zinc-400">
                {{ playlist.owner?.display_name || 'Playlist' }}
              </p>
            </div>
          </a>
        } @empty {
          @if (!loading()) {
            <p class="text-zinc-400">No playlists found.</p>
          }
        }
      </div>
      @if (hasMorePlaylists()) {
        <button
          class="mt-4 rounded-full border border-zinc-600 px-5 py-2 text-sm hover:border-white disabled:opacity-50"
          type="button"
          [disabled]="loadingMorePlaylists()"
          (click)="loadMorePlaylists()"
        >
          {{ loadingMorePlaylists() ? 'Loading…' : 'Load more playlists' }}
        </button>
      }
    </section>

    <section class="mt-12">
      <h2 class="mb-4 text-2xl font-bold">Saved albums</h2>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        @for (saved of savedAlbums(); track saved.album.id) {
          <a
            class="rounded-lg bg-zinc-800/70 p-3 hover:bg-zinc-800"
            [routerLink]="['/album', saved.album.id]"
          >
            @if (saved.album.images[0]; as image) {
              <img
                class="aspect-square w-full rounded-md object-cover"
                [src]="image.url"
                [alt]="saved.album.name"
              />
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
      @if (hasMoreAlbums()) {
        <button
          class="mt-4 rounded-full border border-zinc-600 px-5 py-2 text-sm hover:border-white disabled:opacity-50"
          type="button"
          [disabled]="loadingMoreAlbums()"
          (click)="loadMoreAlbums()"
        >
          {{ loadingMoreAlbums() ? 'Loading…' : 'Load more albums' }}
        </button>
      }
    </section>
  `,
})
export class LibraryComponent implements OnInit {
  private readonly spotifyApi = inject(SpotifyApiService);

  readonly playlists = signal<SpotifyPlaylist[]>([]);
  readonly savedAlbums = signal<SpotifySavedAlbum[]>([]);
  readonly loading = signal(true);
  readonly loadingMorePlaylists = signal(false);
  readonly loadingMoreAlbums = signal(false);
  readonly hasMorePlaylists = signal(false);
  readonly hasMoreAlbums = signal(false);
  readonly errorMessage = signal<string | null>(null);
  private playlistOffset = 0;
  private albumOffset = 0;

  ngOnInit(): void {
    void this.loadLibrary();
  }

  artistNames(album: SpotifyAlbum): string {
    return album.artists.map((artist) => artist.name).join(', ');
  }

  async loadMorePlaylists(): Promise<void> {
    if (!this.hasMorePlaylists() || this.loadingMorePlaylists()) {
      return;
    }

    this.loadingMorePlaylists.set(true);
    try {
      const nextOffset = this.playlistOffset + 50;
      const page = await firstValueFrom(this.spotifyApi.getMyPlaylists(50, nextOffset));
      this.playlists.update((items) => [...items, ...page.items]);
      this.playlistOffset = nextOffset;
      this.hasMorePlaylists.set(page.next !== null);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Could not load playlists.');
    } finally {
      this.loadingMorePlaylists.set(false);
    }
  }

  async loadMoreAlbums(): Promise<void> {
    if (!this.hasMoreAlbums() || this.loadingMoreAlbums()) {
      return;
    }

    this.loadingMoreAlbums.set(true);
    try {
      const nextOffset = this.albumOffset + 50;
      const page = await firstValueFrom(this.spotifyApi.getSavedAlbums(50, nextOffset));
      this.savedAlbums.update((items) => [...items, ...page.items]);
      this.albumOffset = nextOffset;
      this.hasMoreAlbums.set(page.next !== null);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Could not load saved albums.',
      );
    } finally {
      this.loadingMoreAlbums.set(false);
    }
  }

  private async loadLibrary(): Promise<void> {
    try {
      const [playlists, savedAlbums] = await Promise.all([
        firstValueFrom(this.spotifyApi.getMyPlaylists(50, 0)),
        firstValueFrom(this.spotifyApi.getSavedAlbums(50, 0)),
      ]);
      this.playlists.set(playlists.items);
      this.savedAlbums.set(savedAlbums.items);
      this.playlistOffset = playlists.offset;
      this.albumOffset = savedAlbums.offset;
      this.hasMorePlaylists.set(playlists.next !== null);
      this.hasMoreAlbums.set(savedAlbums.next !== null);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Could not load your library.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
