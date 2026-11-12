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
import type {
  ImageFile,
  ImagePackage,
  RepositoryDetail,
  SearchQuery,
  SearchResult,
  TagGroup,
  Vulnerability,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import { CatalogApi } from '@podman-desktop/extension-redhat-catalog-core-api';
import { inject, injectable } from 'inversify';

import { CatalogService } from '/@/services/catalog-service';

@injectable()
export class CatalogApiImpl extends CatalogApi {
  constructor(
    @inject(CatalogService)
    protected readonly catalog: CatalogService,
  ) {
    super();
  }

  override search(query: SearchQuery): Promise<SearchResult> {
    return this.catalog.search(query);
  }

  override getRepository(registry: string, repository: string): Promise<RepositoryDetail> {
    return this.catalog.getRepository(registry, repository);
  }

  override prefetchRepository(registry: string, repository: string): Promise<void> {
    return this.catalog.prefetchRepository(registry, repository);
  }

  override prefetchTabs(registry: string, repository: string, imageId: string): Promise<void> {
    return this.catalog.prefetchTabs(registry, repository, imageId);
  }

  override getTags(registry: string, repository: string): Promise<TagGroup[]> {
    return this.catalog.getTags(registry, repository);
  }

  override getVulnerabilities(imageId: string): Promise<Vulnerability[]> {
    return this.catalog.getVulnerabilities(imageId);
  }

  override getPackages(imageId: string): Promise<ImagePackage[]> {
    return this.catalog.getPackages(imageId);
  }

  override getContainerfile(imageId: string): Promise<ImageFile | undefined> {
    return this.catalog.getContainerfile(imageId);
  }
}
