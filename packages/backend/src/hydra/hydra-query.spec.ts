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

import { buildHydraSearchParams, facetFilter, HYDRA_CLIENT, quoteSolrValue } from '/@/hydra/hydra-query';

describe('buildHydraSearchParams', () => {
  test('default query matches everything and hides deprecated repositories', () => {
    const params = buildHydraSearchParams({});

    expect(params.get('q')).toBe('*:*');
    expect(params.get('redhat_client')).toBe(HYDRA_CLIENT);
    expect(params.getAll('fq')).toEqual([
      'language:(en)',
      '-documentKind:Cve',
      'documentKind:"ContainerRepository"',
      '-release_categories:"Deprecated"',
    ]);
    expect(params.get('sort')).toBe('score desc,lastModifiedDate desc');
    expect(params.get('start')).toBe('0');
    expect(params.get('rows')).toBe('24');
    // the landing page ranks Hardened images, then Red Hat repositories
    expect(params.getAll('bq')).toEqual(['build_categories_list:Hardened^1000', 'partnerName:"Red Hat"^100']);
  });

  test('never requests the id facet', () => {
    const params = buildHydraSearchParams({});

    expect(params.getAll('facet.field')).toHaveLength(6);
    expect(params.getAll('facet.field').some(field => field.endsWith('}id'))).toBe(false);
  });

  test('includeDeprecated removes the deprecated filter', () => {
    const params = buildHydraSearchParams({ includeDeprecated: true });

    expect(params.getAll('fq')).not.toContain('-release_categories:"Deprecated"');
  });

  test('hardenedFirst boosts Hardened images with a score-first sort', () => {
    const params = buildHydraSearchParams({ hardenedFirst: true });

    expect(params.get('bq')).toBe('build_categories_list:Hardened^1000');
    expect(params.get('sort')?.startsWith('score desc')).toBe(true);
  });

  test('text, pagination and sort', () => {
    const params = buildHydraSearchParams({ text: '  postgresql ', page: 2, pageSize: 10, sort: 'title-asc' });

    expect(params.get('q')).toBe('postgresql');
    expect(params.get('start')).toBe('20');
    expect(params.get('rows')).toBe('10');
    expect(params.get('sort')).toBe('sortTitle asc');
  });

  test('page size is clamped', () => {
    expect(buildHydraSearchParams({ pageSize: 10_000 }).get('rows')).toBe('100');
    expect(buildHydraSearchParams({ pageSize: 0, page: -3 }).get('rows')).toBe('1');
    expect(buildHydraSearchParams({ pageSize: 0, page: -3 }).get('start')).toBe('0');
  });

  test('facet filters are tagged and facets exclude their own filter', () => {
    const params = buildHydraSearchParams({
      filters: { partnerName: ['Red Hat', 'Acme'], architecture: [] },
    });

    expect(params.getAll('fq')).toContain('{!tag=partnerName_tag}partnerName:("Red Hat" OR "Acme")');
    expect(params.getAll('fq').some(fq => fq.includes('architecture'))).toBe(false);
    expect(params.getAll('facet.field')).toContain('{!ex=partnerName_tag}partnerName');
  });
});

test('quoteSolrValue escapes quotes and backslashes', () => {
  expect(quoteSolrValue('a "b" \\ c')).toBe('"a \\"b\\" \\\\ c"');
});

test('facetFilter', () => {
  expect(facetFilter('architecture', ['amd64'])).toBe('{!tag=architecture_tag}architecture:("amd64")');
});

test.each([
  { scope: 'all' as const, expected: [] },
  { scope: 'redhat' as const, expected: ['partnerName:"Red Hat"'] },
  { scope: 'hardened' as const, expected: ['build_categories_list:"Hardened"'] },
  { scope: 'partners' as const, expected: ['-partnerName:"Red Hat"'] },
])('scope $scope', ({ scope, expected }) => {
  // after the 3 base filters and the deprecated filter
  expect(buildHydraSearchParams({ scope }).getAll('fq').slice(4)).toEqual(expected);
});

test.each([
  { name: 'search text', query: { text: 'nginx' } },
  { name: 'another sort', query: { sort: 'title-asc' as const } },
  { name: 'another scope', query: { scope: 'partners' as const } },
])('no default boost with $name', ({ query }) => {
  expect(buildHydraSearchParams(query).getAll('bq')).toEqual([]);
});
