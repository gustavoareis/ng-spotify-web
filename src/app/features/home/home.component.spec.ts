import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { SpotifyPlayerService } from '../../core/player/spotify-player.service';
import { SpotifyApiService } from '../../core/spotify/spotify-api.service';
import { SpotifyPlaylist } from '../../core/spotify/spotify.models';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  it('renders playlists when Spotify omits optional playlist metadata', async () => {
    const playlist: SpotifyPlaylist = {
      id: 'playlist-id',
      name: 'My playlist',
    };
    const player = {
      connected: signal(false),
      connecting: signal(false),
      error: signal<string | null>(null),
      playbackState: signal(null),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      playContext: vi.fn(),
      previousTrack: vi.fn(),
      nextTrack: vi.fn(),
      togglePlayback: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout: vi.fn() } },
        { provide: SpotifyPlayerService, useValue: player },
        {
          provide: SpotifyApiService,
          useValue: {
            getCurrentProfile: () => of({ id: 'listener', display_name: 'Listener', images: [] }),
            getMyPlaylists: () =>
              of({ items: [playlist], limit: 50, next: null, offset: 0, total: 1 }),
            getSavedAlbums: () => of({ items: [], limit: 20, next: null, offset: 0, total: 0 }),
            searchAlbums: () =>
              of({ albums: { items: [], limit: 12, next: null, offset: 0, total: 0 } }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('My playlist');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Track count unavailable');
    expect(player.connect).toHaveBeenCalledOnce();
  });
});
