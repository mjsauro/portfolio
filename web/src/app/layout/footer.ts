import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="border-line mt-24 border-t">
      <div
        class="text-muted mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <p>© {{ year }} Matthew J. Sauro</p>
        <ul class="flex gap-5">
          <li>
            <a href="https://github.com/mjsauro" class="hover:text-ink transition-colors">GitHub</a>
          </li>
          <!--
            LinkedIn intentionally omitted until there is a real profile URL.
            A link pointing at linkedin.com's homepage reads as unfinished, which
            is worse than not listing it. Restore this once the URL is known:
            <li><a href="https://www.linkedin.com/in/USERNAME">LinkedIn</a></li>
          -->
          <li>
            <a routerLink="/about" fragment="contact" class="hover:text-ink transition-colors">
              Contact
            </a>
          </li>
        </ul>
      </div>
    </footer>
  `,
})
export class Footer {
  /*
   * Evaluated during prerender and again on hydration. A stale year would only
   * show on a build left undeployed across New Year.
   */
  protected readonly year = new Date().getFullYear();
}
