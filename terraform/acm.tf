# =============================================================================
# ACM Certificate — us-east-1 (required by CloudFront)
#
# TWO-STEP DEPLOYMENT PROCESS:
#
# Step 1 — Create the certificate and get the validation DNS records:
#   terraform apply -target=aws_acm_certificate.tubieman
#
#   Then read the outputs:
#   terraform output acm_validation_cname_name
#   terraform output acm_validation_cname_value
#
#   Go to Route 53 and manually add that CNAME record to the tubietech.com
#   hosted zone. AWS will pick it up automatically once it propagates
#   (typically within a few minutes).
#
# Step 2 — Validate the certificate and deploy everything else:
#   terraform apply
#
#   The aws_acm_certificate_validation resource will block until AWS confirms
#   the certificate is issued (usually 5–15 minutes after the CNAME is live),
#   then the CloudFront distribution and Route 53 alias record will be created.
# =============================================================================

resource "aws_acm_certificate" "tubieman" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = var.environment
    Project     = "tubieman"
  }
}

resource "aws_acm_certificate_validation" "tubieman" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.tubieman.arn
  validation_record_fqdns = [for record in aws_acm_certificate.tubieman.domain_validation_options : record.resource_record_name]
}
