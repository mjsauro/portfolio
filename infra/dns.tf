/*
 * Custom domain.
 *
 * The domain is registered at Cloudflare, and Cloudflare Registrar requires its
 * own nameservers — custom nameservers are not offered, so a Route53 hosted zone
 * is not an option. DNS therefore lives in Cloudflare and is managed here with
 * the Cloudflare provider; AWS still issues the certificate and serves the site.
 *
 * Because Cloudflare is already authoritative for the domain, this applies in a
 * single pass: the validation record resolves the moment it is created, ACM
 * issues, and CloudFront picks up the certificate.
 *
 * Authentication is by CLOUDFLARE_API_TOKEN in the environment — never a
 * variable, so the token cannot end up in state or in a tfvars file.
 */

locals {
  domain_enabled = var.domain_name != ""

  site_aliases = local.domain_enabled ? [var.domain_name, "www.${var.domain_name}"] : []
}

/*
 * One wildcard certificate covers the apex and every subdomain, so adding
 * projects later (guitarstore.<domain>, …) needs no certificate work.
 *
 * CloudFront reads certificates from us-east-1 only, regardless of
 * var.aws_region — hence the aliased provider.
 */
resource "aws_acm_certificate" "site" {
  count    = local.domain_enabled ? 1 : 0
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

/*
 * ACM validates the apex and the wildcard through a single, identical CNAME, so
 * only the apex entry is kept — creating both would be a duplicate record, which
 * Cloudflare rejects (Route53 tolerated it via allow_overwrite).
 *
 * The filter is on domain_name rather than the record name because only
 * domain_name is known at plan time; the record values are computed.
 */
resource "cloudflare_dns_record" "cert_validation" {
  for_each = local.domain_enabled ? {
    for option in aws_acm_certificate.site[0].domain_validation_options :
    option.domain_name => option if option.domain_name == var.domain_name
  } : {}

  zone_id = var.cloudflare_zone_id
  name    = trimsuffix(each.value.resource_record_name, ".")
  type    = each.value.resource_record_type
  content = trimsuffix(each.value.resource_record_value, ".")
  ttl     = 60
  proxied = false
}

resource "aws_acm_certificate_validation" "site" {
  count    = local.domain_enabled ? 1 : 0
  provider = aws.us_east_1

  certificate_arn = aws_acm_certificate.site[0].arn

  /*
   * validation_record_fqdns is omitted deliberately: it only accepts Route53
   * records. With DNS elsewhere this resource simply blocks until ACM observes
   * the record above and issues the certificate.
   */
  depends_on = [cloudflare_dns_record.cert_validation]
}

/*
 * Cloudflare flattens CNAMEs at the zone apex, so the apex points straight at
 * CloudFront — no ALIAS-record special case of the kind Route53 requires.
 *
 * proxied = false on both: CloudFront terminates TLS with the ACM certificate
 * above. Turning the proxy on would put Cloudflare's CDN in front of CloudFront,
 * serving Cloudflare's own certificate and making the ACM one invisible to
 * browsers — two CDNs deep, for no benefit.
 */
resource "cloudflare_dns_record" "apex" {
  count = local.domain_enabled ? 1 : 0

  zone_id = var.cloudflare_zone_id
  name    = var.domain_name
  type    = "CNAME"
  content = aws_cloudfront_distribution.site.domain_name
  ttl     = 1 # 1 = automatic
  proxied = false
}

/*
 * www points at the same distribution, which then 301s it to the apex — the
 * viewer-request function branches on the Host header. DNS cannot do this on
 * its own: a CNAME resolves a name, it does not redirect a request, so the
 * hostname has to reach CloudFront before anything can answer with a 301.
 */
resource "cloudflare_dns_record" "www" {
  count = local.domain_enabled ? 1 : 0

  zone_id = var.cloudflare_zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  content = aws_cloudfront_distribution.site.domain_name
  ttl     = 1 # 1 = automatic
  proxied = false
}
