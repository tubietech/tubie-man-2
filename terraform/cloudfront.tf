# ---------------------------------------------------------------------------
# Origin Access Control — grants CloudFront permission to read from S3
# without making the bucket public
# ---------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "tubieman" {
  name                              = "tubieman-oac"
  description                       = "OAC for Tubie-Man S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ---------------------------------------------------------------------------
# CloudFront distribution
# ---------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "tubieman" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Tubie-Man game distribution"
  aliases             = [var.domain_name]
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.tubieman.bucket_regional_domain_name
    origin_id                = "S3TubieMan"
    origin_access_control_id = aws_cloudfront_origin_access_control.tubieman.id
  }

  default_cache_behavior {
    target_origin_id       = "S3TubieMan"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # Use the AWS-managed caching optimised policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # SPA fallback — 403/404 from S3 serve index.html so the app can handle routing
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.tubieman.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Environment = var.environment
    Project     = "tubieman"
  }
}
