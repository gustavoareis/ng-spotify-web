import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { SpotifyPlayerService } from '../../core/player/spotify-player.service';
import { SpotifyApiService } from '../../core/spotify/spotify-api.service';
import {
  SpotifyPlaylist,
  SpotifyPlaylistItem,
  SpotifyTrack,
} from '../../core/spotify/spotify.models';
import { TrackListComponent } from '../../shared/components/track-list.component';

@Component({
  selector: 'app-playlist-detail',
  standalone: true,
  imports: [TrackListComponent],
  template: `
    @if (loading()) {
      <p class="text-zinc-300" role="status">Loading playlist…</p>
    }
    @if (errorMessage(); as message) {
      <p class="rounded-lg bg-red-950 p-4 text-red-200" role="alert">{{ message }}</p>
    }
    @if (actionError(); as message) {
      <p class="mt-4 rounded-lg bg-red-950 p-4 text-red-200" role="alert">{{ message }}</p>
    }

    @if (playlist(); as item) {
      <section class="flex flex-col gap-6 sm:flex-row sm:items-end">
        @if (item.images?.[0]; as image) {
          <img
            class="aspect-square w-56 rounded-lg object-cover shadow-2xl"
            [src]="image.url"
            [alt]="item.name || 'Playlist cover'"
          />
        } @else {
          <div
            class="grid aspect-square w-56 place-items-center rounded-lg bg-zinc-800 text-zinc-400"
          >
            Playlist
          </div>
        }
        <div class="min-w-0">
          <p class="text-sm font-medium uppercase tracking-wide text-zinc-300">Playlist</p>
          <h1 class="mt-2 text-4xl font-bold sm:text-6xl">{{ item.name || 'Spotify playlist' }}</h1>
          @if (item.description) {
            <p class="mt-3 text-zinc-300">{{ item.description }}</p>
          }
          <p class="mt-2 text-sm text-zinc-400">
            {{ item.owner?.display_name || 'Spotify user' }}
            @if (totalTracks() !== null) {
              · {{ totalTracks() }} tracks
            }
          </p>
          <button
            class="mt-5 rounded-full bg-emerald-500 px-6 py-3 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            type="button"
            [disabled]="!item.uri"
            (click)="playPlaylist(item)"
          >
            Play playlist
          </button>
        </div>
      </section>

      @if (itemsError(); as message) {
        <p class="mt-8 rounded-lg bg-amber-950 p-4 text-amber-100" role="status">{{ message }}</p>
      } @else {
        <section class="mt-10">
          <h2 class="mb-3 text-xl font-bold">Tracks</h2>
          <app-track-list [tracks]="tracks()" (playTrack)="playTrack($event)" />
          @if (hasMoreItems()) {
            <button
              class="mt-4 rounded-full border border-zinc-600 px-5 py-2 text-sm hover:border-white disabled:opacity-50"
              type="button"
              [disabled]="loadingMore()"
              (click)="loadMoreItems()"
            >
              {{ loadingMore() ? 'Loading…' : 'Load more tracks' }}
            </button>
          }
        </section>
      }
    }
  `,
})
export class PlaylistDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly player = inject(SpotifyPlayerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly playlist = signal<SpotifyPlaylist | null>(null);
  readonly tracks = signal<SpotifyTrack[]>([]);
  readonly totalTracks = signal<number | null>(null);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly hasMoreItems = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly itemsError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  private playlistId: string | null = null;
  private itemOffset = 0;
  private loadSequence = 0;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        void this.loadPlaylist(id);
      }
    });
  }

  async playPlaylist(playlist: SpotifyPlaylist): Promise<void> {
    const uri = playlist.uri;
    if (!uri) {
      this.actionError.set('Spotify did not return a playable playlist URI.');
      return;
    }
    await this.runAction(() => this.player.playContext(uri));
  }

  async playTrack(track: SpotifyTrack): Promise<void> {
    await this.runAction(() => this.player.playTrack(track.uri));
  }

  async loadMoreItems(): Promise<void> {
    if (!this.playlistId || !this.hasMoreItems() || this.loadingMore()) {
      return;
    }

    this.loadingMore.set(true);
    const sequence = this.loadSequence;
    const playlistId = this.playlistId;
    try {
      const nextOffset = this.itemOffset + 50;
      const page = await firstValueFrom(
        this.spotifyApi.getPlaylistItems(playlistId, 50, nextOffset),
      );
      if (sequence !== this.loadSequence) {
        return;
      }
      this.totalTracks.set(page.total);
      this.tracks.update((current) => [...current, ...this.extractTracks(page.items)]);
      this.itemOffset = nextOffset;
      this.hasMoreItems.set(page.next !== null);
    } catch (error) {
      if (sequence === this.loadSequence) {
        this.itemsError.set(this.messageFor(error));
      }
    } finally {
      if (sequence === this.loadSequence) {
        this.loadingMore.set(false);
      }
    }
  }

  private async loadPlaylist(id: string): Promise<void> {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.loadingMore.set(false);
    this.errorMessage.set(null);
    this.itemsError.set(null);
    this.playlist.set(null);
    this.tracks.set([]);
    this.totalTracks.set(null);
    this.playlistId = id;
    this.itemOffset = 0;
    this.hasMoreItems.set(false);

    try {
      const playlist = await firstValueFrom(this.spotifyApi.getPlaylist(id));
      if (sequence !== this.loadSequence) {
        return;
      }
      this.playlist.set(playlist);
    } catch (error) {
      if (sequence === this.loadSequence) {
        this.errorMessage.set(this.messageFor(error));
        this.loading.set(false);
      }
      return;
    }

    try {
      const page = await firstValueFrom(this.spotifyApi.getPlaylistItems(id, 50, 0));
      if (sequence !== this.loadSequence) {
        return;
      }
      this.totalTracks.set(page.total);
      this.tracks.set(this.extractTracks(page.items));
      this.hasMoreItems.set(page.next !== null);
    } catch (error) {
      if (sequence === this.loadSequence) {
        this.itemsError.set(
          error instanceof HttpErrorResponse && error.status === 403
            ? 'Spotify only allows track details for playlists you own or collaborate on.'
            : this.messageFor(error),
        );
      }
    } finally {
      if (sequence === this.loadSequence) {
        this.loading.set(false);
      }
    }
  }

  private extractTracks(items: SpotifyPlaylistItem[]): SpotifyTrack[] {
    return items.flatMap((entry) => {
      const item = entry.item;
      return item && item.type !== 'episode' ? [item] : [];
    });
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    this.actionError.set(null);
    try {
      await action();
    } catch (error) {
      this.actionError.set(this.messageFor(error));
    }
  }

  private messageFor(error: unknown): string {
    return error instanceof Error ? error.message : 'Could not load this playlist.';
  }
}
