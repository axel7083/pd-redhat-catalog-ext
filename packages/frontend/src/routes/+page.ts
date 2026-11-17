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
import type { SearchResult } from '@podman-desktop/extension-redhat-catalog-core-api';

import { catalogAPI } from '/@/api/client';
import type { PageLoad } from './$types';

interface Data {
  /**
   * The catalog without a search: only its facet counts are used (the categories), not the repositories.
   */
  catalog: Promise<SearchResult>;
}

export const load: PageLoad = (): Data => {
  return { catalog: catalogAPI.search({ page: 0, pageSize: 1 }) };
};
