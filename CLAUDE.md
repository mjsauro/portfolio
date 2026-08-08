# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal portfolio site for Matthew J. Sauro. Angular SPA, prerendered to static
files, served from S3 through CloudFront, with a serverless contact form. All
AWS infrastructure is Terraform-managed and deployed by GitHub Actions via OIDC.

```
web/        Angular 21 app (Tailwind, zoneless, prerendered)
api/contact Lambda handler for the contact form
bootstrap/  Terraform, LOCAL state — creates the state bucket + GitHub OIDC role
infra/      Terraform, S3 state — the actual stack
```

## Commands

All web commands run from `web/`:

```bash
npm start                    # dev server on :4200 (proxies /api via proxy.conf.json)
npm run build                # prerenders every route into dist/portfolio/browser
npm test -- --watch=false    # full suite, one shot
npx prettier --write "src/**/*.ts" "src/**/*.html" "src/**/*.css"
```

Single tests:

```bash
npx ng test --watch=false --include src/app/core/projects.spec.ts   # one file
npx ng test --watch=false --filter "sorts projects"                 # by test name
```

Terraform (see ordering below before running anything):

```bash
terraform -chdir=infra fmt -recursive
terraform -chdir=infra init -backend-config=backend.hcl
terraform -chdir=infra plan
```

Installed locally: Terraform 1.15.8, AWS CLI 2.36.19, AWS provider pinned to
6.58.0 by the committed `.terraform.lock.hcl`. Terraform is **not** in
homebrew-core — it comes from `hashicorp/tap`:

```bash
brew tap hashicorp/tap && brew install hashicorp/tap/terraform
```

Both workflows pin `terraform_version: 1.15.8`. Keep that at or above whatever
runs locally: Terraform refuses to read state written by a newer version, so a
lower pin in CI breaks deploys the first time someone applies from a laptop.

## Terraform must run in two stages

`bootstrap/` has no backend block and keeps state in a local `terraform.tfstate`.
It exists only to create the S3 bucket that `infra/` stores its state in, plus
the GitHub OIDC provider and deploy role. Run it once, by hand:

```bash
terraform -chdir=bootstrap init
terraform -chdir=bootstrap apply \
  -var="github_repository=mjsauro/portfolio" \
  -var="github_owner_id=20001014" \
  -var="github_repo_id=1328052060"
terraform -chdir=bootstrap output -raw backend_hcl > infra/backend.hcl
```

Then `infra/` initializes against that bucket. `infra/` uses a **partial backend**
(`backend "s3" {}`) — `terraform init` without `-backend-config` will prompt or
fail. State locking uses S3 native lockfiles (`use_lockfile`), not DynamoDB, which
requires Terraform >= 1.11.

Never `terraform destroy` the bootstrap stack: the state bucket carries
`prevent_destroy` because it is the one thing that cannot be rebuilt from source.

## Architecture notes that are easy to get wrong

**The build emits no server.** `angular.json` sets `outputMode: "static"`, so
`ng build` prerenders every route to its own `index.html` and produces no Node
server bundle. Switching this back to `"server"` breaks S3 hosting entirely.
`src/server.ts` and Express were deliberately removed.

**Project data drives prerendered routes.** `web/src/app/core/projects.ts` exports
both `ProjectsStore` (for the UI) and `PROJECT_SLUGS` (read by
`app.routes.server.ts` in `getPrerenderParams`). Adding an entry to `PROJECTS`
adds a `/projects/<slug>/index.html` at the next build; there is a test asserting
the two stay in sync. The prerender hook cannot use DI, which is why the slug
list is a plain export.

**CloudFront rewrites clean URLs.** S3's REST endpoint — required by Origin
Access Control — has no directory-index behavior, so `/about` would 403 rather
than serve `/about/index.html`. `infra/functions/rewrite-index.js` runs as a
CloudFront Function on viewer-request and appends `index.html`. It is attached
**only** to the default behavior; attaching it to `/api/*` would corrupt API paths.

**The API is same-origin on purpose.** CloudFront has a second origin behind the
`/api/*` behavior pointing at API Gateway, so the browser only ever sees one
host. Consequently: the frontend posts to the relative `/api/contact`, the Lambda
sets **no CORS headers**, and API Gateway has no `cors_configuration`. Do not add
CORS handling unless the API Gateway URL is exposed to browsers directly. The API
Gateway route is literally `POST /api/contact` so CloudFront can forward the path
unchanged.

**404s arrive as 403.** With OAC, a missing S3 key returns 403, not 404. Both
codes are mapped to `/not-found/index.html` with a 404 response code in
`cloudfront.tf`.

**GitHub's OIDC subject is not what the docs suggest.** The `sub` claim GitHub
actually sends embeds numeric owner and repo IDs:

```
repo:mjsauro@20001014/portfolio@1328052060:ref:refs/heads/main
```

A trust policy matching only `repo:<owner>/<repo>:*` fails every time with
`Not authorized to perform sts:AssumeRoleWithWebIdentity`, and neither the
Actions log nor the IAM console hints at why — the role, provider, and audience
all look correct. CloudTrail is the only place the real subject appears:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRoleWithWebIdentity \
  --max-results 5 --query 'Events[].CloudTrailEvent' --output text
```

`bootstrap/` accepts both forms via `local.github_subjects`. If the repo is ever
renamed or transferred, refresh the IDs
(`gh api repos/<owner>/<repo> --jq '{repo_id:.id, owner_id:.owner.id}'`) and
re-apply. Never widen these into wildcards over the owner or repo segments — that
would let an attacker-created repo with a similar name assume the role.

**SES starts in sandbox.** `terraform apply` creates the email identities but
cannot verify them — AWS emails a confirmation link that must be clicked, or
sending fails at runtime with `MessageRejected` while the apply reports success.
In sandbox mode both sender and recipient must be verified.

**Deploy order matters.** `.github/workflows/deploy.yml` runs `terraform apply`
*before* uploading, so a new bucket or changed behavior exists by the time the
sync runs. The upload is two `s3 sync` passes because fingerprinted assets get
`max-age=31536000, immutable` while HTML gets `max-age=0, must-revalidate` —
collapsing them into one pass means users keep seeing the old page after a deploy.

## Angular conventions

`web/.claude/CLAUDE.md` holds the Angular/TypeScript style rules the CLI
generated (signals, `input()`/`output()`, native control flow, OnPush, `inject()`,
no `ngClass`/`ngStyle`, WCAG AA). Follow it for anything under `web/`; it is not
duplicated here.

Styling is Tailwind v4 configured in CSS, not a JS config file. Semantic color
tokens (`bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-accent`) are
defined in `web/src/styles.css` via `@theme` and remapped under
`prefers-color-scheme: dark`. Use those tokens rather than raw palette classes or
`dark:` variants, so light and dark stay in sync automatically.

## Content

The copy is real, not placeholder. It describes Matt's actual work at Accurate
Background (formerly CareerBuilder Employment Screening) and his career change
from title insurance underwriting.

Two rules when editing it:

**No invented metrics.** He does not have access to throughput, latency, or scale
figures for this work, so the case studies are deliberately qualitative and
specific rather than numeric. Do not add plausible-sounding numbers. If real
figures surface later, they can be slotted in.

**Respect the confidentiality line.** Naming ATS *partners* (iCIMS, Workday,
Ceridian Dayforce, Neogov, …) is fine — those integrations are public. Naming
Accurate's *customers*, or describing internal architecture in specifics
(schemas, service names, infrastructure), is not.

Still outstanding: a résumé PDF. The About page's download button was removed
rather than left pointing at a 404; restore it once `web/public/resume.pdf`
exists.
