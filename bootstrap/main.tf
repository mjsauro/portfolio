/*
 * Bootstrap: the chicken-and-egg layer.
 *
 * Terraform needs an S3 bucket to store remote state, but that bucket has to be
 * created by something. This module runs with LOCAL state (see the absence of a
 * backend block) and creates:
 *   - the versioned state bucket used by ../infra
 *   - the GitHub OIDC provider and the role Actions assumes to deploy
 *
 * Run this once, by hand, then never again. Its own terraform.tfstate is
 * gitignored; if you lose it, import the resources rather than re-applying.
 */

terraform {
  # 1.11+ for native S3 state locking (use_lockfile), which replaces the old
  # DynamoDB lock table with a lock object in the state bucket itself.
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform/bootstrap"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  # Account ID suffix keeps the bucket name globally unique without a random resource.
  state_bucket_name = "${var.project_name}-tfstate-${data.aws_caller_identity.current.account_id}"

  github_owner = split("/", var.github_repository)[0]
  github_repo  = split("/", var.github_repository)[1]

  # Both accepted subject forms. GitHub currently sends the immutable one
  # (numeric IDs); the plain name form is kept so the role survives if that
  # behavior is reverted or varies by event type.
  #
  # Each entry is an exact prefix whose only wildcard is the trailing segment,
  # covering the ref or environment. Never wildcard the owner or repo segments:
  # a pattern like "repo:mjsauro<star>/portfolio<star>:<star>" would also match
  # a repo named mjsauro-attacker/portfolio-evil.
  #
  # (Written with <star> rather than the literal glob because the sequence that
  # combines it with a slash would terminate a block comment.)
  github_subjects = [
    "repo:${var.github_repository}:*",
    "repo:${local.github_owner}@${var.github_owner_id}/${local.github_repo}@${var.github_repo_id}:*",
  ]
}

# ---------------------------------------------------------------------------
# Remote state bucket
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "state" {
  bucket = local.state_bucket_name

  # State is the one thing you cannot rebuild from source. Refuse to destroy it.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ---------------------------------------------------------------------------
# GitHub Actions OIDC
#
# Lets the workflow exchange a short-lived GitHub token for AWS credentials.
# No access keys are ever stored in the repo.
# ---------------------------------------------------------------------------

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # AWS validates the OIDC endpoint's certificate against its own trust store,
  # so this value is no longer security-critical; it is still required by the API.
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "github_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Scopes the role to this repo only. Without this condition ANY GitHub repo
    # in the world could assume the role. Multiple values are OR-ed.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.github_subjects
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "${var.project_name}-github-actions"
  description        = "Assumed by GitHub Actions to deploy the portfolio"
  assume_role_policy = data.aws_iam_policy_document.github_assume_role.json
}

/*
 * Broad on purpose: this role runs `terraform apply` for the whole infra stack,
 * so it needs to manage every service that stack touches. Narrow it once the
 * infrastructure stops changing shape.
 */
data "aws_iam_policy_document" "github_actions" {
  statement {
    effect = "Allow"
    actions = [
      "s3:*",
      "cloudfront:*",
      "lambda:*",
      "apigateway:*",
      "ses:*",
      "logs:*",
      "iam:GetRole",
      "iam:PassRole",
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:TagRole",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:PutRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:GetRolePolicy",
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_actions" {
  name   = "deploy"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions.json
}
