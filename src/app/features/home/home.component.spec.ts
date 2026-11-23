import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SpotifyApiService } from '../../core/spotify/spotify-api.service';
import { SpotifyPlaylist } from '../../core/spotify/spotify.models';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  it('renders playlists when Spotify omits optional metadata', async () => {
    const playlist: SpotifyPlaylist = {
      id: 'playlist-id',
      name: 'My playlist',
    };
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        {
          provide: SpotifyApiService,
          useValue: {
            getMyPlaylists: () =>
              of({ items: [playlist], limit: 50, next: null, offset: 0, total: 1 }),
            getSavedAlbums: () => of({ items: [], limit: 20, next: null, offset: 0, total: 0 }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('My playlist');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Playlist');
  });
});
