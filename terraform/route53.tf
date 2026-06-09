# ---------------------------------------------------------------------------
# Look up the existing tubietech.com hosted zone
# ---------------------------------------------------------------------------
data "aws_route53_zone" "tubietech" {
  name         = "tubietech.com."
  private_zone = false
}

# ---------------------------------------------------------------------------
# Alias record — tubieman.tubietech.com → CloudFront distribution
# ---------------------------------------------------------------------------
resource "aws_route53_record" "tubieman" {
  zone_id = data.aws_route53_zone.tubietech.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.tubieman.domain_name
    zone_id                = aws_cloudfront_distribution.tubieman.hosted_zone_id
    evaluate_target_health = false
  }
}

# IPv6
resource "aws_route53_record" "tubieman_aaaa" {
  zone_id = data.aws_route53_zone.tubietech.zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.tubieman.domain_name
    zone_id                = aws_cloudfront_distribution.tubieman.hosted_zone_id
    evaluate_target_health = false
  }
}
