import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { SpotifyPlayerService } from '../../core/player/spotify-player.service';
import { SpotifyApiService } from '../../core/spotify/spotify-api.service';
import {
  SpotifyAlbum,
  SpotifyArtistProfile,
  SpotifyPage,
  SpotifyPlaylist,
  SpotifySearchResponse,
  SpotifyTrack,
} from '../../core/spotify/spotify.models';
import { TrackListComponent } from '../../shared/components/track-list.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [RouterLink, TrackListComponent],
  template: `
    <header>
      <p class="text-sm text-zinc-400">Search the Spotify catalog</p>
      <h1 class="mt-1 text-3xl font-bold">Search</h1>
    </header>

    <form class="mt-6 flex gap-3" (submit)="submitSearch($event)">
      <label class="sr-only" for="catalog-search"
        >Search albums, artists, playlists, or tracks</label
      >
      <input
        id="catalog-search"
        class="min-w-0 flex-1 rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 outline-none placeholder:text-zinc-500 focus:border-emerald-400"
        type="search"
        autocomplete="off"
        placeholder="What do you want to listen to?"
        [value]="query()"
        (input)="updateQuery($event)"
      />
      <button
        class="rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
        type="submit"
        [disabled]="loading()"
      >
        {{ loading() ? 'Searching…' : 'Search' }}
      </button>
    </form>

    @if (errorMessage(); as message) {
      <p class="mt-5 rounded-lg bg-red-950 p-4 text-red-200" role="alert">{{ message }}</p>
    }
    @if (actionError(); as message) {
      <p class="mt-4 rounded-lg bg-red-950 p-4 text-red-200" role="alert">{{ message }}</p>
    }

    @if (results(); as result) {
      @if (result.albums?.items?.length) {
        <section class="mt-10">
          <h2 class="mb-4 text-2xl font-bold">Albums</h2>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            @for (album of result.albums.items; track album.id) {
              <a
                class="rounded-lg bg-zinc-800/70 p-3 hover:bg-zinc-800"
                [routerLink]="['/album', album.id]"
              >
                @if (album.images[0]; as image) {
                  <img
                    class="aspect-square w-full rounded-md object-cover"
                    [src]="image.url"
                    [alt]="album.name"
                  />
                }
                <h3 class="mt-3 truncate font-semibold">{{ album.name }}</h3>
                <p class="truncate text-sm text-zinc-400">{{ artistNames(album) }}</p>
              </a>
            }
          </div>
        </section>
      }

      @if (result.tracks?.items?.length) {
        <section class="mt-10">
          <h2 class="mb-4 text-2xl font-bold">Tracks</h2>
          <app-track-list [tracks]="result.tracks.items" (playTrack)="playTrack($event)" />
        </section>
      }

      @if (result.artists?.items?.length) {
        <section class="mt-10">
          <h2 class="mb-4 text-2xl font-bold">Artists</h2>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            @for (artist of result.artists.items; track artist.id) {
              <a
                class="rounded-lg bg-zinc-800/70 p-3 hover:bg-zinc-800"
                [href]="spotifyArtistUrl(artist)"
                target="_blank"
                rel="noopener noreferrer"
              >
                @if (artist.images?.[0]; as image) {
                  <img
                    class="aspect-square w-full rounded-full object-cover"
                    [src]="image.url"
                    [alt]="artist.name"
                  />
                } @else {
                  <div
                    class="grid aspect-square place-items-center rounded-full bg-zinc-700 text-zinc-400"
                  >
                    Artist
                  </div>
                }
                <h3 class="mt-3 truncate text-center font-semibold">{{ artist.name }}</h3>
              </a>
            }
          </div>
        </section>
      }

      @if (result.playlists?.items?.length) {
        <section class="mt-10">
          <h2 class="mb-4 text-2xl font-bold">Playlists</h2>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            @for (playlist of result.playlists.items; track playlist.id) {
              <a
                class="flex items-center gap-3 rounded-lg bg-zinc-800/70 p-3 hover:bg-zinc-800"
                [routerLink]="['/playlist', playlist.id]"
              >
                @if (playlist.images?.[0]; as image) {
                  <img
                    class="h-16 w-16 rounded object-cover"
                    [src]="image.url"
                    [alt]="playlist.name || 'Playlist cover'"
                  />
                }
                <div class="min-w-0">
                  <h3 class="truncate font-semibold">{{ playlist.name || 'Spotify playlist' }}</h3>
                  <p class="truncate text-sm text-zinc-400">
                    {{ playlist.owner?.display_name || 'Playlist' }}
                  </p>
                </div>
              </a>
            }
          </div>
        </section>
      }
    }

    @if (searched() && !loading() && !hasResults() && !errorMessage()) {
      <p class="mt-8 text-zinc-400">No results found. Try a different search.</p>
    }
    @if (hasMore() && !loading()) {
      <button
        class="mt-8 rounded-full border border-zinc-600 px-6 py-3 font-semibold hover:border-white"
        type="button"
        (click)="loadMore()"
      >
        {{ loadingMore() ? 'Loading…' : 'Load more results' }}
      </button>
    }
    @if (!searched()) {
      <p class="mt-8 text-zinc-400">Search for albums, artists, playlists, or tracks.</p>
    }
  `,
})
export class SearchComponent implements OnInit {
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly player = inject(SpotifyPlayerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly query = signal('');
  readonly results = signal<SpotifySearchResponse | null>(null);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly hasMore = signal(false);
  readonly searched = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  private offset = 0;
  private searchSequence = 0;

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const query = params.get('q')?.trim() ?? '';
      this.query.set(query);
      if (query) {
        void this.runSearch(query);
      } else {
        this.searchSequence++;
        this.results.set(null);
        this.searched.set(false);
        this.hasMore.set(false);
        this.loading.set(false);
        this.loadingMore.set(false);
        this.errorMessage.set(null);
        this.actionError.set(null);
      }
    });
  }

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  submitSearch(event: SubmitEvent): void {
    event.preventDefault();
    const query = this.query().trim();
    if (!query) {
      this.results.set(null);
      this.searched.set(false);
      this.errorMessage.set(null);
      this.actionError.set(null);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { q: null },
        queryParamsHandling: 'merge',
      });
      return;
    }

    if (this.route.snapshot.queryParamMap.get('q') === query) {
      void this.runSearch(query);
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: query },
      queryParamsHandling: 'merge',
    });
  }

  async playTrack(track: SpotifyTrack): Promise<void> {
    this.actionError.set(null);
    try {
      await this.player.playTrack(track.uri);
    } catch (error) {
      this.actionError.set(this.messageFor(error));
    }
  }

  artistNames(album: SpotifyAlbum): string {
    return album.artists.map((artist) => artist.name).join(', ');
  }

  spotifyArtistUrl(artist: SpotifyArtistProfile): string {
    return `https://open.spotify.com/artist/${encodeURIComponent(artist.id)}`;
  }

  hasResults(): boolean {
    const result = this.results();
    return !!(
      result?.albums?.items.length ||
      result?.artists?.items.length ||
      result?.playlists?.items.length ||
      result?.tracks?.items.length
    );
  }

  async loadMore(): Promise<void> {
    const query = this.query().trim();
    if (!query || !this.hasMore() || this.loadingMore()) {
      return;
    }

    this.loadingMore.set(true);
    const sequence = this.searchSequence;
    try {
      const nextOffset = this.offset + 10;
      const nextPage = await firstValueFrom(this.spotifyApi.search(query, 10, nextOffset));
      if (sequence !== this.searchSequence) {
        return;
      }
      this.results.update((current) => this.mergeResults(current, nextPage));
      this.offset = nextOffset;
      this.hasMore.set(this.hasNextPage(nextPage));
    } catch (error) {
      if (sequence === this.searchSequence) {
        this.errorMessage.set(this.messageFor(error));
      }
    } finally {
      if (sequence === this.searchSequence) {
        this.loadingMore.set(false);
      }
    }
  }

  private async runSearch(query: string): Promise<void> {
    const sequence = ++this.searchSequence;
    this.loading.set(true);
    this.searched.set(true);
    this.errorMessage.set(null);
    this.actionError.set(null);
    this.results.set(null);
    this.loadingMore.set(false);
    this.offset = 0;
    this.hasMore.set(false);
    try {
      const response = await firstValueFrom(this.spotifyApi.search(query));
      if (sequence !== this.searchSequence) {
        return;
      }
      this.results.set(response);
      this.hasMore.set(this.hasNextPage(response));
    } catch (error) {
      if (sequence === this.searchSequence) {
        this.errorMessage.set(this.messageFor(error));
      }
    } finally {
      if (sequence === this.searchSequence) {
        this.loading.set(false);
      }
    }
  }

  private hasNextPage(response: SpotifySearchResponse): boolean {
    return !!(
      response.albums?.next ||
      response.artists?.next ||
      response.playlists?.next ||
      response.tracks?.next
    );
  }

  private mergeResults(
    current: SpotifySearchResponse | null,
    next: SpotifySearchResponse,
  ): SpotifySearchResponse {
    if (!current) {
      return next;
    }

    return {
      albums: this.mergePage(current.albums, next.albums),
      artists: this.mergePage(current.artists, next.artists),
      playlists: this.mergePage(current.playlists, next.playlists),
      tracks: this.mergePage(current.tracks, next.tracks),
    };
  }

  private mergePage<T>(
    current: SpotifyPage<T> | undefined,
    next: SpotifyPage<T> | undefined,
  ): SpotifyPage<T> | undefined {
    if (!current) {
      return next;
    }
    if (!next) {
      return current;
    }
    return { ...next, items: [...current.items, ...next.items] };
  }

  private messageFor(error: unknown): string {
    return error instanceof Error ? error.message : 'Spotify search failed.';
  }
}
