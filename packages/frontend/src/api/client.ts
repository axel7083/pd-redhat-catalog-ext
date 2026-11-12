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
import {
  AuthApi,
  CatalogApi,
  DialogApi,
  ImageApi,
  ProviderApi,
  RoutingApi,
  RpcBrowser,
} from '@podman-desktop/extension-redhat-catalog-core-api';

import { browser } from '$app/environment';
import type { PodmanDesktopApi } from '../../../../types/podman-desktop-api';

/**
 * This file is the client side of the API. It is used to communicate with the backend, which allows
 * cross-communication between the frontend and backend through an RPC-like communication.
 */
/**
 * Saved in the webview state: Podman Desktop destroys the webview when the user leaves it, this brings them back to
 * the same place.
 */
export interface RouterState {
  url: string;
  /**
   * The explore page left (search, scope, filters): the breadcrumb of a repository goes back to it.
   */
  explore?: string;
  /**
   * The container engine selected (`providerId:name`).
   */
  connection?: string;
}

let api: PodmanDesktopApi;
let rpcBrowser: RpcBrowser;
let routingAPI: RoutingApi;
let catalogAPI: CatalogApi;
let authAPI: AuthApi;
let providerAPI: ProviderApi;
let imageAPI: ImageApi;
let dialogAPI: DialogApi;

if (browser) {
  api = acquirePodmanDesktopApi();
  rpcBrowser = new RpcBrowser(window, api);

  routingAPI = rpcBrowser.getProxy(RoutingApi);
  catalogAPI = rpcBrowser.getProxy(CatalogApi);
  authAPI = rpcBrowser.getProxy(AuthApi);
  providerAPI = rpcBrowser.getProxy(ProviderApi);
  imageAPI = rpcBrowser.getProxy(ImageApi);
  dialogAPI = rpcBrowser.getProxy(DialogApi);
}

export { rpcBrowser, routingAPI, catalogAPI, authAPI, providerAPI, imageAPI, dialogAPI };

// The below code is used to save the state of the router in the podmanDesktopApi, so
// that we can determine the correct route to display when the extension is reloaded.
export const saveRouterState = (state: RouterState): void => {
  api.setState(state);
};

const isRouterState = (value: unknown): value is RouterState => {
  return typeof value === 'object' && !!value && 'url' in value;
};

/**
 * The state saved when the webview was left.
 */
export function readRouterState(): RouterState {
  const state = api.getState();
  return isRouterState(state) ? state : { url: '/' };
}

export async function getRouterState(): Promise<RouterState> {
  const saved = readRouterState();
  // a route requested by the extension (e.g. a command) wins over the saved one
  const route: string | undefined = await routingAPI.readRoute();
  return route ? { ...saved, url: route } : saved;
}
