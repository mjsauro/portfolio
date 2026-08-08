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

data "aws_caller_identity" "current" {}
