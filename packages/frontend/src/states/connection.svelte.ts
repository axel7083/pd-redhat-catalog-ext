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
import type { ProviderContainerConnectionDetailedInfo } from '@podman-desktop/extension-redhat-catalog-core-api';

/**
 * The container connection to pull to, shared by every page. Defaults to the first started connection.
 */
class SelectedConnection {
  #key: string | undefined = $state(undefined);

  static key(connection: ProviderContainerConnectionDetailedInfo): string {
    return `${connection.providerId}:${connection.name}`;
  }

  resolve(connections: ProviderContainerConnectionDetailedInfo[]): ProviderContainerConnectionDetailedInfo | undefined {
    return (
      connections.find(connection => SelectedConnection.key(connection) === this.#key) ??
      connections.find(({ status }) => status === 'started') ??
      connections[0]
    );
  }

  select(connection: ProviderContainerConnectionDetailedInfo | undefined): void {
    this.#key = connection ? SelectedConnection.key(connection) : undefined;
  }
}

export const selectedConnection = new SelectedConnection();
