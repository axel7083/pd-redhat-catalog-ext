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
import type { ImageInfo, ProviderContainerConnection, WebviewPanel } from '@podman-desktop/api';
import { containerEngine } from '@podman-desktop/api';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { LocalImagesService } from '/@/services/local-images-service';
import type { ProviderService } from '/@/services/provider-service';
import type { WebviewService } from '/@/services/webview-service';

const postMessage = vi.fn().mockResolvedValue(true);
const WEBVIEW_SERVICE_MOCK = {
  getPanel: vi.fn(() => ({ webview: { postMessage } }) as unknown as WebviewPanel),
} as unknown as WebviewService;

function connection(name: string, status: string): ProviderContainerConnection {
  return { providerId: 'podman', connection: { name, status: (): string => status } } as ProviderContainerConnection;
}

const PROVIDERS_MOCK = {
  getContainerConnections: vi.fn(),
  event: vi.fn(),
} as unknown as ProviderService;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(WEBVIEW_SERVICE_MOCK.getPanel).mockReturnValue({ webview: { postMessage } } as unknown as WebviewPanel);
  postMessage.mockResolvedValue(true);
  vi.mocked(containerEngine.onEvent).mockReturnValue({ dispose: vi.fn() });
  vi.mocked(PROVIDERS_MOCK.event).mockReturnValue({ dispose: vi.fn() });
  vi.mocked(PROVIDERS_MOCK.getContainerConnections).mockReturnValue([
    connection('machine', 'started'),
    connection('stopped-machine', 'stopped'),
  ]);
  vi.mocked(containerEngine.listImages).mockResolvedValue([
    {
      Id: 'sha256:1',
      RepoTags: ['quay.io/hummingbird/nginx:latest'],
      RepoDigests: ['quay.io/hummingbird/nginx@sha256:a'],
    },
  ] as unknown as ImageInfo[]);
});

afterEach(() => {
  vi.useRealTimers();
});

test('lists the images of the started connections only and publishes them', async () => {
  const service = new LocalImagesService(WEBVIEW_SERVICE_MOCK, PROVIDERS_MOCK);

  await service.refresh();

  expect(containerEngine.listImages).toHaveBeenCalledOnce();
  expect(service.snapshot()).toEqual({
    'podman:machine': [
      { id: 'sha256:1', names: ['quay.io/hummingbird/nginx:latest', 'quay.io/hummingbird/nginx@sha256:a'] },
    ],
  });
  expect(postMessage).toHaveBeenLastCalledWith({ id: 'update-local-images', body: service.snapshot() });
});

test('a stopped connection disappears from the snapshot', async () => {
  const service = new LocalImagesService(WEBVIEW_SERVICE_MOCK, PROVIDERS_MOCK);
  await service.refresh();

  vi.mocked(PROVIDERS_MOCK.getContainerConnections).mockReturnValue([connection('machine', 'stopped')]);
  await service.refresh();

  expect(service.snapshot()).toEqual({});
});

test('a connection failing to answer keeps its previous list', async () => {
  const service = new LocalImagesService(WEBVIEW_SERVICE_MOCK, PROVIDERS_MOCK);
  await service.refresh();

  vi.mocked(containerEngine.listImages).mockRejectedValue(new Error('restarting'));
  await service.refresh();

  expect(Object.keys(service.snapshot())).toEqual(['podman:machine']);
});

test('concurrent refreshes are coalesced', async () => {
  const service = new LocalImagesService(WEBVIEW_SERVICE_MOCK, PROVIDERS_MOCK);

  const first = service.refresh();
  // requested while the first runs: one more refresh after it, not two
  const second = service.refresh();
  const third = service.refresh();
  await Promise.all([first, second, third]);
  await vi.waitFor(() => expect(containerEngine.listImages).toHaveBeenCalledTimes(2));
  await new Promise(resolve => setTimeout(resolve, 20));

  expect(containerEngine.listImages).toHaveBeenCalledTimes(2);
});

test('image events and connection changes trigger a refresh', async () => {
  vi.useFakeTimers();
  const service = new LocalImagesService(WEBVIEW_SERVICE_MOCK, PROVIDERS_MOCK);
  await service.init();
  await vi.runAllTimersAsync();
  vi.mocked(containerEngine.listImages).mockClear();

  const onImageEvent = vi.mocked(containerEngine.onEvent).mock.calls[0][0];
  onImageEvent({ Type: 'image', Action: 'pull' } as never);
  onImageEvent({ Type: 'image', Action: 'delete' } as never);
  onImageEvent({ Type: 'container', Action: 'start' } as never);
  await vi.runAllTimersAsync();
  // one refresh for the burst of image events, none for the container event
  expect(containerEngine.listImages).toHaveBeenCalledOnce();

  const onConnectionChange = vi.mocked(PROVIDERS_MOCK.event).mock.calls[0][0];
  onConnectionChange([]);
  await vi.runAllTimersAsync();
  expect(containerEngine.listImages).toHaveBeenCalledTimes(2);
});
