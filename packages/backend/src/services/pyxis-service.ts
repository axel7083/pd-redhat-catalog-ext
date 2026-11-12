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
import { injectable } from 'inversify';

import type {
  ImageFilesQuery,
  ImagePackagesQuery,
  ImageVulnerabilitiesQuery,
  RepositoryDetailQuery,
  RepositoryTagsQuery,
  TypedDocumentString,
} from '/@/pyxis/generated/graphql';
import {
  ImageFilesDocument,
  ImagePackagesDocument,
  ImageVulnerabilitiesDocument,
  RepositoryDetailDocument,
  RepositoryTagsDocument,
} from '/@/pyxis/queries';
import { fetchJson } from '/@/utils/http';
import { TtlCache } from '/@/utils/ttl-cache';

/**
 * The trailing slash is required: without it the server redirects and the POST becomes a GET.
 */
export const PYXIS_GRAPHQL_URL = 'https://catalog.redhat.com/api/containers/graphql/';

const DETAIL_TTL_MS = 10 * 60 * 1000;
const IMAGE_TTL_MS = 30 * 60 * 1000;

/**
 * Number of recent images fetched with the repository: each architecture of a build is one image, so 8 images
 * cover the latest build of every architecture (amd64, arm64, ppc64le, s390x). Measured: ~0.5s, where 100 images
 * with their labels took 3.6s.
 */
export const REPOSITORY_IMAGES_PAGE_SIZE = 8;
/**
 * Number of images of the tag history: the latest ~25 builds of a 4-architecture repository (~0.9s).
 */
export const TAGS_IMAGES_PAGE_SIZE = 100;
const VULNERABILITIES_PAGE_SIZE = 250;
const MAX_VULNERABILITIES = 2_000;

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Pyxis responses report errors per query in an `error` object rather than failing the request.
 */
export interface PyxisError {
  status: number | null;
  detail: string | null;
}

export class PyxisRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'PyxisRequestError';
  }
}

export function throwOnPyxisError(operation: string, error: PyxisError | null | undefined): void {
  if (!error) return;
  throw new PyxisRequestError(
    `${operation} failed: ${error.detail ?? 'unknown error'} (${error.status ?? 'no status'})`,
    error.status ?? undefined,
  );
}

type Vulnerability = NonNullable<
  NonNullable<NonNullable<ImageVulnerabilitiesQuery['find_image_vulnerabilities']>['data']>[number]
>;
type Rpm = NonNullable<
  NonNullable<NonNullable<NonNullable<ImagePackagesQuery['get_image_rpm_manifest']>['data']>['rpms']>[number]
>;
type File = NonNullable<NonNullable<NonNullable<ImageFilesQuery['find_image_files']>['data']>[number]>;

/**
 * Typed client of the Pyxis GraphQL API (catalog.redhat.com/api/containers/graphql/), anonymous access.
 *
 * @remarks the operations are generated from `src/pyxis/queries.ts` and validated against the schema snapshot.
 */
@injectable()
export class PyxisService {
  readonly #repositories = new TtlCache<RepositoryDetailQuery>(DETAIL_TTL_MS, 100);
  readonly #tags = new TtlCache<RepositoryTagsQuery>(DETAIL_TTL_MS, 50);
  readonly #vulnerabilities = new TtlCache<Vulnerability[]>(IMAGE_TTL_MS, 50);
  readonly #packages = new TtlCache<Rpm[]>(IMAGE_TTL_MS, 50);
  readonly #files = new TtlCache<File[]>(IMAGE_TTL_MS, 50);

  async execute<TResult, TVariables>(
    document: TypedDocumentString<TResult, TVariables>,
    variables: TVariables,
  ): Promise<TResult> {
    const response = (await fetchJson(PYXIS_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: document.toString(), variables }),
    })) as GraphQLResponse<TResult>;

    if (response.errors?.length) {
      throw new PyxisRequestError(response.errors.map(({ message }) => message).join('; '));
    }
    if (!response.data) throw new PyxisRequestError('empty response from the catalog API');
    return response.data;
  }

  getRepository(registry: string, repository: string): Promise<RepositoryDetailQuery> {
    return this.#repositories.get(`${registry}/${repository}`, () =>
      this.execute(RepositoryDetailDocument, { registry, repository, imagesPageSize: REPOSITORY_IMAGES_PAGE_SIZE }),
    );
  }

  getTags(registry: string, repository: string): Promise<RepositoryTagsQuery> {
    return this.#tags.get(`${registry}/${repository}`, async () => {
      const result = await this.execute(RepositoryTagsDocument, {
        registry,
        repository,
        pageSize: TAGS_IMAGES_PAGE_SIZE,
      });
      throwOnPyxisError('tags', result.find_repository_images_by_registry_path?.error);
      return result;
    });
  }

  hasRepository(registry: string, repository: string): boolean {
    return this.#repositories.has(`${registry}/${repository}`);
  }

  getVulnerabilities(imageId: string): Promise<Vulnerability[]> {
    return this.#vulnerabilities.get(imageId, async () => {
      const vulnerabilities: Vulnerability[] = [];
      let page = 0;
      let complete = false;
      while (!complete) {
        const { find_image_vulnerabilities: result } = await this.execute(ImageVulnerabilitiesDocument, {
          id: imageId,
          page,
          pageSize: VULNERABILITIES_PAGE_SIZE,
        });
        throwOnPyxisError('vulnerabilities', result?.error);
        const data = (result?.data ?? []).filter((item): item is Vulnerability => !!item);
        vulnerabilities.push(...data);
        page++;
        complete =
          data.length < VULNERABILITIES_PAGE_SIZE ||
          vulnerabilities.length >= (result?.total ?? 0) ||
          vulnerabilities.length >= MAX_VULNERABILITIES;
      }
      return vulnerabilities;
    });
  }

  getPackages(imageId: string): Promise<Rpm[]> {
    return this.#packages.get(imageId, async () => {
      const { get_image_rpm_manifest: result } = await this.execute(ImagePackagesDocument, { id: imageId });
      // images without an RPM manifest (e.g. scratch-based partner images) answer with a 404 error
      if (result?.error?.status === 404) return [];
      throwOnPyxisError('packages', result?.error);
      return (result?.data?.rpms ?? []).filter((rpm): rpm is Rpm => !!rpm);
    });
  }

  getFiles(imageId: string): Promise<File[]> {
    return this.#files.get(imageId, async () => {
      const { find_image_files: result } = await this.execute(ImageFilesDocument, { id: imageId });
      if (result?.error?.status === 404) return [];
      throwOnPyxisError('files', result?.error);
      return (result?.data ?? []).filter((file): file is File => !!file);
    });
  }

  dispose(): void {
    this.#repositories.clear();
    this.#tags.clear();
    this.#vulnerabilities.clear();
    this.#packages.clear();
    this.#files.clear();
  }
}
