output "site_url" {
  description = "Public URL of the portfolio."
  value       = local.domain_enabled ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "guitarstore_url" {
  description = "Public URL of the GuitarStore app, empty when the subdomain is disabled."
  value       = local.guitarstore_enabled ? "https://${local.guitarstore_fqdn}" : ""
}

output "site_bucket" {
  description = "Bucket the deploy workflow syncs into. Set as S3_BUCKET in GitHub."
  value       = aws_s3_bucket.site.id
}

output "cloudfront_distribution_id" {
  description = "Invalidation target. Set as CLOUDFRONT_DISTRIBUTION_ID in GitHub."
  value       = aws_cloudfront_distribution.site.id
}

output "api_invoke_url" {
  description = "Direct API Gateway URL. Use in web/proxy.conf.json for `ng serve`; the deployed site goes through CloudFront instead."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "ses_verification_note" {
  description = "Reminder that identities need manual confirmation."
  value       = "Check ${var.contact_from_address}${var.contact_to_address == var.contact_from_address ? "" : " and ${var.contact_to_address}"} for the SES verification email and click the link."
}
