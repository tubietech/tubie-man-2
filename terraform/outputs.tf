output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.tubieman.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (use this to invalidate the cache after deploys)"
  value       = aws_cloudfront_distribution.tubieman.id
}

output "s3_bucket_name" {
  description = "S3 bucket to upload the Vite build output to"
  value       = aws_s3_bucket.tubieman.id
}

output "game_url" {
  description = "Public URL for the game"
  value       = "https://${var.domain_name}"
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.tubieman.arn
}

output "acm_validation_cname_name" {
  description = "CNAME record name to add to Route 53 for certificate validation (Step 1)"
  value       = tolist(aws_acm_certificate.tubieman.domain_validation_options)[0].resource_record_name
}

output "acm_validation_cname_value" {
  description = "CNAME record value to add to Route 53 for certificate validation (Step 1)"
  value       = tolist(aws_acm_certificate.tubieman.domain_validation_options)[0].resource_record_value
}
