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
  FacetField,
  FacetValue,
  RepositorySummary,
  SearchQuery,
  SearchResult,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import { FACET_FIELDS } from '@podman-desktop/extension-redhat-catalog-core-api';
import { injectable } from 'inversify';

import { buildHydraSearchUrl, normalizePage } from '/@/hydra/hydra-query';
import type { HydraDoc } from '/@/hydra/hydra-schemas';
import {
  currentFreshnessGrade,
  HydraDocSchema,
  HydraResponseSchema,
  parseFreshnessGrades,
} from '/@/hydra/hydra-schemas';
import { fetchJson } from '/@/utils/http';
import { TtlCache } from '/@/utils/ttl-cache';

const SEARCH_TTL_MS = 5 * 60 * 1000;

/**
 * Search the catalog container repositories through Hydra Solr, the search backend of catalog.redhat.com.
 *
 * @remarks Hydra is an internal API without SLA or versioning: responses are validated with zod.
 */
@injectable()
export class HydraSearchService {
  readonly #cache = new TtlCache<SearchResult>(SEARCH_TTL_MS);

  search(query: SearchQuery): Promise<SearchResult> {
    const url = buildHydraSearchUrl(query);
    return this.#cache.get(url.toString(), () => this.#search(url, query));
  }

  async #search(url: URL, query: SearchQuery): Promise<SearchResult> {
    const raw = await fetchJson(url);
    const parsed = HydraResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Unexpected response from the catalog search: ${parsed.error.message}`);
    }

    const repositories: RepositorySummary[] = [];
    for (const doc of parsed.data.response.docs) {
      const result = HydraDocSchema.safeParse(doc);
      if (result.success) {
        repositories.push(toRepositorySummary(result.data));
      } else {
        console.warn('ignoring unexpected catalog search document', result.error.message);
      }
    }

    const facetFields = parsed.data.facet_counts?.facet_fields;
    const facets = Object.fromEntries(FACET_FIELDS.map(field => [field, facetFields?.[field] ?? []])) as Record<
      FacetField,
      FacetValue[]
    >;

    const { page, pageSize } = normalizePage(query);
    return {
      total: parsed.data.response.numFound,
      page,
      pageSize,
      repositories,
      facets,
    };
  }

  dispose(): void {
    this.#cache.clear();
  }
}

export function toRepositorySummary(doc: HydraDoc): RepositorySummary {
  return {
    id: doc.id,
    registry: doc.registry,
    repository: doc.repository,
    title: doc.allTitle ?? doc.repository,
    publisher: doc.partnerName,
    description: doc.display_data_short_description,
    logoUrl: doc.logo_uri,
    architectures: doc.architecture ?? [],
    tags: doc.repository_tags ?? [],
    buildCategories: doc.build_categories_list ?? [],
    releaseCategories: doc.release_categories ?? [],
    lastModified: doc.lastModifiedDate,
    pushDate: doc.push_date,
    freshnessGrade: currentFreshnessGrade(parseFreshnessGrades(doc.freshness_grades_json)),
    catalogUrl: doc.view_uri,
  };
}
