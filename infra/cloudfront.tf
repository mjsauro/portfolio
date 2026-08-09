/*
 * CloudFront distribution with two origins:
 *
 *   default  -> S3 (the prerendered site)
 *   /api/*   -> API Gateway (the contact form)
 *
 * Putting the API behind the same distribution means the browser only ever
 * talks to one origin, so there is no CORS preflight and the frontend can use
 * a relative /api/contact URL.
 */

locals {
  s3_origin_id  = "s3-site"
  api_origin_id = "apigw-contact"
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.project_name}-oac"
  description                       = "Signs CloudFront requests to the private site bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "rewrite_index" {
  name    = "${var.project_name}-rewrite-index"
  runtime = "cloudfront-js-2.0"
  comment = "Redirects www to the apex, then maps clean URLs onto prerendered index.html files"
  publish = true
  code    = file("${path.module}/functions/rewrite-index.js")
}

# Managed policies, looked up by name so the IDs are not hardcoded.
data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${var.project_name}-security-headers"
  comment = "Baseline security headers for the site"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = false
      override                   = true
    }

    content_security_policy {
      /*
       * 'unsafe-inline' is required by two things Angular emits: the critical
       * CSS it inlines during prerender, and the event-replay script that
       * hydration installs. Tightening this means switching Angular to
       * nonce-based CSP (ngCspNonce), which needs a per-request nonce and
       * therefore a Lambda@Edge — not worth it for a static site.
       */
      content_security_policy = join("; ", [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "object-src 'none'",
      ])
      override = true
    }
  }
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} portfolio"
  default_root_object = "index.html"

  # Empty unless a custom domain is configured — see dns.tf.
  aliases = local.site_aliases
  # North America + Europe only. Widen if you start getting traffic elsewhere.
  price_class = "PriceClass_100"

  origin {
    origin_id                = local.s3_origin_id
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  origin {
    origin_id   = local.api_origin_id
    domain_name = "${aws_apigatewayv2_api.contact.id}.execute-api.${var.aws_region}.amazonaws.com"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite_index.arn
    }
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = local.api_origin_id
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # Never cache API responses, and forward everything except Host — API
    # Gateway rejects requests carrying the CloudFront Host header.
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id

    # No index-rewrite function here: /api/contact must reach the origin as-is.
  }

  /*
   * S3 returns 403 (not 404) for a missing key when access is via OAC, because
   * the policy only grants s3:GetObject on objects that exist. Both map to the
   * prerendered 404 page.
   */
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/not-found/index.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/not-found/index.html"
    error_caching_min_ttl = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  /*
   * Exactly one of these renders. Without a custom domain the distribution keeps
   * its free *.cloudfront.net certificate; with one it serves the ACM wildcard
   * from us-east-1.
   */
  dynamic "viewer_certificate" {
    for_each = local.domain_enabled ? [] : [1]

    content {
      cloudfront_default_certificate = true
    }
  }

  dynamic "viewer_certificate" {
    for_each = local.domain_enabled ? [1] : []

    content {
      acm_certificate_arn      = aws_acm_certificate_validation.site[0].certificate_arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }
}
