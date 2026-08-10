# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal portfolio site for Matthew J. Sauro. Angular SPA, prerendered to static
files, served from S3 through CloudFront at **mattsauro.com**, with a serverless
contact form. Infrastructure is Terraform-managed and deployed by GitHub Actions
via OIDC — including DNS, which lives at Cloudflare rather than Route53 and is
managed with the Cloudflare provider.

```
web/        Angular 21 app (Tailwind, zoneless, prerendered)
api/contact Lambda handler for the contact form
bootstrap/  Terraform, S3 state — creates the state bucket + GitHub OIDC role
infra/      Terraform, S3 state — the actual stack
```

Inside `infra/`, the domain is split out: `dns.tf` owns the certificate and the
Cloudflare records for the site, and `guitarstore.tf` puts a second, unrelated
project on a subdomain of the same zone. Both are documented in file headers.

## Where this repo lives

The canonical checkout is `~/Documents/repos/portfolio`. `~/portfolio` is a
symlink to it — not a second copy. If you are working somewhere else, stop and
confirm before changing anything.

**Check for staleness before touching `infra/`:**

```bash
git status -sb   # ## main...origin/main [behind N] means pull first
```

Ahead/behind is measured against the *local* `origin/main` ref, so a checkout
that has not fetched reports "up to date" while being commits behind. That is not
cosmetic here: `terraform plan` reads live state through whatever config is on
disk, so stale config makes real resources look like unmanaged orphans slated for
destruction. That exact misreading has already happened once.

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
export CLOUDFLARE_API_TOKEN=...          # required — see "The domain" below
terraform -chdir=infra fmt -recursive
terraform -chdir=infra init -backend-config=backend.hcl
terraform -chdir=infra plan
```

The CloudFront Function has its own tests, from the repository root. They use
Node's built-in runner, so there is nothing to install and no `package.json` in
`infra/`:

```bash
node --test infra/functions/                        # whole suite
node --test --test-name-pattern "query" infra/functions/
```

Prettier does cover that directory, but only when pointed at the config
explicitly — it resolves configuration per file, and `infra/` is outside `web/`,
so a bare `npx prettier` there silently uses defaults and reformats the file
wrongly:

```bash
npx --prefix web prettier --config web/.prettierrc --write "infra/functions/*.js"
```

Anything touching `infra/` needs that token in the environment. Without it even a
read-only `plan` fails while refreshing the Cloudflare records, with a `400 Missing
X-Auth-Key` that looks like a broken config rather than a missing credential.

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

`bootstrap/` exists only to create the S3 bucket that `infra/` stores its state
in, plus the GitHub OIDC provider and deploy role. Run it once, by hand:

```bash
terraform -chdir=bootstrap init -backend-config=backend.hcl
terraform -chdir=bootstrap apply \
  -var="github_repository=mjsauro/portfolio" \
  -var="github_owner_id=20001014" \
  -var="github_repo_id=1328052060"
terraform -chdir=bootstrap output -raw backend_hcl > infra/backend.hcl
```

**Both stacks now keep state in the same bucket**, under separate keys —
`bootstrap/terraform.tfstate` and `infra/terraform.tfstate`. Bootstrap storing
state in a bucket it manages is deliberate: the alternative was leaving it in a
gitignored file on one laptop, where losing the machine means losing the handle
on the OIDC provider and deploy role. The bucket is versioned, so state history
survives a bad apply.

Both use a **partial backend** (`backend "s3" {}`) — `terraform init` without
`-backend-config` will prompt or fail. State locking uses S3 native lockfiles
(`use_lockfile`), not DynamoDB, which requires Terraform >= 1.11.

The chicken-and-egg only bites on a **fresh account**, where the bucket does not
exist yet. There, run bootstrap once with no `backend.hcl` present (local state),
then migrate:

```bash
terraform -chdir=bootstrap output -raw backend_hcl_bootstrap > bootstrap/backend.hcl
terraform -chdir=bootstrap init -migrate-state -backend-config=backend.hcl
```

After migrating, the local `bootstrap/terraform.tfstate` is a stale leftover.

Never `terraform destroy` the bootstrap stack: the state bucket carries
`prevent_destroy` because it is the one thing that cannot be rebuilt from source,
and it now also holds bootstrap's own state.

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

**CloudFront rewrites clean URLs, and redirects www.** `infra/functions/rewrite-index.js`
runs as a CloudFront Function on viewer-request and does two things, in order. First
it 301s `www.<domain>` to the apex, because DNS cannot: a CNAME resolves a name, it
does not redirect a request, so the hostname has to reach CloudFront before anything
can answer. Then it appends `index.html` — S3's REST endpoint, required by Origin
Access Control, has no directory-index behavior, so `/about` would 403 rather than
serve `/about/index.html`.

It is attached **only** to the default behavior. On `/api/*` it would rewrite
`/api/contact` to `/api/contact/index.html`, and on the www hostname it would 301 the
form POST — which a browser reissues as a GET with the body dropped, so the API would
see a valid-looking request containing nothing.

`terraform validate` parses the `.tf` files but treats the function body as an opaque
string, so the only thing catching a mistake in it before it reaches every request to
the site is `infra/functions/rewrite-index.test.js`.

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

**Local applies cannot catch a missing deploy-role permission.** Laptop runs use
admin credentials; CI assumes the far narrower role defined in `bootstrap/`. So new
resource types apply cleanly by hand and then fail the next CI run — which is
exactly how the custom domain shipped, with `acm:DescribeCertificate` denied at
plan time on the first deploy after merge. When `infra/` starts managing a service
it did not before, widen `data.aws_iam_policy_document.github_actions` in
`bootstrap/main.tf` in the same change, and remember bootstrap has to be applied by
hand for that to take effect.

**The domain is Terraform-managed, and empty variables destroy it.** `domain_name`,
`cloudflare_zone_id`, and `guitarstore_subdomain` all default to `""`, and every
domain resource is gated on them via `local.domain_enabled`. That default is what
lets a fresh account apply before a domain exists — but it also means an apply
with them unset is not a no-op. It reads as *"the domain should not exist"* and
destroys the certificate, the Cloudflare records, and the CloudFront aliases,
taking the site offline while reporting success.

They therefore have to be set in **two** places that Terraform cannot cross-check:

| Where                             | What                                                                      |
| --------------------------------- | ------------------------------------------------------------------------- |
| `infra/terraform.tfvars`          | Local applies. Gitignored, so a fresh clone does not have it              |
| GitHub Actions repo *variables*   | CI applies. `DOMAIN_NAME`, `CLOUDFLARE_ZONE_ID`, `GUITARSTORE_SUBDOMAIN`  |

The token is separate and secret: `CLOUDFLARE_API_TOKEN`, from the environment
locally and from repo *secrets* in CI. It is deliberately not a Terraform variable
so it cannot land in state or in a tfvars file.

**DNS is at Cloudflare because it has to be.** The domain is registered with
Cloudflare Registrar, which does not offer custom nameservers, so a Route53 hosted
zone was never an option. Two consequences worth knowing before editing `dns.tf`:
Cloudflare flattens apex CNAMEs, so the apex points straight at CloudFront with no
ALIAS-record special case; and every record sets `proxied = false` on purpose.
Enabling the proxy would stack Cloudflare's CDN in front of CloudFront and serve
Cloudflare's certificate instead of the ACM one — two CDNs deep, for no benefit.

**There are two certificates, and they are not interchangeable.** `dns.tf` issues a
wildcard in **us-east-1**, because CloudFront reads certificates from that region
only regardless of `var.aws_region`. `guitarstore.tf` issues a second, exact-name
certificate in `var.aws_region`, because a *regional* API Gateway domain reads from
its own region and cannot reuse the wildcard. The second one is deliberately not a
wildcard: two `*.<domain>` certificates in one account validate through the same
CNAME name, and Cloudflare rejects duplicate records where Route53 tolerated them.

**GuitarStore is a separate app sharing this zone.** `guitarstore.tf` lives here
because this stack owns the Cloudflare zone, not because the app does. GuitarStore
has no Terraform of its own — its Lambda and HTTP API come from a bash script in
that repo — so this stack looks the API up by name (`var.guitarstore_api_name`)
rather than managing it, and a recreated API is picked up automatically. It is
fronted by an API Gateway custom domain rather than CloudFront because it is a
fully dynamic ASP.NET app using Cognito; caching it would mean disabling the cache
and forwarding nearly every header and cookie anyway.

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

## The résumé

`resume/resume.html` is print-first source that renders to `web/public/resume.pdf`
via `resume/render.sh` (headless Chrome). The PDF is committed rather than built in
CI: it changes a few times a year, and adding a browser to the deploy workflow to
regenerate a rarely-moving static file is not worth the minutes.

It must stay **one page**, and `render.sh` does not enforce that — check after
editing:

```bash
./resume/render.sh && mdls -name kMDItemNumberOfPages web/public/resume.pdf
```

Content sits close to the limit, so Chrome will push a whole block onto page two
rather than splitting it. Screen height is the fast way to see the margin: at a
720px body width, the content box is 960px tall, and anything above ~930px is
likely to spill in print.

The About page links it at `/resume.pdf` — `web/public/` is synced to the bucket
root, so anything added there is publicly downloadable on the next deploy whether
or not something links to it. Keep that in mind before putting a draft in the
directory.
