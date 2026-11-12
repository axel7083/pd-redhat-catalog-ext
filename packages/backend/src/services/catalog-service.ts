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
import type { TelemetryLogger } from '@podman-desktop/api';
import type {
  ImageFile,
  ImagePackage,
  RepositoryDetail,
  SearchQuery,
  SearchResult,
  TagGroup,
  Vulnerability,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import { inject, injectable } from 'inversify';

import {
  toContainerfile,
  toPackages,
  toRepositoryDetail,
  toRepositoryTags,
  toVulnerabilities,
} from '/@/catalog/repository-mapper';
import { TelemetryLoggerSymbol } from '/@/inject/symbol';
import { HydraSearchService } from '/@/services/hydra-search-service';
import { PyxisService } from '/@/services/pyxis-service';
import { TelemetryEvents } from '/@/utils/telemetry-events';

@injectable()
export class CatalogService {
  constructor(
    @inject(HydraSearchService)
    protected readonly hydra: HydraSearchService,
    @inject(PyxisService)
    protected readonly pyxis: PyxisService,
    @inject(TelemetryLoggerSymbol)
    protected readonly telemetryLogger: TelemetryLogger,
  ) {}

  async search(query: SearchQuery): Promise<SearchResult> {
    const result = await this.hydra.search(query);
    // only report the shape of the query, not the searched text
    this.telemetryLogger.logUsage(TelemetryEvents.SEARCH, {
      hasText: !!query.text?.trim(),
      filters: Object.entries(query.filters ?? {})
        .filter(([, values]) => values.length > 0)
        .map(([field]) => field),
      includeDeprecated: !!query.includeDeprecated,
      hardenedFirst: !!query.hardenedFirst,
      sort: query.sort ?? 'relevance',
      page: result.page,
      total: result.total,
    });
    return result;
  }

  async getRepository(registry: string, repository: string): Promise<RepositoryDetail> {
    const telemetry: Record<string, unknown> = { cached: this.pyxis.hasRepository(registry, repository) };
    try {
      const detail = toRepositoryDetail(registry, repository, await this.pyxis.getRepository(registry, repository));
      telemetry['pullReason'] = detail.pullTarget.reason;
      return detail;
    } catch (err: unknown) {
      telemetry['error'] = String(err);
      throw err;
    } finally {
      this.telemetryLogger.logUsage(TelemetryEvents.VIEW_REPOSITORY, telemetry);
    }
  }

  async prefetchRepository(registry: string, repository: string): Promise<void> {
    await this.pyxis.getRepository(registry, repository);
  }

  async prefetchTabs(registry: string, repository: string, imageId: string): Promise<void> {
    // failures are ignored: the tab fetches again, and shows the error, when opened
    await Promise.allSettled([
      this.pyxis.getTags(registry, repository),
      this.pyxis.getVulnerabilities(imageId),
      this.pyxis.getPackages(imageId),
      this.pyxis.getFiles(imageId),
    ]);
  }

  async getTags(registry: string, repository: string): Promise<TagGroup[]> {
    return toRepositoryTags(repository, await this.pyxis.getTags(registry, repository));
  }

  async getVulnerabilities(imageId: string): Promise<Vulnerability[]> {
    return toVulnerabilities(await this.pyxis.getVulnerabilities(imageId));
  }

  async getPackages(imageId: string): Promise<ImagePackage[]> {
    return toPackages(await this.pyxis.getPackages(imageId));
  }

  async getContainerfile(imageId: string): Promise<ImageFile | undefined> {
    return toContainerfile(await this.pyxis.getFiles(imageId));
  }
}
