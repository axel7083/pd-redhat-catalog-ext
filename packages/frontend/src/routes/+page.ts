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
import type { SearchQuery, SearchResult } from '@podman-desktop/extension-redhat-catalog-core-api';

import { catalogAPI } from '/@/api/client';
import { toSearchQuery } from '/@/utils/search-params';
import type { PageLoad } from './$types';

interface Data {
  query: SearchQuery;
  /**
   * Not awaited: the navigation completes immediately (search box, filters and URL update at once) and the
   * results render through `await` in a boundary, see SearchResults.svelte.
   */
  result: Promise<SearchResult>;
}

export const load: PageLoad = ({ url }): Data => {
  const query = toSearchQuery(url.searchParams);
  return { query, result: catalogAPI.search(query) };
};
