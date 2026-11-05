/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/
import { graphql } from './generated';

/**
 * Pyxis GraphQL operations used by the extension. Every document is validated against
 * `pyxis/schema.graphql` at codegen time (`pnpm pyxis:codegen`), and result types match the selected fields.
 */

export const RepositoryDetailDocument = graphql(`
  query RepositoryDetail($registry: String!, $repository: String!, $imagesPageSize: Int!) {
    get_repository_by_registry_path(registry: $registry, repository: $repository) {
      error {
        status
        detail
      }
      data {
        _id
        registry
        repository
        vendor_label
        requires_terms
        eol_date
        display_data {
          name
          short_description
          long_description
          long_description_markdown
        }
        documentation_links {
          title
          type
          url
        }
        release_categories
        build_categories
        application_categories
        content_stream_tags
        replaced_by_repository_name
        ui_get_this_image_override
      }
    }
    find_repository_images_by_registry_path(
      registry: $registry
      repository: $repository
      page_size: $imagesPageSize
      sort_by: [{ field: "repositories.push_date", order: DESC }]
    ) {
      total
      error {
        status
        detail
      }
      data {
        _id
        architecture
        image_id
        docker_image_digest
        sum_layer_size_bytes
        freshness_grades {
          grade
          start_date
          end_date
        }
        parsed_data {
          labels {
            name
            value
          }
          env_variables
          user
          ports
        }
        repositories {
          registry
          repository
          manifest_list_digest
          manifest_schema2_digest
          push_date
          published
          tags {
            name
            added_date
          }
        }
      }
    }
  }
`);

export const ImageVulnerabilitiesDocument = graphql(`
  query ImageVulnerabilities($id: String!, $page: Int!, $pageSize: Int!) {
    find_image_vulnerabilities(id: $id, page: $page, page_size: $pageSize) {
      total
      error {
        status
        detail
      }
      data {
        cve_id
        severity
        advisory_id
        advisory_type
        public_date
        affected_packages {
          name
          version
          arch
        }
      }
    }
  }
`);

export const ImagePackagesDocument = graphql(`
  query ImagePackages($id: String!) {
    get_image_rpm_manifest(id: $id) {
      error {
        status
        detail
      }
      data {
        rpms {
          name
          version
          release
          epoch
          architecture
          summary
        }
      }
    }
  }
`);

export const ImageFilesDocument = graphql(`
  query ImageFiles($id: ObjectIDFilterScalar!) {
    find_image_files(id: $id) {
      error {
        status
        detail
      }
      data {
        filename
        key
        content
      }
    }
  }
`);
