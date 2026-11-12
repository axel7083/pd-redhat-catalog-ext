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
import '@testing-library/jest-dom/vitest';

import type { AuthApi, PullTarget } from '@podman-desktop/extension-redhat-catalog-core-api';
import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

import { authAPI } from '/@/api/client';
import RegistryAccessBanner from './RegistryAccessBanner.svelte';

vi.mock(import('/@/api/client'), () => ({
  authAPI: {
    signIn: vi.fn(),
    installAuthenticationExtension: vi.fn(),
  } as unknown as AuthApi,
}));

const REDHAT_IO: PullTarget = {
  registry: 'registry.redhat.io',
  repository: 'rhel9/postgresql-16',
  requiresLogin: true,
  redHatLogin: true,
  reason: 'redhat-terms',
};

beforeEach(() => {
  vi.resetAllMocks();
});

test('nothing is shown for anonymous registries', () => {
  const { queryByRole } = render(RegistryAccessBanner, {
    // `target` is also a render option: pass the props explicitly
    props: {
      target: { ...REDHAT_IO, registry: 'registry.access.redhat.com', requiresLogin: false, redHatLogin: false },
      auth: { providerAvailable: true, signedIn: false },
    },
  });

  expect(queryByRole('note')).not.toBeInTheDocument();
});

test('offers to sign in', async () => {
  vi.mocked(authAPI.signIn).mockResolvedValue({ providerAvailable: true, signedIn: true });
  const { getByRole } = render(RegistryAccessBanner, {
    // `target` is also a render option: pass the props explicitly
    props: {
      target: REDHAT_IO,
      auth: { providerAvailable: true, signedIn: false },
    },
  });

  await fireEvent.click(getByRole('button', { name: 'Sign in with Red Hat' }));

  expect(authAPI.signIn).toHaveBeenCalledOnce();
});

test('offers to install the authentication extension', async () => {
  const { getByRole } = render(RegistryAccessBanner, {
    // `target` is also a render option: pass the props explicitly
    props: {
      target: REDHAT_IO,
      auth: { providerAvailable: false, signedIn: false },
    },
  });

  await fireEvent.click(getByRole('button', { name: 'Install Red Hat Authentication' }));

  expect(authAPI.installAuthenticationExtension).toHaveBeenCalledOnce();
});

test('shows the signed in account', () => {
  const { getByText } = render(RegistryAccessBanner, {
    // `target` is also a render option: pass the props explicitly
    props: {
      target: REDHAT_IO,
      auth: { providerAvailable: true, signedIn: true, account: 'jdoe' },
    },
  });

  expect(getByText(/Signed in as jdoe/)).toBeInTheDocument();
});

test('partner registries point to the registry settings', () => {
  const { getByText } = render(RegistryAccessBanner, {
    // `target` is also a render option: pass the props explicitly
    props: {
      target: { ...REDHAT_IO, registry: 'registry.connect.redhat.com', redHatLogin: false, reason: 'partner' },
      auth: { providerAvailable: true, signedIn: false },
    },
  });

  expect(getByText(/credentials in Settings > Registries/)).toBeInTheDocument();
});
