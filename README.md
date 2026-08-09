# Portfolio

Personal portfolio site — an Angular SPA prerendered to static HTML, hosted on
AWS behind CloudFront, with a serverless contact form.

**Live at [mattsauro.com](https://mattsauro.com).**

**Stack:** Angular 21 · Tailwind CSS v4 · Terraform · S3 · CloudFront · API Gateway · Lambda · SES · ACM · Cloudflare DNS · GitHub Actions (OIDC)

## Architecture

```
                     ┌──────────────────────────────┐
   git push main ───►│ GitHub Actions               │
                     │  OIDC ──► AWS (no keys)      │
                     │  terraform apply             │
                     │  s3 sync + invalidation      │
                     └──────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
   browser ────────►│ CloudFront                    │
                    ├───────────────────────────────┤
                    │ default  ──► S3 (private, OAC)│  prerendered HTML
                    │ /api/*   ──► API Gateway      │
                    └───────────────┬───────────────┘
                                    │
                            Lambda ──► SES ──► inbox
```

Both origins sit behind one distribution, so the site and its API share an
origin — no CORS, and the frontend posts to a relative `/api/contact`.

## Layout

| Path          | What it is                                                  |
| ------------- | ----------------------------------------------------------- |
| `web/`        | Angular app. Every route prerendered to its own `index.html` |
| `api/contact` | Lambda handler: validates the form, sends via SES            |
| `bootstrap/`  | Terraform (local state) — state bucket + GitHub OIDC role    |
| `infra/`      | Terraform (S3 state) — S3, CloudFront, API Gateway, Lambda   |
| `infra/dns.tf`        | Certificate and DNS for the domain                  |
| `infra/guitarstore.tf`| Second project on the same domain, see below        |

## Local development

```bash
cd web
npm install
npm start        # http://localhost:4200
```

`npm start` proxies `/api` to the deployed API Gateway stage. Put its invoke URL
in `web/proxy.conf.json` after the first `terraform apply` — until then, the
contact form is the only thing that won't work locally.

```bash
npm run build                # prerender all routes
npm test -- --watch=false    # unit tests
```

## First-time AWS setup

Requires an AWS account with admin access, plus Terraform (>= 1.11) and the AWS
CLI. Terraform is not in homebrew-core:

```bash
brew tap hashicorp/tap && brew install hashicorp/tap/terraform
brew install awscli
```

**1. Bootstrap** — creates the Terraform state bucket and the role GitHub
Actions assumes. Run once, locally.

The numeric IDs are required: GitHub's OIDC subject claim embeds them, so a
name-only trust policy never matches.

```bash
gh api repos/<owner>/<repo> --jq '{repo_id:.id, owner_id:.owner.id}'

terraform -chdir=bootstrap init
terraform -chdir=bootstrap apply \
  -var="github_repository=<owner>/<repo>" \
  -var="github_owner_id=<owner_id>" \
  -var="github_repo_id=<repo_id>"
terraform -chdir=bootstrap output -raw backend_hcl > infra/backend.hcl
terraform -chdir=bootstrap output github_actions_role_arn
```

**2. Infrastructure** — everything else.

```bash
cp infra/terraform.tfvars.example infra/terraform.tfvars   # set your email
terraform -chdir=infra init -backend-config=backend.hcl
terraform -chdir=infra apply
```

**3. Verify SES.** AWS emails a confirmation link to the addresses in
`terraform.tfvars`. Click it. Terraform cannot do this step, and until it's done
the contact form fails at runtime even though the apply succeeded.

A new account's SES is in *sandbox* mode: 200 messages/day, and it can only send
to verified addresses. That's fine here, since the only recipient is you.

**4. Configure GitHub.** In repository settings:

| Type     | Name                       | Value                                 |
| -------- | -------------------------- | ------------------------------------- |
| Variable | `AWS_ROLE_ARN`             | from the bootstrap output             |
| Variable | `AWS_REGION`               | `us-east-2`                           |
| Variable | `TF_STATE_BUCKET`          | from the bootstrap output             |
| Secret   | `CONTACT_TO_ADDRESS`       | where messages land                   |
| Secret   | `CONTACT_FROM_ADDRESS`     | verified SES sender                   |

Plus these once a domain is attached — see [Custom domain](#custom-domain):

| Type     | Name                       | Value                                 |
| -------- | -------------------------- | ------------------------------------- |
| Variable | `DOMAIN_NAME`              | apex domain                           |
| Variable | `CLOUDFLARE_ZONE_ID`       | from the Cloudflare zone overview     |
| Variable | `GUITARSTORE_SUBDOMAIN`    | `guitarstore`, or empty to disable    |
| Secret   | `CLOUDFLARE_API_TOKEN`     | scoped to `Zone.DNS:Edit` on the zone |

**Every one of these must be set.** The workflow applies the same configuration
your laptop does, so a variable that is set locally but missing here makes CI
apply with an empty value — and Terraform reads that as "destroy the DNS."

Pushing to `main` then builds, applies, uploads, and invalidates. The site URL is
in the workflow summary, or via `terraform -chdir=infra output site_url`.

## Cost

Roughly **$1–3/month** at portfolio traffic levels: S3 storage and requests,
CloudFront transfer (1 TB/month is free tier), a handful of Lambda invocations,
and SES at $0.10 per 1,000 emails. No NAT gateway, no always-on compute.

The domain adds **$10.46/year** at Cloudflare's at-cost registrar pricing. ACM
certificates are free and renew automatically, and Cloudflare DNS is free on the
plan this uses — so the domain is the entire additional cost.

## Adding a project

Append an entry to `PROJECTS` in `web/src/app/core/projects.ts`. The next build
prerenders `/projects/<slug>` automatically — no route registration needed.

## Custom domain

The site serves from `mattsauro.com`, with `www` on the same distribution. Set
`domain_name` to enable it; leave it empty and everything falls back to the
`*.cloudfront.net` URL.

DNS lives at **Cloudflare**, not Route53. The domain is registered with
Cloudflare Registrar, which requires its own nameservers and offers no
custom-nameserver option — so delegating to a Route53 hosted zone is not
possible for a domain registered there. `infra/dns.tf` manages the records with
the Cloudflare provider, which keeps the whole stack in Terraform.

Two things follow from that, both simplifications over the Route53 route:

- **It applies in one pass.** Cloudflare is already authoritative, so the ACM
  validation record resolves the moment it exists and the certificate issues
  immediately. Route53 would need the registrar delegated first, and nothing
  resolves until it is.
- **The apex is a CNAME.** Cloudflare flattens CNAMEs at the zone apex, so
  there's no need for the A-record ALIAS that Route53 requires.

The certificate is a wildcard in **us-east-1** — CloudFront reads certificates
from that region only, whatever `aws_region` says, which is why `versions.tf`
declares a second aliased provider.

Authentication is by `CLOUDFLARE_API_TOKEN` in the environment, deliberately not
a Terraform variable, so the token stays out of state and out of tfvars:

```bash
export CLOUDFLARE_API_TOKEN=...   # scoped to Zone.DNS:Edit on the zone
terraform -chdir=infra apply
```

### A second project on the same domain

`infra/guitarstore.tf` puts [GuitarStore](https://github.com/mjsauro/GuitarStore)
on `guitarstore.mattsauro.com`. It lives here because this stack owns the domain
— the Cloudflare zone and every record on it are managed here — while GuitarStore
itself has no Terraform, so its HTTP API is looked up by name rather than
managed.

It uses an **API Gateway regional custom domain** rather than CloudFront.
GuitarStore is a fully dynamic ASP.NET app behind Cognito; fronting it with
CloudFront would mean disabling the cache and forwarding every header and cookie
on nearly every path — all of the moving parts, none of the benefit, and a
plausible way to break sessions.

That costs a second certificate: regional API Gateway domains read certificates
from their own region, so the us-east-1 wildcard cannot be reused. It is issued
in `aws_region` for the exact subdomain, and deliberately *not* as a wildcard —
a second `*.<domain>` certificate in the same account validates through the same
CNAME name as the existing one, and Cloudflare rejects duplicate records.

### GitHub Pages

`mjsauro.github.io` cannot be pointed here — GitHub controls that DNS zone, so
neither a CNAME nor an ACM validation record is possible. The only option there
is a client-side redirect from the Pages repo.
