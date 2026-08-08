import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Project } from '../core/projects';

@Component({
  selector: 'app-project-card',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="border-line bg-raised hover:border-accent group relative rounded-xl border p-6 transition-colors"
    >
      <div class="flex items-baseline justify-between gap-4">
        <h3 class="text-ink text-lg font-semibold">
          <!-- Stretched link: the whole card is the click target, but only one link is in the a11y tree. -->
          <a [routerLink]="['/projects', project().slug]" class="after:absolute after:inset-0">
            {{ project().title }}
          </a>
        </h3>
        <span class="text-muted shrink-0 font-mono text-xs">
          {{ project().period ?? project().year }}
        </span>
      </div>

      <p class="text-muted mt-2 text-sm leading-relaxed">{{ project().tagline }}</p>

      <ul class="mt-4 flex flex-wrap gap-2">
        @for (tech of project().stack; track tech) {
          <li class="border-line text-muted rounded-full border px-2.5 py-0.5 font-mono text-xs">
            {{ tech }}
          </li>
        }
      </ul>
    </article>
  `,
})
export class ProjectCard {
  readonly project = input.required<Project>();
}
