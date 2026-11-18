import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    @if (errorMessage(); as message) {
      <p role="alert">{{ message }}</p>
    } @else {
      <p>Signing in with Spotify…</p>
    }
  `,
})
export class AuthCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    void this.finishLogin();
  }

  private async finishLogin(): Promise<void> {
    try {
      await this.auth.completeLogin(window.location.search);
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Spotify sign-in failed.');
    }
  }
}
