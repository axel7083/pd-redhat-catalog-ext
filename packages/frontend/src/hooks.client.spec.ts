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
import { beforeEach, expect, test, vi } from 'vitest';

import { getRouterState } from '/@/api/client';
import { selectedConnection } from '/@/states/connection.svelte';
import { init } from './hooks.client';

vi.mock(import('/@/api/client'), () => ({
  getRouterState: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(history, 'replaceState');
  selectedConnection.key = undefined;
});

test('restores the page and the engine left', async () => {
  vi.mocked(getRouterState).mockResolvedValue({
    url: '/repository/registry.access.redhat.com/ubi9/ubi?tab=packages&arch=arm64',
    explore: '/?q=ubi',
    connection: 'podman:podman-machine-default',
  });

  await init();

  expect(history.replaceState).toHaveBeenCalledWith(
    history.state,
    '',
    '/repository/registry.access.redhat.com/ubi9/ubi?tab=packages&arch=arm64',
  );
  expect(selectedConnection.key).toBe('podman:podman-machine-default');
});

test('stays on the initial location for the explore root', async () => {
  vi.mocked(getRouterState).mockResolvedValue({ url: '/' });

  await init();

  expect(history.replaceState).not.toHaveBeenCalled();
});

test('a failure to read the state does not block the start', async () => {
  vi.mocked(getRouterState).mockRejectedValue(new Error('Timeout'));
  vi.spyOn(console, 'error').mockImplementation(() => {});

  await expect(init()).resolves.toBeUndefined();
  expect(history.replaceState).not.toHaveBeenCalled();
});
