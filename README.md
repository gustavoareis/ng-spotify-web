# ng-spotify-web

Angular standalone application starter for a Spotify Web API and Web Playback SDK portfolio project.

## Requirements

- Node.js supported by the installed Angular CLI
- A Spotify Developer application and its Client ID

## Development

```bash
npm install
npm start
```

The app runs at `http://localhost:4200`.

## Spotify OAuth setup

1. Add `http://localhost:4200/auth/callback` to the Redirect URIs in the Spotify Developer Dashboard.
2. Set `spotifyClientId` in `src/environments/environment.ts`.
3. Keep `spotifyRedirectUri` exactly aligned with the Dashboard value.
4. Open `/login` and sign in. The callback validates OAuth `state`, exchanges the authorization code using PKCE, and stores the access token in `sessionStorage`.

The app uses Authorization Code with PKCE; it does not put a client secret in the browser. The access token is short-lived, and this MVP requires signing in again after it expires.

## Project layout

- `src/app/core`: authentication and route guards
- `src/app/features`: route-level application features
- `src/app/shared`: reusable components, pipes, and models
- `src/environments`: public build-time configuration

Tailwind CSS is configured through the Angular CLI integration. UI styling and Spotify API/player features can be added as the next steps.
ng version