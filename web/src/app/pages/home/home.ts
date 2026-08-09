import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectsStore } from '../../core/projects';
import { ProjectCard } from '../../shared/project-card';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ProjectCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-5xl px-6 pt-20 pb-16">
      <p class="text-accent font-mono text-sm">Senior Software Engineer</p>

      <h1 class="text-ink mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
        I build the APIs that background screening runs on.
      </h1>

      <p class="text-muted mt-6 max-w-2xl text-lg leading-relaxed">
        Eight years building the systems behind background screening — five of them on the
        integrations connecting employers' hiring platforms to a regulated screening pipeline,
        turning applicant tracking systems that agree on almost nothing into one dependable flow of
        requests in and results out. Lately: Java and Spring Boot, Angular on the front end, and AWS
        infrastructure I provision myself.
      </p>

      <div class="mt-10 flex flex-wrap gap-4">
        <a
          routerLink="/projects"
          class="bg-accent rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          View projects
        </a>
        <a
          routerLink="/about"
          fragment="contact"
          class="border-line text-ink hover:border-accent rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Get in touch
        </a>
      </div>
    </section>

    <section class="mx-auto max-w-5xl px-6 py-8" aria-labelledby="featured-heading">
      <div class="flex items-baseline justify-between">
        <h2 id="featured-heading" class="text-ink text-2xl font-semibold tracking-tight">
          Featured work
        </h2>
        <a routerLink="/projects" class="text-accent text-sm font-medium hover:underline">
          All projects →
        </a>
      </div>

      <div class="mt-8 grid gap-5 sm:grid-cols-2">
        @for (project of featured(); track project.slug) {
          <app-project-card [project]="project" />
        } @empty {
          <p class="text-muted">No featured projects yet.</p>
        }
      </div>
    </section>
  `,
})
export class Home {
  private readonly store = inject(ProjectsStore);
  protected readonly featured = this.store.featured;
}
