import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { SpotifyPlayerService } from '../../core/player/spotify-player.service';
import { SpotifyApiService } from '../../core/spotify/spotify-api.service';
import { SpotifyAlbum, SpotifyTrack } from '../../core/spotify/spotify.models';
import { TrackListComponent } from '../../shared/components/track-list.component';

@Component({
  selector: 'app-album-detail',
  standalone: true,
  imports: [TrackListComponent],
  template: `
    @if (loading()) {
      <p class="text-zinc-300" role="status">Loading album…</p>
    }
    @if (errorMessage(); as message) {
      <p class="rounded-lg bg-red-950 p-4 text-red-200" role="alert">{{ message }}</p>
    }
    @if (actionError(); as message) {
      <p class="mt-4 rounded-lg bg-red-950 p-4 text-red-200" role="alert">{{ message }}</p>
    }

    @if (album(); as item) {
      <section class="flex flex-col gap-6 sm:flex-row sm:items-end">
        @if (item.images[0]; as image) {
          <img
            class="aspect-square w-56 rounded-lg object-cover shadow-2xl"
            [src]="image.url"
            [alt]="item.name"
          />
        } @else {
          <div
            class="grid aspect-square w-56 place-items-center rounded-lg bg-zinc-800 text-zinc-400"
          >
            Album
          </div>
        }
        <div class="min-w-0">
          <p class="text-sm font-medium uppercase tracking-wide text-zinc-300">
            {{ item.album_type }}
          </p>
          <h1 class="mt-2 text-4xl font-bold sm:text-6xl">{{ item.name }}</h1>
          <p class="mt-3 text-zinc-300">{{ artistNames(item) }}</p>
          <p class="mt-1 text-sm text-zinc-400">
            {{ item.release_date }} · {{ item.total_tracks }} tracks
          </p>
          <button
            class="mt-5 rounded-full bg-emerald-500 px-6 py-3 font-semibold text-black hover:bg-emerald-400"
            type="button"
            (click)="playAlbum(item)"
          >
            Play album
          </button>
        </div>
      </section>

      <section class="mt-10">
        <h2 class="mb-3 text-xl font-bold">Tracks</h2>
        <app-track-list [tracks]="tracks()" (playTrack)="playTrack($event)" />
        @if (hasMoreTracks()) {
          <button
            class="mt-4 rounded-full border border-zinc-600 px-5 py-2 text-sm hover:border-white disabled:opacity-50"
            type="button"
            [disabled]="loadingMore()"
            (click)="loadMoreTracks()"
          >
            {{ loadingMore() ? 'Loading…' : 'Load more tracks' }}
          </button>
        }
      </section>
    }
  `,
})
export class AlbumDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly player = inject(SpotifyPlayerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly album = signal<SpotifyAlbum | null>(null);
  readonly tracks = signal<SpotifyTrack[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly hasMoreTracks = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  private albumId: string | null = null;
  private trackOffset = 0;
  private loadSequence = 0;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        void this.loadAlbum(id);
      }
    });
  }

  artistNames(album: SpotifyAlbum): string {
    return album.artists.map((artist) => artist.name).join(', ');
  }

  async playAlbum(album: SpotifyAlbum): Promise<void> {
    await this.runAction(() => this.player.playContext(album.uri));
  }

  async playTrack(track: SpotifyTrack): Promise<void> {
    await this.runAction(() => this.player.playTrack(track.uri));
  }

  async loadMoreTracks(): Promise<void> {
    if (!this.albumId || !this.hasMoreTracks() || this.loadingMore()) {
      return;
    }

    this.loadingMore.set(true);
    const sequence = this.loadSequence;
    const albumId = this.albumId;
    try {
      const nextOffset = this.trackOffset + 50;
      const page = await firstValueFrom(this.spotifyApi.getAlbumTracks(albumId, 50, nextOffset));
      if (sequence !== this.loadSequence) {
        return;
      }
      this.tracks.update((current) => [...current, ...page.items]);
      this.trackOffset = nextOffset;
      this.hasMoreTracks.set(page.next !== null);
    } catch (error) {
      if (sequence === this.loadSequence) {
        this.errorMessage.set(this.messageFor(error));
      }
    } finally {
      if (sequence === this.loadSequence) {
        this.loadingMore.set(false);
      }
    }
  }

  private async loadAlbum(id: string): Promise<void> {
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.loadingMore.set(false);
    this.errorMessage.set(null);
    this.album.set(null);
    this.tracks.set([]);
    this.albumId = id;
    this.trackOffset = 0;
    this.hasMoreTracks.set(false);
    try {
      const [album, tracks] = await Promise.all([
        firstValueFrom(this.spotifyApi.getAlbum(id)),
        firstValueFrom(this.spotifyApi.getAlbumTracks(id, 50, 0)),
      ]);
      if (sequence !== this.loadSequence) {
        return;
      }
      this.album.set(album);
      this.tracks.set(tracks.items);
      this.hasMoreTracks.set(tracks.next !== null);
    } catch (error) {
      if (sequence === this.loadSequence) {
        this.errorMessage.set(this.messageFor(error));
      }
    } finally {
      if (sequence === this.loadSequence) {
        this.loading.set(false);
      }
    }
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
    return error instanceof Error ? error.message : 'Could not load this album.';
  }
}
