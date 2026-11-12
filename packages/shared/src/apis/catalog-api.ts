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
import type { SearchQuery, SearchResult } from '../models/search';
import type { ImageFile, ImagePackage, RepositoryDetail, TagGroup, Vulnerability } from '../models/repository';

export abstract class CatalogApi {
  static readonly CHANNEL: string = 'catalog-api';

  /**
   * Search the Red Hat Ecosystem Catalog container repositories.
   */
  abstract search(query: SearchQuery): Promise<SearchResult>;

  /**
   * Get the details of a repository, including its resolved pull target and recent images.
   */
  abstract getRepository(registry: string, repository: string): Promise<RepositoryDetail>;

  /**
   * Prefetch the details of a repository (e.g. on card hover) so the detail page opens from cache.
   */
  abstract prefetchRepository(registry: string, repository: string): Promise<void>;

  /**
   * Warm the backend cache with the data of the detail tabs (tags, and vulnerabilities, packages and
   * Containerfile of an image), so opening a tab does not wait on the network.
   */
  abstract prefetchTabs(registry: string, repository: string, imageId: string): Promise<void>;

  /**
   * Recent builds of a repository, grouped by manifest list digest, newest first.
   */
  abstract getTags(registry: string, repository: string): Promise<TagGroup[]>;

  abstract getVulnerabilities(imageId: string): Promise<Vulnerability[]>;

  abstract getPackages(imageId: string): Promise<ImagePackage[]>;

  /**
   * The Containerfile (build file) of an image, if published.
   */
  abstract getContainerfile(imageId: string): Promise<ImageFile | undefined>;
}
