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

import type { ImageApi, SearchResult } from '@podman-desktop/extension-redhat-catalog-core-api';
import { render } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

import SearchResults from './SearchResults.svelte';

vi.mock(import('/@/stores/pulls'), async () => {
  const { readable } = await import('svelte/store');
  return { pulls: readable([]), findPull: (): undefined => undefined };
});
vi.mock(import('/@/api/client'), () => ({
  imageAPI: {} as unknown as ImageApi,
}));
vi.mock(import('/@/stores/local-images'), async () => {
  const { readable } = await import('svelte/store');
  return {
    localImages: readable({ 'podman:machine': [{ id: 'sha', names: ['quay.io/hummingbird/nginx:latest'] }] }),
  };
});

const RESULT: SearchResult = {
  total: 1,
  page: 0,
  pageSize: 24,
  repositories: [
    {
      id: 'id1',
      registry: 'registry.access.redhat.com',
      repository: 'hi/nginx',
      title: 'Red Hat Hardened Images nginx',
      architectures: ['amd64'],
      tags: ['latest'],
      buildCategories: ['Hardened'],
      releaseCategories: [],
    },
  ],
  facets: {
    partnerName: [{ value: 'Red Hat', count: 1 }],
    build_categories_list: [],
    architecture: [],
    release_categories: [],
    application_categories_list: [],
    product_listings_names: [],
  },
};

const CONNECTION = { providerId: 'podman', name: 'machine', status: 'started' as const };

beforeEach(() => {
  vi.resetAllMocks();
});

function props(result: Promise<SearchResult>): Parameters<typeof render<typeof SearchResults>>[1] {
  return {
    query: {},
    result,
    connection: CONNECTION,
    onclear: vi.fn(),
    onpage: vi.fn(),
  };
}

test('renders facets and cards once the search resolves', async () => {
  const { findByRole, getByText } = render(SearchResults, props(Promise.resolve(RESULT)));

  expect(await findByRole('link', { name: 'Red Hat Hardened Images nginx' })).toBeInTheDocument();
  expect(getByText('1 repository')).toBeInTheDocument();
  expect(getByText('1–1 of 1')).toBeInTheDocument();
});

test('pulled repositories offer Run, including Hummingbird images of hardened repositories', async () => {
  const { findByRole } = render(SearchResults, props(Promise.resolve(RESULT)));

  expect(await findByRole('button', { name: 'Run quay.io/hummingbird/nginx:latest' })).toBeInTheDocument();
});

test('shows the empty state without results', async () => {
  const { findByText } = render(SearchResults, props(Promise.resolve({ ...RESULT, total: 0, repositories: [] })));

  expect(await findByText('No repositories found')).toBeInTheDocument();
});
