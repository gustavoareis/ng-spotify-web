import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { SpotifyApiService } from './spotify-api.service';

describe('SpotifyApiService', () => {
  let api: SpotifyApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SpotifyApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('requests the current Spotify profile', async () => {
    const response = firstValueFrom(api.getCurrentProfile());
    const request = http.expectOne('https://api.spotify.com/v1/me');

    expect(request.request.method).toBe('GET');
    request.flush({ id: 'listener', display_name: 'Listener', images: [] });

    await expect(response).resolves.toMatchObject({ id: 'listener' });
  });

  it('loads the current playlists and saved albums with bounded page sizes', async () => {
    const playlistsResponse = firstValueFrom(api.getMyPlaylists());
    const albumsResponse = firstValueFrom(api.getSavedAlbums());
    const playlistsRequest = http.expectOne(
      (candidate) =>
        candidate.url === 'https://api.spotify.com/v1/me/playlists' &&
        candidate.params.get('limit') === '50',
    );
    const albumsRequest = http.expectOne(
      (candidate) =>
        candidate.url === 'https://api.spotify.com/v1/me/albums' &&
        candidate.params.get('limit') === '20',
    );

    playlistsRequest.flush({ items: [], limit: 50, next: null, offset: 0, total: 0 });
    albumsRequest.flush({ items: [], limit: 20, next: null, offset: 0, total: 0 });

    await expect(Promise.all([playlistsResponse, albumsResponse])).resolves.toMatchObject([
      { total: 0 },
      { total: 0 },
    ]);
  });

  it('encodes an album search and limits the results', async () => {
    const response = firstValueFrom(api.searchAlbums('Daft Punk', 8));
    const request = http.expectOne(
      (candidate) =>
        candidate.url === 'https://api.spotify.com/v1/search' &&
        candidate.params.get('q') === 'Daft Punk' &&
        candidate.params.get('type') === 'album' &&
        candidate.params.get('limit') === '8',
    );

    request.flush({ albums: { items: [], limit: 8, next: null, offset: 0, total: 0 } });
    await expect(response).resolves.toMatchObject({ albums: { total: 0 } });
  });
});
