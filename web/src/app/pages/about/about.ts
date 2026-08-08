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
        <p>
          I write software for background screening — the systems that carry a check from the moment
          an employer orders it to the moment a result comes back. Most of that work has been APIs:
          the integrations connecting applicant tracking systems to a screening platform, where the
          data is regulated, personal, and expected to be correct.
        </p>
        <p>
          I did not start here. I studied criminal justice, planned on law school, earned a
          paralegal certificate, and spent seven years in title insurance, eventually working as an
          underwriter. Underwriting is risk assessment under regulatory constraint — reading a file
          closely enough to know what could go wrong, and being accountable for the call. In 2016 I
          enrolled at Coding Temple in Chicago and changed careers. I landed, more or less by
          accident, in the one corner of software where the previous decade was domain knowledge
          rather than a detour.
        </p>
        <p>
          Six years of that has been C# and ASP.NET Core; the last few have been Java and Spring
          Boot after moving to a different part of the company, which was a genuine adjustment and a
          useful one. Along the way I have picked Angular back up after years away from the front
          end, and started closing my longest-standing gap: for most of my career a DevOps team
          owned deployment, so this site runs on AWS infrastructure I wrote and deploy myself.
        </p>
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
        @for (role of roles; track role.company + role.title) {
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
  protected readonly skills = [
    { label: 'Languages', items: ['C#', 'Java', 'TypeScript', 'SQL'] },
    { label: 'Backend', items: ['ASP.NET Core', 'Spring Boot', 'REST', 'SOAP/XML', 'Queues'] },
    { label: 'Frontend', items: ['Angular', 'React', 'Tailwind CSS'] },
    { label: 'Data', items: ['SQL Server'] },
    { label: 'Cloud', items: ['AWS', 'Bedrock', 'Terraform', 'GitHub Actions'] },
  ];

  protected readonly roles: Role[] = [
    {
      company: 'Accurate Background',
      title: 'Senior Software Engineer',
      period: '2018 — Present',
      summary:
        'Joined through the acquisition of CareerBuilder Employment Screening. Built and maintained the ATS integrations carrying background check requests and results, then moved to the innovation team for a series of proofs of concept in Java and Spring Boot, and now to post-hire monitoring — building its API and, more recently, its Angular interface.',
    },
    {
      company: 'CareerBuilder Employment Screening',
      title: 'Software Engineer',
      period: '2016 — 2018',
      summary:
        'First role after changing careers. Built ASP.NET Core APIs and internal tooling for background screening integrations, working across REST, SOAP, and legacy file-based partner interfaces.',
    },
    {
      company: 'Title insurance',
      title: 'Title Underwriter',
      period: '2009 — 2016',
      summary:
        'Worked up to the underwriter level, assessing risk on real estate transactions under regulatory constraint. The habits it built — reading a file closely, knowing what could go wrong, owning the call — transferred more directly to regulated software than I expected.',
    },
  ];
}
