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
import type { RepositoryDetail } from '@podman-desktop/extension-redhat-catalog-core-api';

import { catalogAPI } from '/@/api/client';
import type { DetailTab } from './(components)/tabs';
import { TABS } from './(components)/tabs';
import type { PageLoad } from './$types';

interface Data {
  registry: string;
  repository: string;
  tab: DetailTab;
  architecture?: string;
  detail: Promise<RepositoryDetail>;
}

export const load: PageLoad = async ({ params, url }): Promise<Data> => {
  const tab = url.searchParams.get('tab');
  return {
    registry: params.registry,
    repository: params.repository,
    tab: TABS.includes(tab as DetailTab) ? (tab as DetailTab) : 'overview',
    architecture: url.searchParams.get('arch') ?? undefined,
    // not awaited: the page shows a skeleton while Pyxis answers (~2s, cached afterwards)
    detail: catalogAPI.getRepository(params.registry, params.repository),
  };
};
