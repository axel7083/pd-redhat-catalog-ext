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
import type { PullStatus } from '@podman-desktop/extension-redhat-catalog-core-api';
import { matchesImagePrefix, Messages } from '@podman-desktop/extension-redhat-catalog-core-api';
import { readable } from 'svelte/store';

import { imageAPI, rpcBrowser } from '/@/api/client';

/**
 * Pulls started from the extension, tracked by the backend: the "Pulling…" state and pull errors survive
 * switching tabs or pages. The backend publishes the whole list on every change (no debounce, no refetch).
 */
export const pulls = readable<PullStatus[]>([], set => {
  const subscriber = rpcBrowser.subscribe(Messages.UPDATE_PULLS, (statuses: PullStatus[]) => set(statuses));
  imageAPI.getPulls().then(set).catch(console.error);
  return subscriber.unsubscribe;
});

/**
 * The pull of one of the images of a repository (see `localImagePrefixes`), if any.
 */
export function findPull(statuses: PullStatus[], prefixes: string[]): PullStatus | undefined {
  return statuses.find(({ image }) => matchesImagePrefix(image, prefixes));
}
