/*
 * Second project on the shared domain: guitarstore.<domain> in front of the
 * GuitarStore app.
 *
 * This lives in the portfolio stack because the stack owns the domain — the
 * Cloudflare zone and every record on it are managed here. GuitarStore itself
 * has no Terraform; its Lambda and HTTP API are created by a bash script in that
 * repo, so this reaches the API by name rather than managing it.
 *
 * Why an API Gateway custom domain rather than CloudFront, which is how the
 * portfolio serves its own API: GuitarStore is a fully dynamic ASP.NET app using
 * Cognito for auth. Fronting it with CloudFront would mean disabling the cache
 * and forwarding every header and cookie on nearly every path — all of the
 * moving parts, none of the benefit, and a real chance of breaking sessions.
 * A regional custom domain is the purpose-built tool for this.
 *
 * That choice costs a second certificate. Regional API Gateway domains read
 * certificates from their own region, so the us-east-1 wildcard in dns.tf cannot
 * be reused. This one is issued in var.aws_region for the exact subdomain, and
 * deliberately not as a wildcard: a second *.<domain> certificate in the same
 * account would validate through the same CNAME name as the existing one, and
 * Cloudflare rejects duplicate records.
 */

locals {
  guitarstore_enabled = local.domain_enabled && var.guitarstore_subdomain != ""
  guitarstore_fqdn    = local.guitarstore_enabled ? "${var.guitarstore_subdomain}.${var.domain_name}" : ""
}

/*
 * Looked up by name rather than hardcoded: the API is created by GuitarStore's
 * deploy script, and if it is ever torn down and recreated the id changes.
 */
data "aws_apigatewayv2_apis" "guitarstore" {
  count = local.guitarstore_enabled ? 1 : 0

  name          = var.guitarstore_api_name
  protocol_type = "HTTP"
}

resource "aws_acm_certificate" "guitarstore" {
  count = local.guitarstore_enabled ? 1 : 0

  domain_name       = local.guitarstore_fqdn
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "cloudflare_dns_record" "guitarstore_cert_validation" {
  for_each = local.guitarstore_enabled ? {
    for option in aws_acm_certificate.guitarstore[0].domain_validation_options :
    option.domain_name => option
  } : {}

  zone_id = var.cloudflare_zone_id
  name    = trimsuffix(each.value.resource_record_name, ".")
  type    = each.value.resource_record_type
  content = trimsuffix(each.value.resource_record_value, ".")
  ttl     = 60
  proxied = false
}

resource "aws_acm_certificate_validation" "guitarstore" {
  count = local.guitarstore_enabled ? 1 : 0

  certificate_arn = aws_acm_certificate.guitarstore[0].arn

  depends_on = [cloudflare_dns_record.guitarstore_cert_validation]
}

resource "aws_apigatewayv2_domain_name" "guitarstore" {
  count = local.guitarstore_enabled ? 1 : 0

  domain_name = local.guitarstore_fqdn

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.guitarstore[0].certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

/*
 * Maps the root of the custom domain onto the API's $default stage, so paths
 * reach the app unchanged.
 */
resource "aws_apigatewayv2_api_mapping" "guitarstore" {
  count = local.guitarstore_enabled ? 1 : 0

  api_id      = one(data.aws_apigatewayv2_apis.guitarstore[0].ids)
  domain_name = aws_apigatewayv2_domain_name.guitarstore[0].id
  stage       = "$default"
}

/*
 * Unproxied, like the portfolio records: API Gateway terminates TLS with the
 * certificate above.
 */
resource "cloudflare_dns_record" "guitarstore" {
  count = local.guitarstore_enabled ? 1 : 0

  zone_id = var.cloudflare_zone_id
  name    = local.guitarstore_fqdn
  type    = "CNAME"
  content = aws_apigatewayv2_domain_name.guitarstore[0].domain_name_configuration[0].target_domain_name
  ttl     = 1 # 1 = automatic
  proxied = false
}
