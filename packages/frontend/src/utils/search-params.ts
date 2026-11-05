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
import { FACET_FIELDS, SORT_KEYS } from '@podman-desktop/extension-redhat-catalog-core-api';

/**
 * The explore page state lives in the URL, so it survives a webview reload (see saveRouterState)
 * and the browser history works.
 *
 * - `q`: free text
 * - `f.<facet>`: selected values, repeated
 * - `sort`, `page` (1-based), `deprecated=1`, `hardened=1`
 */
const FILTER_PREFIX = 'f.';

export function toSearchQuery(params: URLSearchParams): SearchQuery {
  const filters: Partial<Record<FacetField, string[]>> = {};
  for (const field of FACET_FIELDS) {
    const values = params.getAll(`${FILTER_PREFIX}${field}`);
    if (values.length) filters[field] = values;
  }
  const sort = params.get('sort');
  const page = Number.parseInt(params.get('page') ?? '1', 10);

  return {
    text: params.get('q') ?? undefined,
    filters,
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : 'relevance',
    page: Number.isFinite(page) && page > 0 ? page - 1 : 0,
    includeDeprecated: params.get('deprecated') === '1',
    hardenedFirst: params.get('hardened') === '1',
  };
}

export function toSearchParams(query: SearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  const text = query.text?.trim();
  if (text) params.set('q', text);
  for (const field of FACET_FIELDS) {
    for (const value of query.filters?.[field] ?? []) params.append(`${FILTER_PREFIX}${field}`, value);
  }
  if (query.sort && query.sort !== 'relevance') params.set('sort', query.sort);
  if (query.page) params.set('page', String(query.page + 1));
  if (query.includeDeprecated) params.set('deprecated', '1');
  if (query.hardenedFirst) params.set('hardened', '1');
  return params;
}

/**
 * Apply a change to a query. Any change other than the page resets the pagination.
 */
export function updateQuery(query: SearchQuery, change: Partial<SearchQuery>): SearchQuery {
  return { ...query, page: 0, ...change };
}

export function toggleFilter(query: SearchQuery, field: FacetField, value: string): SearchQuery {
  const current = query.filters?.[field] ?? [];
  const next = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
  return updateQuery(query, { filters: { ...query.filters, [field]: next } });
}

export function hasFilters(query: SearchQuery): boolean {
  return Object.values(query.filters ?? {}).some(values => values.length > 0);
}
