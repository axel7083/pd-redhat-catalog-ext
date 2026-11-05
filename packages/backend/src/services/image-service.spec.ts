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
import type {
  CancellationToken,
  ImageInfo,
  Progress,
  ProviderContainerConnection,
  TelemetryLogger,
} from '@podman-desktop/api';
import { containerEngine, window } from '@podman-desktop/api';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AuthService } from '/@/services/auth-service';
import { imageNames, ImageService, isAuthenticationError, SIGN_IN_ACTION } from '/@/services/image-service';
import type { ProviderService } from '/@/services/provider-service';
import type { WebviewService } from '/@/services/webview-service';

const WEBVIEW_SERVICE_MOCK = { getPanel: vi.fn() } as unknown as WebviewService;
const TELEMETRY_LOGGER_MOCK = { logUsage: vi.fn() } as unknown as TelemetryLogger;
const PROVIDER_SERVICE_MOCK = {
  toProviderContainerConnectionDetailedInfo: vi.fn(),
} as unknown as ProviderService;
const AUTH_SERVICE_MOCK = {
  isProviderAvailable: vi.fn(),
  signIn: vi.fn(),
  installAuthenticationExtension: vi.fn(),
} as unknown as AuthService;

const CONNECTION = {
  providerId: 'podman',
  connection: { name: 'podman-machine', status: (): string => 'started' },
} as unknown as ProviderContainerConnection;

const IMAGE = 'registry.redhat.io/rhel9/postgresql-16:1-200';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(window.withProgress).mockImplementation((_, task) =>
    task(
      {} as Progress<{ message?: string; increment?: number }>,
      {
        onCancellationRequested: vi.fn(),
      } as unknown as CancellationToken,
    ),
  );
  vi.mocked(containerEngine.listImages).mockResolvedValue([
    { Id: 'sha256:1', RepoTags: [IMAGE], RepoDigests: [] } as unknown as ImageInfo,
  ]);
});

function getImageService(): ImageService {
  return new ImageService(TELEMETRY_LOGGER_MOCK, WEBVIEW_SERVICE_MOCK, PROVIDER_SERVICE_MOCK, AUTH_SERVICE_MOCK);
}

describe('pull', () => {
  test('pulls and returns the local image', async () => {
    const image = await getImageService().pull({ image: IMAGE, connection: CONNECTION });

    expect(containerEngine.pullImage).toHaveBeenCalledOnce();
    expect(image).toEqual(expect.objectContaining({ id: 'sha256:1', name: IMAGE }));
  });

  test('offers to sign in on an authentication error and retries', async () => {
    vi.mocked(containerEngine.pullImage).mockRejectedValueOnce(new Error('unauthorized: authentication required'));
    vi.mocked(AUTH_SERVICE_MOCK.isProviderAvailable).mockReturnValue(true);
    vi.mocked(window.showWarningMessage).mockResolvedValue(SIGN_IN_ACTION);
    vi.mocked(AUTH_SERVICE_MOCK.signIn).mockResolvedValue({ providerAvailable: true, signedIn: true });

    await getImageService().pull({ image: IMAGE, connection: CONNECTION });

    expect(AUTH_SERVICE_MOCK.signIn).toHaveBeenCalledOnce();
    expect(containerEngine.pullImage).toHaveBeenCalledTimes(2);
  });

  test('does not retry when the user cancels the sign-in', async () => {
    vi.mocked(containerEngine.pullImage).mockRejectedValue(new Error('unauthorized'));
    vi.mocked(AUTH_SERVICE_MOCK.isProviderAvailable).mockReturnValue(true);
    vi.mocked(window.showWarningMessage).mockResolvedValue('Cancel');

    await expect(getImageService().pull({ image: IMAGE, connection: CONNECTION })).rejects.toThrow('unauthorized');
    expect(AUTH_SERVICE_MOCK.signIn).not.toHaveBeenCalled();
  });

  test('offers to install the authentication extension when missing', async () => {
    vi.mocked(containerEngine.pullImage).mockRejectedValue(new Error('unauthorized'));
    vi.mocked(AUTH_SERVICE_MOCK.isProviderAvailable).mockReturnValue(false);
    vi.mocked(window.showWarningMessage).mockResolvedValue('Install Red Hat Authentication');

    await expect(getImageService().pull({ image: IMAGE, connection: CONNECTION })).rejects.toThrow('unauthorized');
    expect(AUTH_SERVICE_MOCK.installAuthenticationExtension).toHaveBeenCalledOnce();
  });

  test('authentication errors of other registries are not handled', async () => {
    vi.mocked(containerEngine.pullImage).mockRejectedValue(new Error('unauthorized'));

    await expect(
      getImageService().pull({ image: 'registry.connect.redhat.com/a/b:1', connection: CONNECTION }),
    ).rejects.toThrow('unauthorized');
    expect(window.showWarningMessage).not.toHaveBeenCalled();
  });

  test('images pulled by digest are found through their digests', async () => {
    const byDigest = 'registry.access.redhat.com/hi/nginx@sha256:abc';
    vi.mocked(containerEngine.listImages).mockResolvedValue([
      { Id: 'sha256:2', RepoTags: [], RepoDigests: [byDigest] } as unknown as ImageInfo,
    ]);

    expect((await getImageService().pull({ image: byDigest, connection: CONNECTION })).id).toBe('sha256:2');
  });
});

test('all lists local images matching the prefixes', async () => {
  vi.mocked(containerEngine.listImages).mockResolvedValue([
    { Id: '1', RepoTags: ['quay.io/hummingbird/nginx:latest'] },
    { Id: '2', RepoTags: ['registry.access.redhat.com/hi/nginx-other:latest'] },
    { Id: '3', RepoTags: ['registry.access.redhat.com/hi/nginx:1'] },
  ] as unknown as ImageInfo[]);

  const images = await getImageService().all({
    connection: CONNECTION,
    prefixes: ['registry.access.redhat.com/hi/nginx', 'quay.io/hummingbird/nginx'],
  });

  expect(images.map(({ id }) => id)).toEqual(['1', '3']);
});

test.each([
  { message: 'unauthorized: authentication required', expected: true },
  { message: 'Error: 401 Unauthorized', expected: true },
  { message: 'denied: requested access to the resource is denied', expected: true },
  { message: 'manifest unknown', expected: false },
])('isAuthenticationError($message)', ({ message, expected }) => {
  expect(isAuthenticationError(new Error(message))).toBe(expected);
});

test('imageNames', () => {
  expect(imageNames({ RepoTags: ['a:1'], RepoDigests: ['a@sha256:1'] })).toEqual(['a:1', 'a@sha256:1']);
  expect(imageNames({ RepoTags: undefined, RepoDigests: undefined } as unknown as ImageInfo)).toEqual([]);
});
