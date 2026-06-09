# ---------------------------------------------------------------------------
# Game assets bucket — private, served exclusively through CloudFront OAC
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "tubieman" {
  bucket = var.s3_bucket_name

  tags = {
    Environment = var.environment
    Project     = "tubieman"
  }
}

resource "aws_s3_bucket_versioning" "tubieman" {
  bucket = aws_s3_bucket.tubieman.id

  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tubieman" {
  bucket = aws_s3_bucket.tubieman.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access — CloudFront OAC handles serving the content
resource "aws_s3_bucket_public_access_block" "tubieman" {
  bucket = aws_s3_bucket.tubieman.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Allow CloudFront OAC to read from the bucket
resource "aws_s3_bucket_policy" "tubieman" {
  bucket = aws_s3_bucket.tubieman.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.tubieman.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.tubieman.arn
          }
        }
      }
    ]
  })
}
