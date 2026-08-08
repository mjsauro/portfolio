import { Injectable, computed, signal } from '@angular/core';

export interface Project {
  slug: string;
  title: string;
  tagline: string;
  year: number;
  stack: string[];
  /** Case-study body. Kept as three beats so every project reads consistently. */
  problem: string;
  approach: string;
  outcome: string;
  repoUrl?: string;
  liveUrl?: string;
  featured: boolean;
}

/*
 * PLACEHOLDER CONTENT — replace every entry below with real work.
 * Adding or removing an entry automatically adds/removes a prerendered
 * /projects/<slug> route; see app.routes.server.ts.
 */
const PROJECTS: readonly Project[] = [
  {
    slug: 'placeholder-distributed-cache',
    title: 'Distributed Cache Layer',
    tagline: 'Cut p99 read latency by moving hot keys off the primary database.',
    year: 2026,
    stack: ['TypeScript', 'Redis', 'AWS ElastiCache', 'Terraform'],
    problem:
      'PLACEHOLDER — describe the concrete problem: what was slow, broken, or expensive, and how you knew. Numbers land harder than adjectives.',
    approach:
      'PLACEHOLDER — describe what you built and, more importantly, which alternatives you rejected and why. This is the part interviewers actually read.',
    outcome:
      'PLACEHOLDER — describe the measured result. If you do not have a number, describe what shipped and who uses it.',
    repoUrl: 'https://github.com/mjsauro',
    featured: true,
  },
  {
    slug: 'placeholder-event-pipeline',
    title: 'Event Ingestion Pipeline',
    tagline: 'Replaced a nightly batch job with a streaming pipeline.',
    year: 2025,
    stack: ['Python', 'AWS Lambda', 'Kinesis', 'DynamoDB'],
    problem: 'PLACEHOLDER — the problem this solved.',
    approach: 'PLACEHOLDER — the design, and the tradeoffs you weighed.',
    outcome: 'PLACEHOLDER — the measured result.',
    repoUrl: 'https://github.com/mjsauro',
    featured: true,
  },
  {
    slug: 'placeholder-design-system',
    title: 'Component Library',
    tagline: 'An accessible component set shared across three product teams.',
    year: 2025,
    stack: ['Angular', 'Tailwind CSS', 'Storybook'],
    problem: 'PLACEHOLDER — the problem this solved.',
    approach: 'PLACEHOLDER — the design, and the tradeoffs you weighed.',
    outcome: 'PLACEHOLDER — the measured result.',
    featured: false,
  },
];

/** Exported separately so the prerender hook can read slugs without the DI tree. */
export const PROJECT_SLUGS: string[] = PROJECTS.map((p) => p.slug);

@Injectable({ providedIn: 'root' })
export class ProjectsStore {
  private readonly all = signal<readonly Project[]>(PROJECTS);

  readonly list = computed(() => [...this.all()].sort((a, b) => b.year - a.year));
  readonly featured = computed(() => this.list().filter((p) => p.featured));

  bySlug(slug: string): Project | undefined {
    return this.all().find((p) => p.slug === slug);
  }
}
