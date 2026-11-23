export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyArtistProfile extends SpotifyArtist {
  images?: SpotifyImage[];
  followers?: { total: number };
  genres?: string[];
}

export interface SpotifyAlbumSummary {
  id: string;
  name: string;
  uri: string;
  images: SpotifyImage[];
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  uri: string;
  album_type: string;
  artists: SpotifyArtist[];
  images: SpotifyImage[];
  release_date: string;
  total_tracks: number;
  external_urls?: { spotify: string };
}

export interface SpotifyTrack {
  id: string | null;
  name: string;
  uri: string;
  type?: 'track';
  duration_ms: number;
  artists: SpotifyArtist[];
  album?: SpotifyAlbumSummary | null;
  track_number?: number;
  is_playable?: boolean;
}

export interface SpotifyEpisode {
  id: string;
  name: string;
  uri: string;
  type: 'episode';
  duration_ms: number;
  images: SpotifyImage[];
  show: { name: string };
}

export interface SpotifyPlaylistItem {
  added_at: string | null;
  is_local: boolean;
  item: SpotifyTrack | SpotifyEpisode | null;
}

export interface SpotifyPlaylist {
  id: string;
  name?: string | null;
  uri?: string;
  description?: string | null;
  images?: SpotifyImage[] | null;
  owner?: {
    display_name?: string | null;
  } | null;
  tracks?: {
    total?: number | null;
  } | null;
}

export interface SpotifyProfile {
  id: string;
  display_name: string;
  email?: string;
  images: SpotifyImage[];
}

export interface SpotifyPage<T> {
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  total: number;
}

export interface SpotifySavedAlbum {
  added_at: string;
  album: SpotifyAlbum;
}

export interface SpotifySearchResponse {
  albums?: SpotifyPage<SpotifyAlbum>;
  artists?: SpotifyPage<SpotifyArtistProfile>;
  playlists?: SpotifyPage<SpotifyPlaylist>;
  tracks?: SpotifyPage<SpotifyTrack>;
}

export interface SpotifyDevice {
  id: string | null;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
}

export type SpotifyRepeatMode = 'off' | 'context' | 'track';

export interface SpotifyCurrentPlayback {
  device: SpotifyDevice | null;
  is_playing: boolean;
  progress_ms: number | null;
  repeat_state: SpotifyRepeatMode;
  shuffle_state: boolean;
  item: SpotifyTrack | SpotifyEpisode | null;
}
