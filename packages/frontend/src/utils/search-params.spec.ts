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

import { hasFilters, toggleFilter, toSearchParams, toSearchQuery, updateQuery } from '/@/utils/search-params';

describe('search params', () => {
  test('round trip', () => {
    const query = {
      text: 'postgresql',
      filters: { partnerName: ['Red Hat', 'Acme'], architecture: ['arm64'] },
      sort: 'title-asc' as const,
      page: 2,
      includeDeprecated: true,
      hardenedFirst: true,
    };

    expect(toSearchQuery(toSearchParams(query))).toEqual(query);
  });

  test('defaults are omitted from the URL', () => {
    expect(toSearchParams({ text: '  ', sort: 'relevance', page: 0 }).toString()).toBe('');
  });

  test('invalid values fall back to defaults', () => {
    const query = toSearchQuery(new URLSearchParams('sort=nope&page=-4&f.unknown=x'));

    expect(query.sort).toBe('relevance');
    expect(query.page).toBe(0);
    expect(query.filters).toEqual({});
  });

  test('page is 1-based in the URL', () => {
    expect(toSearchParams({ page: 1 }).get('page')).toBe('2');
    expect(toSearchQuery(new URLSearchParams('page=2')).page).toBe(1);
  });
});

test('updateQuery resets the page', () => {
  expect(updateQuery({ page: 5, text: 'a' }, { text: 'b' })).toEqual({ page: 0, text: 'b' });
});

test('toggleFilter adds then removes a value', () => {
  const added = toggleFilter({ page: 3 }, 'architecture', 'amd64');
  expect(added.filters?.architecture).toEqual(['amd64']);
  expect(added.page).toBe(0);
  expect(hasFilters(added)).toBe(true);

  const removed = toggleFilter(added, 'architecture', 'amd64');
  expect(removed.filters?.architecture).toEqual([]);
  expect(hasFilters(removed)).toBe(false);
});
