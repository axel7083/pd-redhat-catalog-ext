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
import { describe, expect, test } from 'vitest';

import { toContainerfile, toPackages, toRepositoryDetail } from '/@/catalog/repository-mapper';
import { HydraSearchService } from '/@/services/hydra-search-service';
import { PyxisService } from '/@/services/pyxis-service';

describe('Hydra search', () => {
  test('canonical query parses and returns facets', async () => {
    const result = await new HydraSearchService().search({ hardenedFirst: true, pageSize: 10 });

    expect(result.total).toBeGreaterThan(1_000);
    // every document must match the schema, otherwise it is dropped
    expect(result.repositories).toHaveLength(10);
    // the Hardened boost needs a score-first sort
    expect(result.repositories[0].buildCategories).toContain('Hardened');
    expect(result.facets.partnerName.length).toBeGreaterThan(10);
    expect(result.facets.build_categories_list.map(({ value }) => value)).toContain('Hardened');
  });

  test('text search finds a Red Hat repository', async () => {
    const result = await new HydraSearchService().search({
      text: 'postgresql',
      filters: { partnerName: ['Red Hat'] },
    });
    expect(result.repositories.some(({ repository }) => repository.startsWith('rhel9/postgresql'))).toBe(true);
    expect(result.repositories.every(({ publisher }) => publisher === 'Red Hat')).toBe(true);
  });
});

describe('Pyxis GraphQL', () => {
  test('repository requiring terms resolves to registry.redhat.io', async () => {
    const pyxis = new PyxisService();
    const detail = toRepositoryDetail(
      'registry.access.redhat.com',
      'rhel9/postgresql-16',
      await pyxis.getRepository('registry.access.redhat.com', 'rhel9/postgresql-16'),
    );

    expect(detail.pullTarget).toEqual(
      expect.objectContaining({ registry: 'registry.redhat.io', requiresLogin: true, reason: 'redhat-terms' }),
    );
    expect(detail.latestImages.map(({ architecture }) => architecture)).toContain('amd64');
    expect(detail.tagGroups.length).toBeGreaterThan(0);
    expect(detail.recommendedTag).not.toBe('latest');

    const amd64 = detail.latestImages.find(({ architecture }) => architecture === 'amd64');
    expect(amd64?.digest).toMatch(/^sha256:/);

    const [packages, files] = await Promise.all([pyxis.getPackages(amd64!.id), pyxis.getFiles(amd64!.id)]);
    expect(toPackages(packages).length).toBeGreaterThan(10);
    expect(toContainerfile(files)?.content).toContain('FROM');
  });

  test('hardened repository resolves to the anonymous registry', async () => {
    const detail = toRepositoryDetail(
      'registry.access.redhat.com',
      'hi/nginx',
      await new PyxisService().getRepository('registry.access.redhat.com', 'hi/nginx'),
    );
    expect(detail.pullTarget).toEqual(
      expect.objectContaining({ registry: 'registry.access.redhat.com', requiresLogin: false }),
    );
  });
});
