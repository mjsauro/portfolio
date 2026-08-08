variable "project_name" {
  description = "Short slug used to name resources. Must be S3-safe (lowercase, hyphens)."
  type        = string
  default     = "mjsauro-portfolio"
}

variable "aws_region" {
  description = "Region for the state bucket and IAM resources."
  type        = string
  default     = "us-east-2"
}

variable "github_repository" {
  description = "owner/repo allowed to assume the deploy role, e.g. mjsauro/portfolio."
  type        = string

  validation {
    condition     = can(regex("^[^/]+/[^/]+$", var.github_repository))
    error_message = "Must be in owner/repo form."
  }
}

/*
 * GitHub issues OIDC tokens whose `sub` uses an immutable form that embeds
 * numeric IDs, so names alone never match:
 *
 *   repo:mjsauro@20001014/portfolio@1328052060:ref:refs/heads/main
 *
 * The IDs are why: renaming a repo or transferring it to another owner would
 * silently keep an old name-based trust policy valid. Numeric IDs cannot be
 * recycled, so the grant follows the actual repository.
 *
 * Look them up with:
 *   gh api repos/<owner>/<repo> --jq '{repo_id:.id, owner_id:.owner.id}'
 */
variable "github_owner_id" {
  description = "Numeric GitHub owner (user or org) ID."
  type        = string
}

variable "github_repo_id" {
  description = "Numeric GitHub repository ID."
  type        = string
}
