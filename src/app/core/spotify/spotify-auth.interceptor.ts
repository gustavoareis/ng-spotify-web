import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

const SPOTIFY_API_URL = 'https://api.spotify.com/v1/';

export const spotifyAuthInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(SPOTIFY_API_URL)) {
    return next(request);
  }

  const auth = inject(AuthService);
  const withToken = (token: string) =>
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });

  return from(auth.getValidAccessToken()).pipe(
    switchMap((token) =>
      next(withToken(token)).pipe(
        catchError((error: unknown) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
            return throwError(() => error);
          }

          return from(auth.refreshAccessToken()).pipe(
            switchMap((refreshedToken) => next(withToken(refreshedToken))),
          );
        }),
      ),
    ),
  );
};
