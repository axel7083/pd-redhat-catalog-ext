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
import { getChannel } from './utils';
import { ImageApi } from '../apis/image-api';
import { CatalogApi } from '../apis/catalog-api';
import { AuthApi } from '../apis/auth-api';

/**
 * Channels that are not subject to the default RPC timeout: pulls and sign-in wait on the user or the network,
 * and the catalog APIs enforce their own request timeout in the backend.
 */
export const noTimeoutChannels: string[] = [
  getChannel(ImageApi, 'pull'),
  getChannel(AuthApi, 'signIn'),
  getChannel(CatalogApi, 'search'),
  getChannel(CatalogApi, 'getRepository'),
  getChannel(CatalogApi, 'prefetchRepository'),
  getChannel(CatalogApi, 'getTags'),
  getChannel(CatalogApi, 'prefetchTabs'),
  getChannel(CatalogApi, 'getVulnerabilities'),
  getChannel(CatalogApi, 'getPackages'),
  getChannel(CatalogApi, 'getContainerfile'),
];
