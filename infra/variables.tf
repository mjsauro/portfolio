variable "project_name" {
  description = "Short slug used to name resources. Must match the bootstrap value."
  type        = string
  default     = "mjsauro-portfolio"
}

variable "aws_region" {
  description = "Region for S3, Lambda, API Gateway, and SES. CloudFront is global."
  type        = string
  default     = "us-east-2"
}

variable "domain_name" {
  description = "Apex domain, e.g. mattsauro.com. Empty disables the custom domain entirely and the site stays on its *.cloudfront.net URL."
  type        = string
  default     = ""
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone hosting the domain's DNS. Found on the zone Overview page. Not a secret — the API token is supplied separately via CLOUDFLARE_API_TOKEN."
  type        = string
  default     = ""
}

variable "guitarstore_subdomain" {
  description = "Subdomain serving the GuitarStore app, e.g. \"guitarstore\". Empty disables it entirely. Requires domain_name to be set."
  type        = string
  default     = ""
}

variable "guitarstore_api_name" {
  description = "Name of the HTTP API created by GuitarStore's deploy script. Looked up rather than hardcoded so a recreated API is picked up."
  type        = string
  default     = "guitarstore-api"
}

variable "contact_to_address" {
  description = "Address that receives contact form submissions. Must be SES-verified while the account is in sandbox mode."
  type        = string
}

variable "contact_from_address" {
  description = "Envelope sender for contact emails. Must be an SES-verified identity."
  type        = string
}

variable "api_throttle_rate_limit" {
  description = "Steady-state requests per second allowed on the contact route."
  type        = number
  default     = 2
}

variable "api_throttle_burst_limit" {
  description = "Burst capacity on the contact route."
  type        = number
  default     = 5
}

variable "log_retention_days" {
  description = "CloudWatch retention for the Lambda log group."
  type        = number
  default     = 14
}
