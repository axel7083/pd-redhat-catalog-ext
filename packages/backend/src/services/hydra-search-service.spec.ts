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

import { HydraSearchService } from '/@/services/hydra-search-service';
import { fetchJson } from '/@/utils/http';

vi.mock(import('/@/utils/http'));

const DOC = {
  id: 'id1',
  registry: 'registry.access.redhat.com',
  repository: 'hi/nginx',
  partnerName: 'Red Hat',
  allTitle: 'Red Hat Hardened Images nginx',
  display_data_short_description: 'nginx',
  architecture: ['amd64'],
  build_categories_list: ['Hardened'],
  release_categories: ['Generally Available'],
  repository_tags: ['latest'],
  freshness_grades_json: [JSON.stringify(JSON.stringify([{ grade: 'A', start_date: { $date: 0 } }]))],
  view_uri: 'https://catalog.redhat.com/software/containers/hi/nginx/id1',
};

const RESPONSE = {
  response: { numFound: 2, start: 0, docs: [DOC, { id: 'broken' }] },
  facet_counts: { facet_fields: { partnerName: ['Red Hat', 2] } },
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchJson).mockResolvedValue(RESPONSE);
});

test('search maps documents, drops invalid ones and fills missing facets', async () => {
  const result = await new HydraSearchService().search({ text: 'nginx' });

  expect(result.total).toBe(2);
  expect(result.page).toBe(0);
  expect(result.repositories).toEqual([
    expect.objectContaining({
      id: 'id1',
      repository: 'hi/nginx',
      title: 'Red Hat Hardened Images nginx',
      publisher: 'Red Hat',
      freshnessGrade: 'A',
      catalogUrl: DOC.view_uri,
    }),
  ]);
  expect(result.facets.partnerName).toEqual([{ value: 'Red Hat', count: 2 }]);
  expect(result.facets.architecture).toEqual([]);
});

test('identical queries are served from the cache', async () => {
  const service = new HydraSearchService();

  await service.search({ text: 'nginx' });
  await service.search({ text: 'nginx' });
  await service.search({ text: 'httpd' });

  expect(fetchJson).toHaveBeenCalledTimes(2);
});

test('an unexpected response is reported', async () => {
  vi.mocked(fetchJson).mockResolvedValue({ unexpected: true });

  await expect(new HydraSearchService().search({})).rejects.toThrow('Unexpected response from the catalog search');
});
