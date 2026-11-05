/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type RepositoryDetailQueryVariables = Exact<{
  registry: string;
  repository: string;
  imagesPageSize: number;
}>;


export type RepositoryDetailQuery = { get_repository_by_registry_path: { error: { status: number | null, detail: string | null } | null, data: { _id: string | null, registry: string | null, repository: string | null, vendor_label: string | null, requires_terms: boolean | null, eol_date: string | null, release_categories: Array<string | null> | null, build_categories: Array<string | null> | null, application_categories: Array<string | null> | null, content_stream_tags: Array<string | null> | null, replaced_by_repository_name: string | null, ui_get_this_image_override: string | null, display_data: { name: string | null, short_description: string | null, long_description: string | null, long_description_markdown: string | null } | null, documentation_links: Array<{ title: string | null, type: string | null, url: string | null } | null> | null } | null } | null, find_repository_images_by_registry_path: { total: number | null, error: { status: number | null, detail: string | null } | null, data: Array<{ _id: string | null, architecture: string | null, image_id: string | null, docker_image_digest: string | null, sum_layer_size_bytes: number | null, freshness_grades: Array<{ grade: string | null, start_date: string | null, end_date: string | null } | null> | null, parsed_data: { env_variables: Array<string | null> | null, user: string | null, ports: string | null, labels: Array<{ name: string | null, value: string | null } | null> | null } | null, repositories: Array<{ registry: string | null, repository: string | null, manifest_list_digest: string | null, manifest_schema2_digest: string | null, push_date: string | null, published: boolean | null, tags: Array<{ name: string | null, added_date: string | null } | null> | null } | null> | null } | null> | null } | null };

export type ImageVulnerabilitiesQueryVariables = Exact<{
  id: string;
  page: number;
  pageSize: number;
}>;


export type ImageVulnerabilitiesQuery = { find_image_vulnerabilities: { total: number | null, error: { status: number | null, detail: string | null } | null, data: Array<{ cve_id: string | null, severity: string | null, advisory_id: string | null, advisory_type: string | null, public_date: string | null, affected_packages: Array<{ name: string | null, version: string | null, arch: string | null } | null> | null } | null> | null } | null };

export type ImagePackagesQueryVariables = Exact<{
  id: string;
}>;


export type ImagePackagesQuery = { get_image_rpm_manifest: { error: { status: number | null, detail: string | null } | null, data: { rpms: Array<{ name: string | null, version: string | null, release: string | null, epoch: string | null, architecture: string | null, summary: string | null } | null> | null } | null } | null };

export type ImageFilesQueryVariables = Exact<{
  id: string;
}>;


export type ImageFilesQuery = { find_image_files: { error: { status: number | null, detail: string | null } | null, data: Array<{ filename: string | null, key: string | null, content: string | null } | null> | null } | null };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const RepositoryDetailDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<RepositoryDetailQuery, RepositoryDetailQueryVariables>;
export const ImageVulnerabilitiesDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<ImageVulnerabilitiesQuery, ImageVulnerabilitiesQueryVariables>;
export const ImagePackagesDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<ImagePackagesQuery, ImagePackagesQueryVariables>;
export const ImageFilesDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<ImageFilesQuery, ImageFilesQueryVariables>;