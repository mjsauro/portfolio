import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ContactForm } from '../../shared/contact-form';

interface Role {
  company: string;
  /** Title progression, most recent first. Mirrors the block in resume/resume.html. */
  titles: string[];
  /** Span at the employer, not at the current title. */
  period: string;
  note?: string;
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
        <p>
          I write software for background screening — the systems that carry a check from the moment
          an employer orders it to the moment a result comes back. Most of that work has been APIs:
          the integrations connecting applicant tracking systems to a screening platform, where the
          data is regulated, personal, and expected to be correct.
        </p>
        <p>
          I did not start here. I studied criminal justice, planned on law school, earned a
          paralegal certificate, and spent seven years at Chicago Title Insurance Company, working
          up from coordinator to national underwriter. Underwriting is risk assessment under
          regulatory constraint — reading a file closely enough to know what could go wrong, and
          being accountable for the call. In the fall of 2017 I left to attend Coding Temple in
          Chicago, and started writing software professionally that February. I landed, more or less
          by accident, in the one corner of software where the previous decade was domain knowledge
          rather than a detour.
        </p>
        <p>
          Seven of the years since have been .NET — a VB.NET monolith at first, then C# and ASP.NET
          Core once I moved to the integrations team. Since 2025 it has been Java and Spring Boot in
          a different part of the company, which was a genuine adjustment and a useful one. Along
          the way I have picked Angular back up after years away from the front end, and closed my
          longest-standing gap: for most of my career a DevOps team owned deployment, so I built
          this site on AWS infrastructure I wrote and deploy myself. That turned out to be timely
          rather than academic — my team has since moved toward owning its own deployments, and I am
          writing Terraform at work now instead of only after hours.
        </p>
      </div>

      <div class="mt-8">
        <!-- Served from web/public/, which is synced to the bucket root. -->
        <a
          href="/resume.pdf"
          download
          class="border-line text-ink hover:border-accent rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Download résumé (PDF)
        </a>
      </div>
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
            <h3 class="text-ink mt-1 font-semibold">{{ role.company }}</h3>
            <p class="text-muted mt-1 text-sm">{{ role.titles.join(' · ') }}</p>
            @if (role.note) {
              <p class="text-muted mt-1 text-xs italic">{{ role.note }}</p>
            }
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
  protected readonly skills = [
    { label: 'Languages', items: ['C#', 'Java', 'TypeScript', 'SQL'] },
    {
      label: 'Backend',
      items: ['ASP.NET Core', 'Spring Boot', 'Microservices', 'REST', 'GraphQL', 'SOAP/XML'],
    },
    { label: 'Data', items: ['SQL Server', 'MongoDB', 'Entity Framework Core', 'Queues'] },
    { label: 'Frontend', items: ['Angular', 'React', 'Tailwind CSS'] },
    { label: 'Cloud', items: ['AWS', 'Bedrock', 'Terraform', 'GitHub Actions'] },
  ];

  protected readonly roles: Role[] = [
    {
      company: 'Accurate Background',
      titles: ['Senior Software Engineer, 2023 — Present', 'Software Engineer, 2018 — 2023'],
      period: '2018 — Present',
      note: 'Joined CareerBuilder Employment Screening; acquired by Accurate Background in 2020.',
      summary:
        'First role after changing careers, working in the VB.NET monolith that carried ordering, vendor, and internal operations for the whole platform. Moved to the applicant tracking system integrations team at the end of 2019 and owned the APIs carrying screening requests and results through 2025. Then to the innovation team for a series of proofs of concept in Java and Spring Boot, and now to post-hire monitoring — building its API and, more recently, its Angular interface.',
    },
    {
      company: 'Chicago Title Insurance Company',
      titles: [
        'National Underwriter, 2014 — 2017',
        'National Underwriting Associate, 2011 — 2014',
        'National Business Coordinator, 2010 — 2011',
      ],
      period: '2010 — 2017',
      summary:
        'Worked up from coordinator to national underwriter, assessing risk on commercial real estate transactions across all 50 states under regulatory constraint. The habits it built — reading a file closely, knowing what could go wrong, owning the call — transferred more directly to regulated software than I expected.',
    },
  ];
}
