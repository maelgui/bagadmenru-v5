terraform {
  required_providers {
    scaleway = {
      source = "scaleway/scaleway"
    }
  }
  required_version = ">= 0.13"
}


provider "scaleway" {
  profile = "default"
}

data "scaleway_account_project" "bagadmenru_project" {
  project_id = "95c2183b-65bc-49b7-830f-7137041a2c40"
}

resource "scaleway_object_bucket" "staging_bucket" {
  name       = "bagadmenru5-data-staging"
  project_id = data.scaleway_account_project.bagadmenru_project.id

  lifecycle_rule {
    id      = "remove_temp_object"
    enabled = true

    tags = {
      "temp" = "true"
    }

    expiration {
      days = "2"
    }
  }

  lifecycle_rule {
    id      = "remove_old_object"
    enabled = true

    tags = {
      "to_delete" = "true"
    }

    expiration {
      days = "1"
    }
  }

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "POST", "PUT"]
    allowed_origins = ["https://beta.bagadmenru.bzh", "http://localhost:5173"]

  }
}

resource "scaleway_iam_application" "backend_application" {
  name        = "Bagad Backend App"
  description = "Backend de l'espace membre bagadmenru.bzh"
}

resource "scaleway_iam_api_key" "backend_api_key" {
  application_id     = scaleway_iam_application.backend_application.id
  description        = "Clé d'api pour l'accès au bucket par le backend de l'espace membre de bagadmenru.bzh"
  default_project_id = data.scaleway_account_project.bagadmenru_project.id
}

resource "scaleway_iam_policy" "backend_bucket_rw_policy" {
  name           = "backend_bucket_rw_policy"
  description    = "Permet au backend l'accès au bucket de stockage"
  application_id = scaleway_iam_application.backend_application.id
  rule {
    project_ids          = [data.scaleway_account_project.bagadmenru_project.id]
    permission_set_names = ["ObjectStorageObjectsRead", "ObjectStorageObjectsWrite", "ObjectStorageReadOnly", "ObjectStorageObjectsDelete"]
  }
}

output "s3_secret_key" {
  value     = scaleway_iam_api_key.backend_api_key.secret_key
  sensitive = true

}
output "s3_access_key" {
  value = scaleway_iam_api_key.backend_api_key.access_key
}
