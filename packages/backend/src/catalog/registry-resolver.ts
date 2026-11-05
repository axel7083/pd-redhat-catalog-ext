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
import type { PullTarget } from '@podman-desktop/extension-redhat-catalog-core-api';

export const REGISTRY_ACCESS_REDHAT_COM = 'registry.access.redhat.com';
export const REGISTRY_REDHAT_IO = 'registry.redhat.io';
export const REGISTRY_CONNECT_REDHAT_COM = 'registry.connect.redhat.com';

const REDHAT_REGISTRIES = new Set([REGISTRY_ACCESS_REDHAT_COM, REGISTRY_REDHAT_IO]);

/**
 * Registries known to refuse anonymous pulls.
 */
const AUTHENTICATED_REGISTRIES = new Set([REGISTRY_REDHAT_IO, REGISTRY_CONNECT_REDHAT_COM]);

export interface ResolvableRepository {
  registry: string;
  repository: string;
  vendorLabel?: string | null;
  requiresTerms?: boolean | null;
}

/**
 * Resolve the registry to pull a repository from, with the catalog website rule (get-this-image.tsx, getRegistry):
 *
 * ```
 * redHatRepo && requires_terms   → registry.redhat.io          (login required)
 * redHatRepo && !requires_terms  → registry.access.redhat.com  (anonymous)
 * otherwise                      → repository.registry as-is
 * ```
 */
export function resolvePullTarget(repository: ResolvableRepository): PullTarget {
  const redHatRepo = repository.vendorLabel === 'redhat' && REDHAT_REGISTRIES.has(repository.registry);

  if (redHatRepo && repository.requiresTerms) {
    return {
      registry: REGISTRY_REDHAT_IO,
      repository: repository.repository,
      requiresLogin: true,
      redHatLogin: true,
      reason: 'redhat-terms',
    };
  }

  if (redHatRepo) {
    return {
      registry: REGISTRY_ACCESS_REDHAT_COM,
      repository: repository.repository,
      requiresLogin: false,
      redHatLogin: false,
      reason: 'redhat-public',
    };
  }

  return {
    registry: repository.registry,
    repository: repository.repository,
    requiresLogin: AUTHENTICATED_REGISTRIES.has(repository.registry),
    redHatLogin: repository.registry === REGISTRY_REDHAT_IO,
    reason: 'partner',
  };
}
