import { Injectable, computed, signal } from '@angular/core';

export interface Project {
  slug: string;
  title: string;
  tagline: string;
  /** Sort key. For multi-year work, the last year it was actively worked on. */
  year: number;
  /** Display label, e.g. "2017 — 2023" or "2025 — Present". Falls back to `year`. */
  period?: string;
  stack: string[];
  /** Case-study body. Kept as three beats so every project reads consistently. */
  problem: string;
  approach: string;
  outcome: string;
  repoUrl?: string;
  liveUrl?: string;
  featured: boolean;
}

const PROJECTS: readonly Project[] = [
  {
    slug: 'ats-integration-platform',
    title: 'Applicant Tracking System Integrations',
    tagline:
      'Background check requests in, results out — across a dozen ATS platforms that agree on almost nothing.',
    year: 2025,
    period: '2019 — 2025',
    stack: ['C#', 'ASP.NET Core', 'VB.NET', 'SQL Server', 'REST', 'SOAP/XML', 'Message Queues'],
    problem:
      'Employers live inside their applicant tracking system, so ordering a background check should not mean leaving it. The difficulty is that every ATS exposes a different contract: mostly REST, but Workday speaks SOAP/XML, and older partners still exchange flat files over SFTP. Each brings its own authentication scheme, and its own opinion about whether it pushes work to us or waits for us to pull. Left unchecked, every new partner becomes another bespoke codebase, and every new customer becomes a deployment.',
    approach:
      "I co-designed and extended the inbound and outbound APIs that carry requests and results between partners and our screening platform, normalizing each partner's contract at the edge into one internal representation so the differences stayed at the boundary. Push-based partners are acknowledged immediately and queued for asynchronous processing, so a slow downstream never turns into a partner-side timeout. Partial failure was the genuinely hard part: a request that half-succeeds is worse than one that fails cleanly, and getting retries and recovery right mattered more than the happy path ever did. Customer onboarding moved into configuration pages in the platform, which made a new customer integration a matter of configuration rather than a code change. None of it happened on a clean slate: the integrations stayed tightly coupled to the VB.NET monolith that predated them, so alongside the new work was the slower job of carving services out of it and migrating them where the coupling allowed.",
    outcome:
      'Built new integrations for Ceridian Dayforce and Neogov; co-designed and extended integrations across iCIMS, Workday, SmartRecruiters, Oracle, and Greenhouse; and maintained UKG, Jobvite, and Bullhorn. Five years of production ownership on the path that carries regulated, PII-heavy data between two systems that each assume they are in charge.',
    featured: true,
  },
  {
    slug: 'post-hire-monitoring',
    title: 'Post-Hire Monitoring API',
    tagline:
      "Continuous monitoring of driver's licenses, professional licensure, and sanctions after the hire.",
    year: 2026,
    period: '2026 — Present',
    stack: ['Java', 'Spring Boot', 'Angular', 'TypeScript', 'REST'],
    problem:
      "A background check is a snapshot taken on the day someone is hired, but risk does not hold still. A commercial driver's license gets suspended, a nursing license lapses, a name appears on a sanctions list. Employers who need to know about those changes were left choosing between re-running checks on a schedule — expensive, and still blind between runs — or not knowing at all.",
    approach:
      'I built the API layer that fronts the existing monitoring systems, giving customers one documented surface instead of coupling them to internal services that predate them. Designing it as a deliberate boundary rather than a thin proxy matters here: it leaves room for HRIS integrations, where employers would connect their system of record directly rather than maintaining a roster by hand.',
    outcome:
      'The passthrough API is complete. I am now working on the monitoring platform itself and its Angular interface — the first frontend work I have done in years, after most of a decade on backend services. Ongoing.',
    featured: true,
  },
  {
    slug: 'resume-discrepancy-detection',
    title: 'Résumé Discrepancy Detection',
    tagline: "An LLM surfacing gaps between a candidate's résumé and what they entered themselves.",
    year: 2025,
    period: '2025',
    stack: ['Java', 'Spring Boot', 'AWS Bedrock', 'JSON'],
    problem:
      'Candidates enter their employment and education history into the platform, and separately upload a résumé. When those two accounts disagree, it is worth a second look — but nothing compared them, and comparing them by hand does not scale to the volume a screening company handles.',
    approach:
      'A Spring Boot service sends the résumé to AWS Bedrock, which extracts positions, employers, dates, and education into structured JSON. Rules then compare that against what the candidate entered, deciding what counts as a real discrepancy rather than formatting noise — a job listed as "2019-2021" versus "March 2019 to June 2021" is not a lie. The framing was deliberate: in a regulated screening context a false accusation is a serious harm to a real person, so the output surfaces a discrepancy for a human to review and never renders a verdict.',
    outcome:
      'Delivered as a proof of concept on the innovation team, running against test data only. It established that the approach was viable and was handed to the team owning that product area, who took it to production.',
    featured: true,
  },
  {
    slug: 'portfolio-infrastructure',
    title: 'This Site, and Its Infrastructure',
    tagline: 'Angular prerendered to static HTML, on AWS I provisioned and deploy myself.',
    year: 2026,
    period: '2026 — Present',
    stack: ['Angular', 'Terraform', 'AWS', 'CloudFront', 'Lambda', 'GitHub Actions'],
    problem:
      'For most of my career a DevOps team owned deployment. I could describe what happened after a merge, but I had never built it. That is a real gap, and reading about IAM is not the same as being denied by it.',
    approach:
      "Angular prerenders every route to its own HTML file, so the site is genuinely static and crawlable rather than an empty shell that fills in later. It is served from a private S3 bucket through CloudFront, with the contact form's API Gateway attached to the same distribution under /api/* — same origin, so there is no CORS to configure. Terraform provisions all of it in two stages, since the bucket holding Terraform's own state has to be created before Terraform can use it. GitHub Actions deploys on push using OIDC, so no AWS credentials are stored anywhere.",
    outcome:
      "Live, deploying in under a minute on push, with no long-lived credentials. The most instructive part was the failure: GitHub's OIDC token identifies a repository by numeric ID rather than by name, so a trust policy that looked correct in every console view rejected every deploy. Finding it meant reading the actual denied request in CloudTrail. The gap it was meant to close is closed: my team has since moved toward owning its own deployments, and I am provisioning and deploying my own infrastructure at work rather than only here.",
    repoUrl: 'https://github.com/mjsauro/portfolio',
    featured: true,
  },
  {
    slug: 'smart-jurisdiction',
    title: 'Smart Jurisdiction',
    tagline: 'A feasibility study that ended in a recommendation not to build it.',
    year: 2025,
    period: '2025',
    stack: ['Java', 'Spring Boot', 'Research'],
    problem:
      'The premise was appealing: could background checks come back in seconds rather than the usual turnaround? Instant results are an obvious differentiator in screening, and the innovation team was asked whether a faster path through the existing flow was achievable.',
    approach:
      'Rather than start building the fast path, we started by measuring where the time actually went — which jurisdictions and which stages accounted for the delay, and which of those a short circuit could realistically remove.',
    outcome:
      'The premise did not survive the data. Most checks already returned quickly, and the time that remained sat in places a faster pipeline could not eliminate. Building it would have added a parallel path to maintain in exchange for very little a customer would notice, so we recommended against it. I include this deliberately: choosing not to build something, and being able to show why, is as much of the job as shipping.',
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
