import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  SpotifyAlbum,
  SpotifyPage,
  SpotifyPlaylist,
  SpotifyProfile,
  SpotifySavedAlbum,
} from './spotify.models';

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

@Injectable({ providedIn: 'root' })
export class SpotifyApiService {
  private readonly http = inject(HttpClient);

  getCurrentProfile(): Observable<SpotifyProfile> {
    return this.http.get<SpotifyProfile>(`${SPOTIFY_API_URL}/me`);
  }

  getMyPlaylists(limit = 50): Observable<SpotifyPage<SpotifyPlaylist>> {
    return this.http.get<SpotifyPage<SpotifyPlaylist>>(`${SPOTIFY_API_URL}/me/playlists`, {
      params: new HttpParams().set('limit', limit),
    });
  }

  getSavedAlbums(limit = 20): Observable<SpotifyPage<SpotifySavedAlbum>> {
    return this.http.get<SpotifyPage<SpotifySavedAlbum>>(`${SPOTIFY_API_URL}/me/albums`, {
      params: new HttpParams().set('limit', limit),
    });
  }

  searchAlbums(query: string, limit = 12): Observable<{ albums: SpotifyPage<SpotifyAlbum> }> {
    return this.http.get<{ albums: SpotifyPage<SpotifyAlbum> }>(`${SPOTIFY_API_URL}/search`, {
      params: new HttpParams().set('q', query).set('type', 'album').set('limit', limit),
    });
  }

  playContext(contextUri: string, deviceId: string): Observable<void> {
    return this.http.put<void>(
      `${SPOTIFY_API_URL}/me/player/play`,
      { context_uri: contextUri },
      { params: new HttpParams().set('device_id', deviceId) },
    );
  }
}
