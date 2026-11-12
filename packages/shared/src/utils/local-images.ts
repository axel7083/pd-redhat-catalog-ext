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
import type { LocalImages } from '../models/local-image';
import { connectionKey } from '../models/local-image';
import type { ProviderContainerConnectionIdentifierInfo } from '../models/provider-container-connection-identifier-info';
import type { SimpleImageInfo } from '../models/simple-image-info';
import { matchesImagePrefix } from './pull-spec';

/**
 * The local image of a repository (see `localImagePrefixes`) on a connection, from the published snapshot: no
 * request to the container engine.
 */
export function findLocalImage(
  snapshot: LocalImages,
  connection: ProviderContainerConnectionIdentifierInfo | undefined,
  prefixes: string[],
): SimpleImageInfo | undefined {
  if (!connection) return undefined;
  for (const image of snapshot[connectionKey(connection)] ?? []) {
    const name = image.names.find(candidate => matchesImagePrefix(candidate, prefixes));
    if (name) return { id: image.id, name, connection: { providerId: connection.providerId, name: connection.name } };
  }
  return undefined;
}
