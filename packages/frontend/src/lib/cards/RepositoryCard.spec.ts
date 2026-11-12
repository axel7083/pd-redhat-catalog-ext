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

import type {
  CatalogApi,
  ImageApi,
  RepositoryDetail,
  RepositorySummary,
  SimpleImageInfo,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

import { catalogAPI, imageAPI } from '/@/api/client';
import RepositoryCard from './RepositoryCard.svelte';

vi.mock(import('/@/stores/pulls'), async () => {
  const { readable } = await import('svelte/store');
  return { pulls: readable([]), findPull: (): undefined => undefined };
});
// the local images snapshot, set per test
const LOCAL_IMAGES = vi.hoisted(() => ({ value: {} as Record<string, Array<{ id: string; names: string[] }>> }));
vi.mock(import('/@/stores/local-images'), async () => {
  const { readable } = await import('svelte/store');
  return { localImages: readable(LOCAL_IMAGES.value, set => set(LOCAL_IMAGES.value)) };
});
vi.mock(import('/@/api/client'), () => ({
  catalogAPI: { prefetchRepository: vi.fn(), getRepository: vi.fn() } as unknown as CatalogApi,
  imageAPI: { pull: vi.fn(), navigateToImageDetails: vi.fn(), navigateToImageRun: vi.fn() } as unknown as ImageApi,
}));

const CONNECTION = { providerId: 'podman', name: 'machine', status: 'started' as const };
const IMAGE: SimpleImageInfo = {
  id: 'sha256:1',
  name: 'registry.access.redhat.com/hi/nginx:latest',
  connection: CONNECTION,
};

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
  LOCAL_IMAGES.value = {};
  vi.mocked(catalogAPI.prefetchRepository).mockResolvedValue(undefined);
});

test('renders the repository summary and links to the detail page', () => {
  const { getByRole, getByText } = render(RepositoryCard, { object: REPOSITORY });

  const link = getByRole('link', { name: REPOSITORY.title });
  expect(link).toHaveAttribute('href', '/repository/registry.access.redhat.com/hi/nginx');
  expect(getByText('nginx web server')).toBeInTheDocument();
  expect(getByText('Hardened')).toBeInTheDocument();
  // hardened titles list release streams: the repository name is shown instead
  expect(getByRole('link', { name: REPOSITORY.title })).toHaveTextContent(/^nginx$/);
  expect(getByText('Red Hat')).toBeInTheDocument();
  expect(getByRole('generic', { name: 'Health index A' })).toBeInTheDocument();
});

test('a pulled repository offers Open and Run, from the local images snapshot', async () => {
  LOCAL_IMAGES.value = { 'podman:machine': [{ id: IMAGE.id, names: [IMAGE.name] }] };
  const { findByRole } = render(RepositoryCard, { object: REPOSITORY, connection: CONNECTION });

  await fireEvent.click(await findByRole('button', { name: `Run ${IMAGE.name}` }));
  expect(imageAPI.navigateToImageRun).toHaveBeenCalledWith({
    id: IMAGE.id,
    name: IMAGE.name,
    connection: { providerId: 'podman', name: 'machine' },
  });
  expect(await findByRole('button', { name: `Open ${IMAGE.name}` })).toBeInTheDocument();
});

test('Pull resolves the pull target from the repository detail', async () => {
  vi.mocked(catalogAPI.getRepository).mockResolvedValue({
    pullTarget: { registry: 'registry.redhat.io', repository: 'hi/nginx', requiresLogin: true, redHatLogin: true },
    latestImages: [{ id: 'a', architecture: 'amd64', tags: ['1.29', 'latest'] }],
    recommendedTag: '1.29',
  } as unknown as RepositoryDetail);
  vi.mocked(imageAPI.pull).mockResolvedValue(IMAGE);
  const { findByRole } = render(RepositoryCard, {
    object: REPOSITORY,
    connection: CONNECTION,
  });

  await fireEvent.click(await findByRole('button', { name: 'Pull hi/nginx' }));

  expect(imageAPI.pull).toHaveBeenCalledWith({
    image: 'registry.redhat.io/hi/nginx:latest',
    connection: { providerId: 'podman', name: 'machine' },
  });
});

test('a pull error is shown on the card', async () => {
  vi.mocked(catalogAPI.getRepository).mockRejectedValue(new Error('catalog unavailable'));
  const { findByRole } = render(RepositoryCard, {
    object: REPOSITORY,
    connection: CONNECTION,
  });

  await fireEvent.click(await findByRole('button', { name: 'Pull hi/nginx' }));

  expect(await findByRole('alert')).toHaveTextContent('catalog unavailable');
});

test('Pull is disabled without a started container engine', async () => {
  const { findByRole } = render(RepositoryCard, {
    object: REPOSITORY,
    connection: { ...CONNECTION, status: 'stopped' },
  });

  expect(await findByRole('button', { name: 'Pull hi/nginx' })).toBeDisabled();
});

test('prefetches the details once on hover', async () => {
  const { getByRole } = render(RepositoryCard, { object: REPOSITORY });
  const link = getByRole('link', { name: REPOSITORY.title });

  await fireEvent.mouseEnter(link);
  await fireEvent.mouseEnter(link);

  expect(catalogAPI.prefetchRepository).toHaveBeenCalledExactlyOnceWith('registry.access.redhat.com', 'hi/nginx');
});

test.each([
  { name: 'square logo is kept', width: 200, height: 200, initial: false },
  { name: 'wide wordmark falls back to the publisher initial', width: 1346, height: 309, initial: true },
])('$name', async ({ width, height, initial }) => {
  const { container, queryByText } = render(RepositoryCard, {
    object: { ...REPOSITORY, publisher: 'EnterpriseDB', logoUrl: 'https://connect.redhat.com/logo' },
  });
  const image = container.querySelector('img')!;
  expect(image).toHaveAttribute('crossorigin', 'anonymous');
  Object.defineProperty(image, 'naturalWidth', { value: width });
  Object.defineProperty(image, 'naturalHeight', { value: height });

  await fireEvent.load(image);

  expect(!!queryByText('E')).toBe(initial);
  expect(!!container.querySelector('img')).toBe(!initial);
});

test('the Red Hat logo is not requested in CORS mode', () => {
  const { container } = render(RepositoryCard, {
    object: {
      ...REPOSITORY,
      logoUrl: 'https://static.redhat.com/libs/redhat/brand-assets/latest/corp/logo--hat-only.svg',
    },
  });
  expect(container.querySelector('img')).not.toHaveAttribute('crossorigin');
});

test('a stopped engine disables Pull and hides its local images', async () => {
  LOCAL_IMAGES.value = { 'podman:machine': [{ id: IMAGE.id, names: [IMAGE.name] }] };
  const { findByRole, queryByRole } = render(RepositoryCard, {
    object: REPOSITORY,
    connection: { ...CONNECTION, status: 'stopped' },
  });

  expect(await findByRole('button', { name: 'Pull hi/nginx' })).toBeDisabled();
  expect(queryByRole('button', { name: `Run ${IMAGE.name}` })).not.toBeInTheDocument();
});
