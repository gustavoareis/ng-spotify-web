import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SpotifyPlayerService } from '../../core/player/spotify-player.service';
import { SpotifyApiService } from '../../core/spotify/spotify-api.service';
import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent', () => {
  it('connects the playback SDK automatically when the main layout opens', async () => {
    const player = {
      connected: signal(false),
      connecting: signal(false),
      selectedDeviceId: signal<string | null>(null),
      deviceId: signal<string | null>('browser-device'),
      playbackState: signal(null),
      positionMs: signal(0),
      volume: signal(0.5),
      shuffle: signal(false),
      repeatMode: signal<'off' | 'context' | 'track'>('off'),
      error: signal<string | null>(null),
      connect: vi.fn().mockResolvedValue(undefined),
      getAvailableDevices: vi.fn().mockResolvedValue([]),
      transferToDevice: vi.fn(),
      seek: vi.fn(),
      setVolume: vi.fn(),
      toggleShuffle: vi.fn(),
      previousTrack: vi.fn(),
      togglePlayback: vi.fn(),
      nextTrack: vi.fn(),
      cycleRepeatMode: vi.fn(),
      disconnect: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout: vi.fn() } },
        { provide: SpotifyPlayerService, useValue: player },
        {
          provide: SpotifyApiService,
          useValue: {
            getCurrentProfile: () => of({ id: 'listener', display_name: 'Listener', images: [] }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(player.connect).toHaveBeenCalledOnce();
    expect(player.getAvailableDevices).toHaveBeenCalledOnce();
  });
});
