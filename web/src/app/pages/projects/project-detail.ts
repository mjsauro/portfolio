import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ProjectsStore } from '../../core/projects';
import { SITE_NAME } from '../../core/seo';

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = project();

    @if (p) {
      <article class="mx-auto max-w-3xl px-6 pt-16 pb-8">
        <a routerLink="/projects" class="text-accent text-sm font-medium hover:underline">
          ← All projects
        </a>

        <h1 class="text-ink mt-6 text-3xl font-bold tracking-tight sm:text-4xl">{{ p.title }}</h1>
        <p class="text-muted mt-3 text-lg leading-relaxed">{{ p.tagline }}</p>

        <dl
          class="border-line text-muted mt-8 flex flex-wrap gap-x-8 gap-y-3 border-y py-4 text-sm"
        >
          <div>
            <dt class="sr-only">Period</dt>
            <dd class="font-mono">{{ p.period ?? p.year }}</dd>
          </div>
          <div class="flex-1">
            <dt class="sr-only">Stack</dt>
            <dd class="font-mono">{{ p.stack.join(' · ') }}</dd>
          </div>
        </dl>

        <div class="mt-10 space-y-10">
          <section>
            <h2 class="text-ink text-sm font-semibold tracking-wide uppercase">Problem</h2>
            <p class="text-muted mt-3 leading-relaxed">{{ p.problem }}</p>
          </section>
          <section>
            <h2 class="text-ink text-sm font-semibold tracking-wide uppercase">Approach</h2>
            <p class="text-muted mt-3 leading-relaxed">{{ p.approach }}</p>
          </section>
          <section>
            <h2 class="text-ink text-sm font-semibold tracking-wide uppercase">Outcome</h2>
            <p class="text-muted mt-3 leading-relaxed">{{ p.outcome }}</p>
          </section>
        </div>

        @if (p.repoUrl || p.liveUrl) {
          <div class="mt-10 flex flex-wrap gap-4">
            @if (p.repoUrl) {
              <a
                [href]="p.repoUrl"
                class="border-line text-ink hover:border-accent rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
              >
                Source code
              </a>
            }
            @if (p.liveUrl) {
              <a
                [href]="p.liveUrl"
                class="border-line text-ink hover:border-accent rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
              >
                Live site
              </a>
            }
          </div>
        }
      </article>
    } @else {
      <section class="mx-auto max-w-3xl px-6 pt-16 pb-8">
        <h1 class="text-ink text-3xl font-bold tracking-tight">Project not found</h1>
        <p class="text-muted mt-4">
          No project matches this address.
          <a routerLink="/projects" class="text-accent hover:underline">Browse all projects</a>.
        </p>
      </section>
    }
  `,
})
export class ProjectDetail {
  /** Bound from the :slug route param via withComponentInputBinding(). */
  readonly slug = input.required<string>();

  private readonly store = inject(ProjectsStore);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly project = computed(() => this.store.bySlug(this.slug()));

  constructor() {
    // The route-level TitleStrategy cannot know the project name, so override here.
    effect(() => {
      const p = this.project();
      const heading = p ? p.title : 'Project not found';
      this.title.setTitle(`${heading} · ${SITE_NAME}`);
      if (p) {
        this.meta.updateTag({ name: 'description', content: p.tagline });
        this.meta.updateTag({ property: 'og:title', content: `${heading} · ${SITE_NAME}` });
        this.meta.updateTag({ property: 'og:description', content: p.tagline });
      }
    });
  }
}
