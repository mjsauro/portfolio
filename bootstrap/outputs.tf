output "state_bucket" {
  description = "Bucket holding remote state for the infra stack."
  value       = aws_s3_bucket.state.id
}

output "github_actions_role_arn" {
  description = "Set this as the AWS_ROLE_ARN repository variable in GitHub."
  value       = aws_iam_role.github_actions.arn
}

output "backend_hcl" {
  description = "Paste into infra/backend.hcl, then run: terraform init -backend-config=backend.hcl"
  value       = <<-EOT
    bucket       = "${aws_s3_bucket.state.id}"
    key          = "infra/terraform.tfstate"
    region       = "${var.aws_region}"
    encrypt      = true
    use_lockfile = true
  EOT
}

output "backend_hcl_bootstrap" {
  description = "This module's own backend. Write to bootstrap/backend.hcl, then: terraform init -migrate-state -backend-config=backend.hcl"
  value       = <<-EOT
    bucket       = "${aws_s3_bucket.state.id}"
    key          = "bootstrap/terraform.tfstate"
    region       = "${var.aws_region}"
    encrypt      = true
    use_lockfile = true
  EOT
}
