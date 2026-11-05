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
// Pyxis answers with explicit nulls
/* eslint-disable no-null/no-null */
import { beforeEach, expect, test, vi } from 'vitest';

import { PYXIS_GRAPHQL_URL, PyxisRequestError, PyxisService } from '/@/services/pyxis-service';
import { fetchJson } from '/@/utils/http';

vi.mock(import('/@/utils/http'));

beforeEach(() => {
  vi.resetAllMocks();
});

test('execute posts the query to the GraphQL endpoint with a trailing slash', async () => {
  vi.mocked(fetchJson).mockResolvedValue({
    data: { get_repository_by_registry_path: null, find_repository_images_by_registry_path: null },
  });

  await new PyxisService().getRepository('registry.access.redhat.com', 'ubi9/ubi');

  expect(PYXIS_GRAPHQL_URL.endsWith('/')).toBe(true);
  expect(fetchJson).toHaveBeenCalledExactlyOnceWith(
    PYXIS_GRAPHQL_URL,
    expect.objectContaining({ method: 'POST', body: expect.stringContaining('query RepositoryDetail') }),
  );
  const body = JSON.parse(vi.mocked(fetchJson).mock.calls[0][1]?.body as string);
  expect(body.variables).toEqual({
    registry: 'registry.access.redhat.com',
    repository: 'ubi9/ubi',
    imagesPageSize: 100,
  });
});

test('GraphQL errors are thrown', async () => {
  vi.mocked(fetchJson).mockResolvedValue({ errors: [{ message: 'bad field' }] });

  await expect(new PyxisService().getRepository('quay.io', 'a/b')).rejects.toThrow(PyxisRequestError);
});

test('repository details are cached', async () => {
  vi.mocked(fetchJson).mockResolvedValue({ data: {} });
  const pyxis = new PyxisService();

  await pyxis.getRepository('quay.io', 'a/b');
  expect(pyxis.hasRepository('quay.io', 'a/b')).toBe(true);
  await pyxis.getRepository('quay.io', 'a/b');

  expect(fetchJson).toHaveBeenCalledOnce();
});

test('vulnerabilities are fetched page by page', async () => {
  const page = (size: number): unknown => ({
    data: {
      find_image_vulnerabilities: {
        total: 300,
        error: null,
        data: Array.from({ length: size }, (_, index) => ({ cve_id: `CVE-${index}` })),
      },
    },
  });
  vi.mocked(fetchJson).mockResolvedValueOnce(page(250)).mockResolvedValueOnce(page(50));

  const vulnerabilities = await new PyxisService().getVulnerabilities('image');

  expect(vulnerabilities).toHaveLength(300);
  expect(fetchJson).toHaveBeenCalledTimes(2);
});

test('missing RPM manifest is an empty list, other errors throw', async () => {
  vi.mocked(fetchJson).mockResolvedValueOnce({
    data: { get_image_rpm_manifest: { error: { status: 404, detail: 'not found' }, data: null } },
  });
  expect(await new PyxisService().getPackages('image')).toEqual([]);

  vi.mocked(fetchJson).mockResolvedValueOnce({
    data: { find_image_files: { error: { status: 500, detail: 'boom' }, data: null } },
  });
  await expect(new PyxisService().getFiles('image')).rejects.toThrow('files failed: boom (500)');
});
