variable "aws_region" {
  description = "AWS region for primary resources"
  type        = string
  default     = "us-east-2"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Custom domain for the Tubie-Man game"
  type        = string
  default     = "tubieman.tubietech.com"
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for game assets"
  type        = string
  default     = "tubieman.tubietech.com"
}
