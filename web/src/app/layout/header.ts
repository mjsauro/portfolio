import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  path: string;
  label: string;
  exact: boolean;
}

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="border-line bg-surface/80 sticky top-0 z-40 border-b backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <a routerLink="/" class="text-ink text-lg font-semibold tracking-tight">
          Matthew J. Sauro
        </a>

        <nav aria-label="Main" class="hidden gap-1 sm:flex">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="text-accent bg-accent-soft"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              class="text-muted hover:text-ink rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              {{ item.label }}
            </a>
          }
        </nav>

        <button
          type="button"
          class="text-muted hover:text-ink rounded-md p-2 sm:hidden"
          [attr.aria-expanded]="menuOpen()"
          aria-controls="mobile-nav"
          (click)="toggleMenu()"
        >
          <span class="sr-only">{{ menuOpen() ? 'Close' : 'Open' }} menu</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            @if (menuOpen()) {
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" />
            } @else {
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" />
            }
          </svg>
        </button>
      </div>

      @if (menuOpen()) {
        <nav id="mobile-nav" aria-label="Main" class="border-line border-t px-6 pb-4 sm:hidden">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="text-accent"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              class="text-muted hover:text-ink block py-2 text-sm font-medium"
              (click)="closeMenu()"
            >
              {{ item.label }}
            </a>
          }
        </nav>
      }
    </header>
  `,
})
export class Header {
  protected readonly menuOpen = signal(false);

  protected readonly nav: NavItem[] = [
    { path: '/', label: 'Home', exact: true },
    { path: '/projects', label: 'Projects', exact: false },
    { path: '/about', label: 'About', exact: false },
  ];

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
