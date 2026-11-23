import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SpotifyTrack } from '../../core/spotify/spotify.models';

@Component({
  selector: 'app-track-list',
  standalone: true,
  template: `
    <ol class="divide-y divide-zinc-800">
      @for (track of tracks; track track.id || track.uri || $index; let index = $index) {
        <li
          class="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 hover:bg-zinc-800/70 sm:grid-cols-[2rem_minmax(0,1fr)_5rem_auto]"
        >
          <span class="text-right text-sm text-zinc-500">{{ index + 1 }}</span>
          <div class="min-w-0">
            <p class="truncate font-medium">{{ track.name || 'Unavailable track' }}</p>
            <p class="truncate text-sm text-zinc-400">{{ artistNames(track) }}</p>
          </div>
          <span class="hidden text-right text-sm text-zinc-500 sm:block">
            {{ formatDuration(track.duration_ms) }}
          </span>
          <button
            class="rounded-full px-3 py-2 text-sm text-emerald-400 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            [disabled]="!isPlayable(track)"
            [attr.aria-label]="'Play ' + track.name"
            (click)="playTrack.emit(track)"
          >
            Play
          </button>
        </li>
      } @empty {
        <li class="px-3 py-8 text-center text-zinc-400">No playable tracks are available.</li>
      }
    </ol>
  `,
})
export class TrackListComponent {
  @Input() tracks: SpotifyTrack[] = [];
  @Output() playTrack = new EventEmitter<SpotifyTrack>();

  artistNames(track: SpotifyTrack): string {
    return track.artists?.map((artist) => artist.name).join(', ') || 'Unknown artist';
  }

  formatDuration(durationMs: number): string {
    const seconds = Math.floor(durationMs / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  isPlayable(track: SpotifyTrack): boolean {
    return !!track.uri && track.is_playable !== false;
  }
}
