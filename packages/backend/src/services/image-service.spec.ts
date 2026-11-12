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
import {
  explainPullError,
  hostArchitecture,
  imageNames,
  ImageService,
  isAuthenticationError,
  SIGN_IN_ACTION,
} from '/@/services/image-service';
import type { ProviderService } from '/@/services/provider-service';
import type { LocalImagesService } from '/@/services/local-images-service';
import type { PullTracker } from '/@/services/pull-tracker';

const TELEMETRY_LOGGER_MOCK = { logUsage: vi.fn() } as unknown as TelemetryLogger;
const PROVIDER_SERVICE_MOCK = {
  toProviderContainerConnectionDetailedInfo: vi.fn(),
} as unknown as ProviderService;
const AUTH_SERVICE_MOCK = {
  isProviderAvailable: vi.fn(),
  signIn: vi.fn(),
  installAuthenticationExtension: vi.fn(),
} as unknown as AuthService;

const LOCAL_IMAGES_MOCK = { refresh: vi.fn() } as unknown as LocalImagesService;

const PULL_TRACKER_MOCK = {
  start: vi.fn(),
  succeed: vi.fn(),
  fail: vi.fn(),
} as unknown as PullTracker;

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
  return new ImageService(
    TELEMETRY_LOGGER_MOCK,
    PROVIDER_SERVICE_MOCK,
    AUTH_SERVICE_MOCK,
    PULL_TRACKER_MOCK,
    LOCAL_IMAGES_MOCK,
  );
}

describe('pull', () => {
  test('pulls and returns the local image', async () => {
    const image = await getImageService().pull({ image: IMAGE, connection: CONNECTION });

    expect(containerEngine.pullImage).toHaveBeenCalledOnce();
    expect(image).toEqual(expect.objectContaining({ id: 'sha256:1', name: IMAGE }));
    expect(PULL_TRACKER_MOCK.start).toHaveBeenCalledWith(IMAGE);
    // the local images are refreshed before the pull is reported done
    expect(LOCAL_IMAGES_MOCK.refresh).toHaveBeenCalledOnce();
    expect(vi.mocked(LOCAL_IMAGES_MOCK.refresh).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(PULL_TRACKER_MOCK.succeed).mock.invocationCallOrder[0],
    );
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
    expect(PULL_TRACKER_MOCK.fail).toHaveBeenCalledWith(IMAGE, expect.any(Error));
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

test.each([
  { message: 'unauthorized: authentication required', expected: true },
  { message: 'Error: 401 Unauthorized', expected: true },
  { message: 'denied: requested access to the resource is denied', expected: true },
  {
    message: 'unable to pull image "registry.redhat.io/a/b:1": https://access.redhat.com/RegistryAuthentication',
    expected: true,
  },
  { message: 'manifest unknown', expected: false },
])('isAuthenticationError($message)', ({ message, expected }) => {
  expect(isAuthenticationError(new Error(message))).toBe(expected);
});

test('imageNames', () => {
  expect(imageNames({ RepoTags: ['a:1'], RepoDigests: ['a@sha256:1'] })).toEqual(['a:1', 'a@sha256:1']);
  expect(imageNames({ RepoTags: undefined, RepoDigests: undefined } as unknown as ImageInfo)).toEqual([]);
});

test('a missing signature is explained', async () => {
  vi.mocked(containerEngine.pullImage).mockRejectedValue(
    new Error('unable to pull image: Source image rejected: A signature was required, but no signature exists'),
  );

  await expect(getImageService().pull({ image: IMAGE, connection: CONNECTION })).rejects.toThrow(
    `${IMAGE} was rejected because it is not signed yet`,
  );
  // not an authentication problem: no sign-in offered
  expect(window.showWarningMessage).not.toHaveBeenCalled();
});

test('explainPullError keeps other errors', () => {
  const err = new Error('manifest unknown');
  expect(explainPullError(IMAGE, err)).toBe(err);
});

test.each([
  { arch: 'x64', expected: 'amd64' },
  { arch: 'arm64', expected: 'arm64' },
  { arch: 'ppc64', expected: 'ppc64le' },
  { arch: 's390x', expected: 's390x' },
])('hostArchitecture($arch) → $expected', ({ arch, expected }) => {
  expect(hostArchitecture(arch)).toBe(expected);
});

test('another architecture is pulled with an explicit platform, the host one without', async () => {
  const other = hostArchitecture() === 'arm64' ? 'amd64' : 'arm64';

  await getImageService().pull({ image: IMAGE, connection: CONNECTION, architecture: other });
  expect(vi.mocked(containerEngine.pullImage).mock.calls[0][3]).toBe(`linux/${other}`);

  await getImageService().pull({ image: IMAGE, connection: CONNECTION, architecture: hostArchitecture() });
  expect(vi.mocked(containerEngine.pullImage).mock.calls[1][3]).toBeUndefined();
});
