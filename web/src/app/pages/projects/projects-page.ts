import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProjectsStore } from '../../core/projects';
import { ProjectCard } from '../../shared/project-card';

@Component({
  selector: 'app-projects-page',
  imports: [ProjectCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-5xl px-6 pt-16 pb-8">
      <h1 class="text-ink text-3xl font-bold tracking-tight sm:text-4xl">Projects</h1>
      <p class="text-muted mt-4 max-w-2xl leading-relaxed">
        Each entry covers the problem, the approach and its tradeoffs, and the measured outcome.
      </p>

      <div class="mt-10 grid gap-5 sm:grid-cols-2">
        @for (project of projects(); track project.slug) {
          <app-project-card [project]="project" />
        } @empty {
          <p class="text-muted">No projects yet.</p>
        }
      </div>
    </section>
  `,
})
export class ProjectsPage {
  private readonly store = inject(ProjectsStore);
  protected readonly projects = this.store.list;
}
