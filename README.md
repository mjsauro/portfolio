# Portfolio

Personal portfolio site — an Angular SPA prerendered to static HTML, hosted on
AWS behind CloudFront, with a serverless contact form.

**Stack:** Angular 21 · Tailwind CSS v4 · Terraform · S3 · CloudFront · API Gateway · Lambda · SES · GitHub Actions (OIDC)

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

```bash
terraform -chdir=bootstrap init
terraform -chdir=bootstrap apply -var="github_repository=<owner>/<repo>"
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

Pushing to `main` then builds, applies, uploads, and invalidates. The site URL is
in the workflow summary, or via `terraform -chdir=infra output site_url`.

## Cost

Roughly **$1–3/month** at portfolio traffic levels: S3 storage and requests,
CloudFront transfer (1 TB/month is free tier), a handful of Lambda invocations,
and SES at $0.10 per 1,000 emails. No NAT gateway, no always-on compute.

## Adding a project

Append an entry to `PROJECTS` in `web/src/app/core/projects.ts`. The next build
prerenders `/projects/<slug>` automatically — no route registration needed.

## Custom domain

The site currently uses the default `*.cloudfront.net` URL. To attach a real
domain: request an ACM certificate **in us-east-1** (CloudFront only reads certs
from that region), add `aliases` and swap `cloudfront_default_certificate` for
`acm_certificate_arn` in `infra/cloudfront.tf`, and point a Route53 alias record
at the distribution.

Note that `mjsauro.github.io` cannot be pointed here — GitHub controls that DNS
zone, so neither a CNAME nor an ACM validation record is possible. The only
option there is a client-side redirect from the Pages repo.
