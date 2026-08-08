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
