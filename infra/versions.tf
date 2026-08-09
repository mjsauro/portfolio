terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  /*
   * Partial backend config: the bucket name is not known until ../bootstrap has
   * run, so it is supplied at init time.
   *
   *   terraform init -backend-config=backend.hcl
   *
   * Generate backend.hcl from the bootstrap output:
   *   terraform -chdir=../bootstrap output -raw backend_hcl > backend.hcl
   */
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform/infra"
    }
  }
}

/*
 * CloudFront reads ACM certificates from us-east-1 only, whatever var.aws_region
 * says. Used solely by the certificate in dns.tf.
 */
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform/infra"
    }
  }
}

/*
 * Authenticates from CLOUDFLARE_API_TOKEN in the environment. Deliberately not a
 * Terraform variable: variables land in state and in tfvars files, and this token
 * can edit DNS for the domain.
 */
provider "cloudflare" {}

data "aws_caller_identity" "current" {}
