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
  result?: SearchResult;
  error?: string;
}

/**
 * The search is awaited: during a new search SvelteKit keeps the current results on screen
 * (see `navigating` in +page.svelte) instead of flashing a skeleton for every keystroke.
 */
export const load: PageLoad = async ({ url }): Promise<Data> => {
  const query = toSearchQuery(url.searchParams);
  try {
    return { query, result: await catalogAPI.search(query) };
  } catch (err: unknown) {
    return { query, error: err instanceof Error ? err.message : String(err) };
  }
};
