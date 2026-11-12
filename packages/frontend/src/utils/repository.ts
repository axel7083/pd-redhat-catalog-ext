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
import type { RepositorySummary } from '@podman-desktop/extension-redhat-catalog-core-api';
import { localImagePrefixes } from '@podman-desktop/extension-redhat-catalog-core-api';

/**
 * Local image name prefixes of a search result. The search index reports registry.access.redhat.com even for
 * images pulled from registry.redhat.io (repositories with terms): both are matched.
 */
export function repositoryPrefixes(repository: Pick<RepositorySummary, 'registry' | 'repository'>): string[] {
  const target = { registry: repository.registry, repository: repository.repository };
  const all = localImagePrefixes(target);
  if (repository.registry === 'registry.access.redhat.com') {
    all.push(...localImagePrefixes({ ...target, registry: 'registry.redhat.io' }));
  }
  return all;
}
