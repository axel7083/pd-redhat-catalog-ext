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

/**
 * Facets exposed by the catalog search (Hydra Solr `facet.field`).
 * The `id` facet is intentionally not supported: it multiplies the response size by ~6.
 */
export const FACET_FIELDS = [
  'partnerName',
  'build_categories_list',
  'architecture',
  'release_categories',
  'application_categories_list',
  'product_listings_names',
] as const;

export type FacetField = (typeof FACET_FIELDS)[number];

export const FACET_LABELS: Record<FacetField, string> = {
  partnerName: 'Publisher',
  build_categories_list: 'Image type',
  architecture: 'Architecture',
  release_categories: 'Release category',
  application_categories_list: 'Application category',
  product_listings_names: 'Product',
};

export const SORT_KEYS = ['relevance', 'last-modified', 'title-asc', 'title-desc'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: 'Relevance',
  'last-modified': 'Recently updated',
  'title-asc': 'Name (A-Z)',
  'title-desc': 'Name (Z-A)',
};

export const DEFAULT_PAGE_SIZE = 24;

export interface SearchQuery {
  /**
   * Free text. Empty or undefined means "everything".
   */
  text?: string;
  /**
   * Selected values per facet. Values of the same facet are OR-ed, facets are AND-ed.
   */
  filters?: Partial<Record<FacetField, string[]>>;
  /**
   * Repositories in the Deprecated release category are hidden unless this is true.
   */
  includeDeprecated?: boolean;
  /**
   * Boost the Hardened images (Red Hat Hardened Images, previously Hummingbird) to the top.
   */
  hardenedFirst?: boolean;
  sort?: SortKey;
  /**
   * 0-based page index.
   */
  page?: number;
  pageSize?: number;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface RepositorySummary {
  /**
   * Pyxis repository id.
   */
  id: string;
  /**
   * Registry as reported by the search index. Not necessarily the registry to pull from, see {@link PullTarget}.
   */
  registry: string;
  repository: string;
  title: string;
  publisher?: string;
  description?: string;
  logoUrl?: string;
  architectures: string[];
  tags: string[];
  buildCategories: string[];
  releaseCategories: string[];
  lastModified?: string;
  pushDate?: string;
  freshnessGrade?: string;
  catalogUrl?: string;
}

export interface SearchResult {
  total: number;
  page: number;
  pageSize: number;
  repositories: RepositorySummary[];
  facets: Record<FacetField, FacetValue[]>;
}
