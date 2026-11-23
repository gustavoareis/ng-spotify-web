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

export interface SpotifyAlbum {
  id: string;
  name: string;
  uri: string;
  album_type: string;
  artists: SpotifyArtist[];
  images: SpotifyImage[];
  release_date: string;
  total_tracks: number;
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
