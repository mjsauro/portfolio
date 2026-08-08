import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ContactForm } from '../../shared/contact-form';

interface Role {
  company: string;
  title: string;
  period: string;
  summary: string;
}

@Component({
  selector: 'app-about',
  imports: [ContactForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-3xl px-6 pt-16 pb-8">
      <h1 class="text-ink text-3xl font-bold tracking-tight sm:text-4xl">About</h1>

      <div class="text-muted mt-6 space-y-4 leading-relaxed">
        <!-- PLACEHOLDER: replace with your real bio. Two or three short paragraphs. -->
        <p>
          I'm a software engineer focused on building systems that stay understandable as they grow.
          Most of my work sits where application code meets infrastructure.
        </p>
        <p>
          Replace this paragraph with how you got here, what you care about technically, and what
          kind of team you want to join next.
        </p>
      </div>

      <!-- PLACEHOLDER: drop resume.pdf into web/public/ for this link to resolve. -->
      <a
        href="/resume.pdf"
        class="border-line text-ink hover:border-accent mt-8 inline-block rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
      >
        Download résumé (PDF)
      </a>
    </section>

    <section class="mx-auto max-w-3xl px-6 py-8" aria-labelledby="skills-heading">
      <h2 id="skills-heading" class="text-ink text-2xl font-semibold tracking-tight">Skills</h2>
      <dl class="mt-6 space-y-4">
        @for (group of skills; track group.label) {
          <div class="sm:flex sm:gap-6">
            <dt class="text-ink w-32 shrink-0 text-sm font-medium">{{ group.label }}</dt>
            <dd class="text-muted mt-1 font-mono text-sm sm:mt-0">
              {{ group.items.join(' · ') }}
            </dd>
          </div>
        }
      </dl>
    </section>

    <section class="mx-auto max-w-3xl px-6 py-8" aria-labelledby="experience-heading">
      <h2 id="experience-heading" class="text-ink text-2xl font-semibold tracking-tight">
        Experience
      </h2>
      <ol class="mt-6 space-y-8">
        @for (role of roles; track role.company) {
          <li class="border-line border-l-2 pl-5">
            <p class="text-muted font-mono text-xs">{{ role.period }}</p>
            <h3 class="text-ink mt-1 font-semibold">{{ role.title }} · {{ role.company }}</h3>
            <p class="text-muted mt-2 text-sm leading-relaxed">{{ role.summary }}</p>
          </li>
        }
      </ol>
    </section>

    <section id="contact" class="mx-auto max-w-3xl px-6 py-8" aria-labelledby="contact-heading">
      <h2 id="contact-heading" class="text-ink text-2xl font-semibold tracking-tight">
        Get in touch
      </h2>
      <p class="text-muted mt-3 leading-relaxed">
        The fastest way to reach me. I read everything that comes through here.
      </p>
      <div class="mt-8">
        <app-contact-form />
      </div>
    </section>
  `,
})
export class About {
  // PLACEHOLDER: replace with your actual skills.
  protected readonly skills = [
    { label: 'Languages', items: ['TypeScript', 'Python', 'C#', 'SQL'] },
    { label: 'Frontend', items: ['Angular', 'React', 'Tailwind CSS'] },
    { label: 'Cloud', items: ['AWS', 'Terraform', 'Docker', 'GitHub Actions'] },
    { label: 'Data', items: ['PostgreSQL', 'DynamoDB', 'Redis'] },
  ];

  // PLACEHOLDER: replace with your actual roles, most recent first.
  protected readonly roles: Role[] = [
    {
      company: 'Company Name',
      title: 'Senior Software Engineer',
      period: '2023 — Present',
      summary:
        'PLACEHOLDER — what you own, the scale you work at, and one concrete thing you shipped.',
    },
    {
      company: 'Previous Company',
      title: 'Software Engineer',
      period: '2020 — 2023',
      summary: 'PLACEHOLDER — what you built and what changed because of it.',
    },
  ];
}
