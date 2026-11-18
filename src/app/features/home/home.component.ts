import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <main>
      <h1>Spotify Web Clone</h1>
      <p>Authentication complete. The app is ready for feature development.</p>
      <button type="button" (click)="logout()">Sign out</button>
    </main>
  `,
})
export class HomeComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
