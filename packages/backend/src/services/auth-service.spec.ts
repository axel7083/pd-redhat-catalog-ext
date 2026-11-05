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
import type { AuthenticationSession, Extension, Registry, TelemetryLogger } from '@podman-desktop/api';
import { authentication, extensions, navigation, registry } from '@podman-desktop/api';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  AuthService,
  REDHAT_AUTHENTICATION_EXTENSION_ID,
  REDHAT_AUTHENTICATION_PROVIDER_ID,
} from '/@/services/auth-service';
import type { WebviewService } from '/@/services/webview-service';

const WEBVIEW_SERVICE_MOCK = { getPanel: vi.fn() } as unknown as WebviewService;
const TELEMETRY_LOGGER_MOCK = { logUsage: vi.fn() } as unknown as TelemetryLogger;
const SESSION = { account: { label: 'jdoe@redhat.com' } } as AuthenticationSession;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
  vi.mocked(extensions.getExtension).mockReturnValue({} as Extension<unknown>);
  vi.mocked(registry.onDidRegisterRegistry).mockReturnValue({ dispose: vi.fn() });
});

function getAuthService(): AuthService {
  return new AuthService(WEBVIEW_SERVICE_MOCK, TELEMETRY_LOGGER_MOCK);
}

describe('getStatus', () => {
  test('reports the provider as unavailable without the Red Hat authentication extension', async () => {
    vi.mocked(extensions.getExtension).mockReturnValue(undefined);

    expect(await getAuthService().getStatus()).toEqual({
      providerAvailable: false,
      signedIn: false,
      account: undefined,
    });
    expect(extensions.getExtension).toHaveBeenCalledWith(REDHAT_AUTHENTICATION_EXTENSION_ID);
    expect(authentication.getSession).not.toHaveBeenCalled();
  });

  test('reads the session silently', async () => {
    vi.mocked(authentication.getSession).mockResolvedValue(SESSION);

    expect(await getAuthService().getStatus()).toEqual({
      providerAvailable: true,
      signedIn: true,
      account: 'jdoe@redhat.com',
    });
    expect(authentication.getSession).toHaveBeenCalledWith(REDHAT_AUTHENTICATION_PROVIDER_ID, expect.any(Array), {
      createIfNone: false,
    });
  });
});

describe('signIn', () => {
  test('throws without the Red Hat authentication extension', async () => {
    vi.mocked(extensions.getExtension).mockReturnValue(undefined);

    await expect(getAuthService().signIn()).rejects.toThrow('The Red Hat Authentication extension is required');
  });

  test('waits for registry.redhat.io to be registered on a new session', async () => {
    vi.mocked(authentication.getSession).mockResolvedValueOnce(undefined).mockResolvedValueOnce(SESSION);

    const service = getAuthService();
    const promise = service.signIn();

    // the registry is registered by the Red Hat authentication extension
    await vi.waitFor(() => expect(authentication.getSession).toHaveBeenCalledTimes(2));
    const listener = vi.mocked(registry.onDidRegisterRegistry).mock.calls[0][0];
    listener({ serverUrl: 'registry.redhat.io' } as Registry);

    expect(await promise).toEqual({ providerAvailable: true, signedIn: true, account: 'jdoe@redhat.com' });
    expect(authentication.getSession).toHaveBeenLastCalledWith(REDHAT_AUTHENTICATION_PROVIDER_ID, expect.any(Array), {
      createIfNone: true,
    });
    expect(TELEMETRY_LOGGER_MOCK.logUsage).toHaveBeenCalledWith('sign-in', {
      signedIn: true,
      registryRegistered: true,
    });
  });

  test('does not wait for the registry when already signed in', async () => {
    vi.mocked(authentication.getSession).mockResolvedValue(SESSION);

    expect((await getAuthService().signIn()).signedIn).toBe(true);
  });
});

test('waitForRegistry resolves false after the timeout', async () => {
  vi.useFakeTimers();
  const { promise } = getAuthService().waitForRegistry('registry.redhat.io', 1_000);

  vi.advanceTimersByTime(1_000);

  expect(await promise).toBe(false);
});

test('installAuthenticationExtension opens the extensions catalog', async () => {
  await getAuthService().installAuthenticationExtension();

  expect(navigation.navigateToExtensionsCatalog).toHaveBeenCalledWith({ searchTerm: 'Red Hat Authentication' });
});
