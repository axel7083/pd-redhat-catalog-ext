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

import type { CatalogApi, RepositorySummary } from '@podman-desktop/extension-redhat-catalog-core-api';
import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

import { catalogAPI } from '/@/api/client';
import RepositoryCard from './RepositoryCard.svelte';

vi.mock(import('/@/api/client'), () => ({
  catalogAPI: { prefetchRepository: vi.fn() } as unknown as CatalogApi,
}));

const REPOSITORY: RepositorySummary = {
  id: 'id1',
  registry: 'registry.access.redhat.com',
  repository: 'hi/nginx',
  title: 'Red Hat Hardened Images nginx',
  publisher: 'Red Hat',
  description: 'nginx web server',
  architectures: ['amd64', 'arm64'],
  tags: ['latest'],
  buildCategories: ['Hardened'],
  releaseCategories: ['Generally Available'],
  freshnessGrade: 'A',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(catalogAPI.prefetchRepository).mockResolvedValue(undefined);
});

test('renders the repository summary and links to the detail page', () => {
  const { getByRole, getByText } = render(RepositoryCard, { object: REPOSITORY });

  const link = getByRole('link', { name: REPOSITORY.title });
  expect(link).toHaveAttribute('href', '/repository/registry.access.redhat.com/hi/nginx');
  expect(getByText('nginx web server')).toBeInTheDocument();
  expect(getByText('Hardened')).toBeInTheDocument();
  expect(getByText('Red Hat')).toBeInTheDocument();
  expect(getByText('amd64')).toBeInTheDocument();
  expect(getByRole('generic', { name: 'Health index A' })).toBeInTheDocument();
});

test('shows the pulled label', async () => {
  const { findByText } = render(RepositoryCard, { object: REPOSITORY, pulled: Promise.resolve(true) });

  expect(await findByText('Pulled')).toBeInTheDocument();
});

test('prefetches the details once on hover', async () => {
  const { getByRole } = render(RepositoryCard, { object: REPOSITORY });
  const link = getByRole('link', { name: REPOSITORY.title });

  await fireEvent.mouseEnter(link);
  await fireEvent.mouseEnter(link);

  expect(catalogAPI.prefetchRepository).toHaveBeenCalledExactlyOnceWith('registry.access.redhat.com', 'hi/nginx');
});
