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
import type { FacetField, SearchQuery, SortKey } from '@podman-desktop/extension-redhat-catalog-core-api';
import { DEFAULT_PAGE_SIZE, FACET_FIELDS } from '@podman-desktop/extension-redhat-catalog-core-api';

export const HYDRA_SEARCH_URL = 'https://access.redhat.com/hydra/rest/search/kcs';

/**
 * Agreed client identifier, rather than impersonating the catalog website (`ecosystem-catalog`).
 */
export const HYDRA_CLIENT = 'podman-desktop';

export const MAX_PAGE_SIZE = 100;

/**
 * Fields requested from the index. The document type is derived from this list (see hydra-schemas.ts).
 * `display_data_name`, `subcategories` and `type` are never returned by Hydra, `allTitle` is used instead.
 */
export const HYDRA_FIELDS = [
  'id',
  'partnerName',
  'view_uri',
  'display_data_short_description',
  'push_date',
  'logo_uri',
  'repository',
  'allTitle',
  'build_categories_list',
  'architecture',
  'repository_tags',
  'lastModifiedDate',
  'freshness_grades_json',
  'registry',
  'release_categories',
] as const;

export type HydraField = (typeof HYDRA_FIELDS)[number];

const SORTS: Record<SortKey, string> = {
  // `score desc` first so the Hardened boost (bq) applies; with `*:*` all scores are equal and
  // the order falls back to the last modified date.
  relevance: 'score desc,lastModifiedDate desc',
  'last-modified': 'lastModifiedDate desc',
  'title-asc': 'sortTitle asc',
  'title-desc': 'sortTitle desc',
};

const HARDENED_BOOST = 'build_categories_list:Hardened^1000';

/**
 * Quote a value for a Solr field query.
 */
export function quoteSolrValue(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function tag(field: FacetField): string {
  return `${field}_tag`;
}

/**
 * Multi-select facet filter: tagging the fq lets the facet of the same field exclude it ({!ex=...}),
 * so the other values of a facet keep their counts once one value is selected.
 */
export function facetFilter(field: FacetField, values: string[]): string {
  return `{!tag=${tag(field)}}${field}:(${values.map(quoteSolrValue).join(' OR ')})`;
}

export function normalizePage(query: SearchQuery): { page: number; pageSize: number } {
  const pageSize = Math.min(Math.max(1, Math.floor(query.pageSize ?? DEFAULT_PAGE_SIZE)), MAX_PAGE_SIZE);
  const page = Math.max(0, Math.floor(query.page ?? 0));
  return { page, pageSize };
}

export function buildHydraSearchParams(query: SearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  const { page, pageSize } = normalizePage(query);
  const text = query.text?.trim();

  params.set('redhat_client', HYDRA_CLIENT);
  params.append('fq', 'language:(en)');
  params.append('fq', '-documentKind:Cve');
  params.append('fq', 'documentKind:"ContainerRepository"');
  if (!query.includeDeprecated) {
    params.append('fq', '-release_categories:"Deprecated"');
  }

  for (const field of FACET_FIELDS) {
    const values = query.filters?.[field]?.filter(value => value.length > 0);
    if (values?.length) params.append('fq', facetFilter(field, values));
  }

  params.set('q', text?.length ? text : '*:*');
  params.set('enableElevation', 'false');
  params.set('altQueryFields', 'true');
  params.set('wt', 'json');
  params.set('start', String(page * pageSize));
  params.set('rows', String(pageSize));
  params.set('sort', SORTS[query.sort ?? 'relevance']);
  if (query.hardenedFirst) {
    params.set('bq', HARDENED_BOOST);
  }
  params.set('fl', HYDRA_FIELDS.join(','));

  params.set('facet', 'true');
  params.set('facet.mincount', '1');
  params.set('facet.limit', '-1');
  params.set('facet.sort', 'count');
  for (const field of FACET_FIELDS) {
    params.append('facet.field', `{!ex=${tag(field)}}${field}`);
  }

  return params;
}

export function buildHydraSearchUrl(query: SearchQuery): URL {
  const url = new URL(HYDRA_SEARCH_URL);
  url.search = buildHydraSearchParams(query).toString();
  return url;
}
