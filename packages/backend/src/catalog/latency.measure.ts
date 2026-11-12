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
import type { SearchQuery } from '@podman-desktop/extension-redhat-catalog-core-api';
import { expect, test } from 'vitest';

import { HydraSearchService } from '/@/services/hydra-search-service';
import { PyxisService } from '/@/services/pyxis-service';

/**
 * Cold latency (no cache) of every catalog request the UI makes, measured from Node like the extension backend.
 * Run with `pnpm measure`; set MEASURE_RUNS to change the number of runs per case (default 3).
 */
const RUNS = Number.parseInt(process.env['MEASURE_RUNS'] ?? '3', 10);

interface Row {
  case: string;
  'median (ms)': number;
  'min (ms)': number;
  'max (ms)': number;
}

async function measure(name: string, run: () => Promise<unknown>): Promise<Row> {
  const durations: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    await run();
    durations.push(performance.now() - start);
  }
  const sorted = durations.toSorted((a, b) => a - b);
  return {
    case: name,
    'median (ms)': Math.round(sorted[Math.floor(sorted.length / 2)]),
    'min (ms)': Math.round(sorted[0]),
    'max (ms)': Math.round(sorted[sorted.length - 1]),
  };
}

const SEARCHES: Array<[string, SearchQuery]> = [
  ['search: everything', {}],
  ['search: everything, hardened first', { hardenedFirst: true }],
  ['search: text "postgresql"', { text: 'postgresql' }],
  ['search: text + publisher filter', { text: 'python', filters: { partnerName: ['Red Hat'] } }],
  ['search: page 10', { page: 10 }],
];

const REPOSITORIES = [
  ['registry.access.redhat.com', 'rhel9/postgresql-16'],
  ['registry.access.redhat.com', 'hi/nginx'],
  ['registry.access.redhat.com', 'ubi9/ubi'],
] as const;

test('search latency', async () => {
  const rows: Row[] = [];
  for (const [name, query] of SEARCHES) {
    // a new service per run: no cache
    rows.push(await measure(name, () => new HydraSearchService().search(query)));
  }
  console.table(rows);
  expect(rows).toHaveLength(SEARCHES.length);
});

test('repository latency', async () => {
  const rows: Row[] = [];
  for (const [registry, repository] of REPOSITORIES) {
    rows.push(await measure(`detail: ${repository}`, () => new PyxisService().getRepository(registry, repository)));
    rows.push(await measure(`tags: ${repository}`, () => new PyxisService().getTags(registry, repository)));

    const detail = await new PyxisService().getRepository(registry, repository);
    const imageId = detail.find_repository_images_by_registry_path?.data?.[0]?._id;
    if (!imageId) continue;
    rows.push(await measure(`vulnerabilities: ${repository}`, () => new PyxisService().getVulnerabilities(imageId)));
    rows.push(await measure(`packages: ${repository}`, () => new PyxisService().getPackages(imageId)));
    rows.push(await measure(`containerfile: ${repository}`, () => new PyxisService().getFiles(imageId)));
  }

  const cached = new PyxisService();
  await cached.getRepository(...REPOSITORIES[0]);
  rows.push(await measure('detail: cached (prefetched on hover)', () => cached.getRepository(...REPOSITORIES[0])));

  console.table(rows);
  expect(rows.length).toBeGreaterThan(0);
});
