import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  SpotifyAlbum,
  SpotifyCurrentPlayback,
  SpotifyDevice,
  SpotifyPage,
  SpotifyPlaylist,
  SpotifyPlaylistItem,
  SpotifyProfile,
  SpotifyRepeatMode,
  SpotifySavedAlbum,
  SpotifySearchResponse,
  SpotifyTrack,
} from './spotify.models';

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

@Injectable({ providedIn: 'root' })
export class SpotifyApiService {
  private readonly http = inject(HttpClient);

  getCurrentProfile(): Observable<SpotifyProfile> {
    return this.http.get<SpotifyProfile>(`${SPOTIFY_API_URL}/me`);
  }

  getMyPlaylists(limit = 50, offset = 0): Observable<SpotifyPage<SpotifyPlaylist>> {
    return this.http.get<SpotifyPage<SpotifyPlaylist>>(`${SPOTIFY_API_URL}/me/playlists`, {
      params: new HttpParams().set('limit', limit).set('offset', offset),
    });
  }

  getSavedAlbums(limit = 20, offset = 0): Observable<SpotifyPage<SpotifySavedAlbum>> {
    return this.http.get<SpotifyPage<SpotifySavedAlbum>>(`${SPOTIFY_API_URL}/me/albums`, {
      params: new HttpParams().set('limit', limit).set('offset', offset),
    });
  }

  getPlaylist(id: string): Observable<SpotifyPlaylist> {
    return this.http.get<SpotifyPlaylist>(`${SPOTIFY_API_URL}/playlists/${encodeURIComponent(id)}`);
  }

  getPlaylistItems(
    id: string,
    limit = 50,
    offset = 0,
  ): Observable<SpotifyPage<SpotifyPlaylistItem>> {
    return this.http.get<SpotifyPage<SpotifyPlaylistItem>>(
      `${SPOTIFY_API_URL}/playlists/${encodeURIComponent(id)}/items`,
      { params: new HttpParams().set('limit', limit).set('offset', offset) },
    );
  }

  getAlbum(id: string): Observable<SpotifyAlbum> {
    return this.http.get<SpotifyAlbum>(`${SPOTIFY_API_URL}/albums/${encodeURIComponent(id)}`);
  }

  getAlbumTracks(id: string, limit = 50, offset = 0): Observable<SpotifyPage<SpotifyTrack>> {
    return this.http.get<SpotifyPage<SpotifyTrack>>(
      `${SPOTIFY_API_URL}/albums/${encodeURIComponent(id)}/tracks`,
      { params: new HttpParams().set('limit', limit).set('offset', offset) },
    );
  }

  search(query: string, limit = 10, offset = 0): Observable<SpotifySearchResponse> {
    return this.http.get<SpotifySearchResponse>(`${SPOTIFY_API_URL}/search`, {
      params: new HttpParams()
        .set('q', query)
        .set('type', 'album,artist,playlist,track')
        .set('limit', limit)
        .set('offset', offset),
    });
  }

  getAvailableDevices(): Observable<{ devices: SpotifyDevice[] }> {
    return this.http.get<{ devices: SpotifyDevice[] }>(`${SPOTIFY_API_URL}/me/player/devices`);
  }

  getCurrentPlayback(): Observable<SpotifyCurrentPlayback | null> {
    return this.http.get<SpotifyCurrentPlayback | null>(`${SPOTIFY_API_URL}/me/player`);
  }

  transferPlayback(deviceId: string, play = false): Observable<void> {
    return this.http.put<void>(`${SPOTIFY_API_URL}/me/player`, {
      device_ids: [deviceId],
      play,
    });
  }

  resume(deviceId: string): Observable<void> {
    return this.http.put<void>(`${SPOTIFY_API_URL}/me/player/play`, null, {
      params: new HttpParams().set('device_id', deviceId),
    });
  }

  playContext(contextUri: string, deviceId: string): Observable<void> {
    return this.http.put<void>(
      `${SPOTIFY_API_URL}/me/player/play`,
      { context_uri: contextUri },
      { params: new HttpParams().set('device_id', deviceId) },
    );
  }

  playTrack(trackUri: string, deviceId: string): Observable<void> {
    return this.http.put<void>(
      `${SPOTIFY_API_URL}/me/player/play`,
      { uris: [trackUri] },
      { params: new HttpParams().set('device_id', deviceId) },
    );
  }

  seek(positionMs: number, deviceId: string): Observable<void> {
    return this.http.put<void>(`${SPOTIFY_API_URL}/me/player/seek`, null, {
      params: new HttpParams()
        .set('position_ms', Math.max(0, Math.round(positionMs)))
        .set('device_id', deviceId),
    });
  }

  setVolume(volumePercent: number, deviceId: string): Observable<void> {
    return this.http.put<void>(`${SPOTIFY_API_URL}/me/player/volume`, null, {
      params: new HttpParams()
        .set('volume_percent', Math.max(0, Math.min(100, Math.round(volumePercent))))
        .set('device_id', deviceId),
    });
  }

  setShuffle(enabled: boolean, deviceId: string): Observable<void> {
    return this.http.put<void>(`${SPOTIFY_API_URL}/me/player/shuffle`, null, {
      params: new HttpParams().set('state', enabled).set('device_id', deviceId),
    });
  }

  setRepeatMode(mode: SpotifyRepeatMode, deviceId: string): Observable<void> {
    return this.http.put<void>(`${SPOTIFY_API_URL}/me/player/repeat`, null, {
      params: new HttpParams().set('state', mode).set('device_id', deviceId),
    });
  }

  pause(deviceId: string): Observable<void> {
    return this.http.put<void>(`${SPOTIFY_API_URL}/me/player/pause`, null, {
      params: new HttpParams().set('device_id', deviceId),
    });
  }

  next(deviceId: string): Observable<void> {
    return this.http.post<void>(`${SPOTIFY_API_URL}/me/player/next`, null, {
      params: new HttpParams().set('device_id', deviceId),
    });
  }

  previous(deviceId: string): Observable<void> {
    return this.http.post<void>(`${SPOTIFY_API_URL}/me/player/previous`, null, {
      params: new HttpParams().set('device_id', deviceId),
    });
  }
}
