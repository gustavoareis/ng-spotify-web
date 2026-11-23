# ng-spotify-web

Angular standalone portfolio project using the Spotify Web API, Web Playback SDK, RxJS, Signals, and Tailwind CSS.

## Requirements

- Node.js supported by the installed Angular CLI
- A Spotify Developer application
- Spotify Premium for playback through the Web Playback SDK

## Development

```bash
npm install
npm start
```

Open `http://127.0.0.1:4200/login`. Keep the development server running in the terminal. Use `127.0.0.1` rather than `localhost` for local Spotify authorization.

## Spotify application setup

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and select **Web API** and **Web Playback SDK**.
2. Add this exact redirect URI in the app settings:

   ```text
   http://127.0.0.1:4200/auth/callback
   ```

3. Copy the app's **Client ID** into `spotifyClientId` in `src/environments/environment.ts`. Keep `spotifyRedirectUri` equal to the URI above.
4. If you have an older session, sign out first. Open `http://127.0.0.1:4200/login` and authorize the app again to grant the additional scopes and receive a refresh token.

The app uses Authorization Code with PKCE and does not use a client secret in the browser. It requests scopes for profile and email, private and collaborative playlists, saved albums, and playback. If you already authorized before these scopes were added, sign out and sign in again to grant them.

Access and refresh tokens are kept in `sessionStorage`; access tokens are refreshed automatically while the refresh token remains valid. Never commit a client secret or access token.

`spotifyClientId` and the redirect URI in `src/environments/environment.ts` are public browser configuration; the Client ID is not a secret. Angular bundles environment values into files sent to the browser, so moving them to a frontend `.env` file would not protect them. This PKCE flow does not need a client secret. If a future backend needs secrets, keep them in server-side environment variables or a secret manager, never in Angular source or its browser bundle.

## Features

- PKCE login, OAuth state validation, token refresh, and protected routes
- Spotify profile, playlists, saved albums, and album search
- Automatic Web Playback SDK connection on the home screen, album/playlist playback, and previous/play-pause/next controls
- HTTP bearer-token interceptor with one retry after an expired-token response

## Project layout

- `src/app/core/auth`: OAuth and token lifecycle
- `src/app/core/spotify`: Spotify API models, service, and HTTP interceptor
- `src/app/core/player`: Web Playback SDK integration
- `src/app/core/guards`: route protection
- `src/app/features`: login and home/library screens
- `src/environments`: public build-time configuration

## Validation

```bash
npm run build
npm test -- --watch=false
```
