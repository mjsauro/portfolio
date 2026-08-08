import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-3xl px-6 pt-24 pb-8">
      <p class="text-accent font-mono text-sm">404</p>
      <h1 class="text-ink mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Page not found</h1>
      <p class="text-muted mt-4 leading-relaxed">
        That address does not exist. It may have moved, or the link may be out of date.
      </p>
      <a
        routerLink="/"
        class="bg-accent mt-8 inline-block rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Back home
      </a>
    </section>
  `,
})
export class NotFound {}
