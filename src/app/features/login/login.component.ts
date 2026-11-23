import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <main>
      <h1>Spotify Web Clone</h1>
      <button type="button" (click)="login()">Continue with Spotify</button>
      @if (errorMessage() ?? auth.authError(); as message) {
        <p role="alert">{{ message }}</p>
      }
    </main>
  `,
})
export class LoginComponent {
  protected readonly auth = inject(AuthService);

  readonly errorMessage = signal<string | null>(null);

  async login(): Promise<void> {
    this.errorMessage.set(null);
    try {
      await this.auth.login();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Spotify sign-in failed.');
    }
  }
}
