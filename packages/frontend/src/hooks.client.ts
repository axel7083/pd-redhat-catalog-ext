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
import type { ClientInit } from '@sveltejs/kit';

import { readRouterState } from '/@/api/client';
import { selectedConnection } from '/@/states/connection.svelte';

/**
 * Runs before the router reads the location: the webview opens directly on the page the user left, instead of
 * rendering the home page first then navigating. The catalog page left is read by the repository pages (breadcrumb).
 * Synchronous on purpose: the saved state is local, while a request to the extension may get no answer when the webview
 * was just recreated (a route requested by the extension is read by the layout, see +layout.svelte).
 */
export const init: ClientInit = () => {
  try {
    const state = readRouterState();
    if (state.connection) selectedConnection.key = state.connection;
    // before 0.4.0 the catalog search was the root page (`/?q=…`): it is the catalog page now
    const url = state.url.startsWith('/?') ? `/catalog${state.url.slice(1)}` : state.url;
    if (url !== '/') history.replaceState(history.state, '', url);
  } catch (error: unknown) {
    console.error('Unable to restore the webview state', error);
  }
};
