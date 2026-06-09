terraform {
  backend "s3" {
    bucket = "tubie-tech-terraform-state"
    key    = "tubieman/terraform.tfstate"
    region = "us-east-2"
  }
}
