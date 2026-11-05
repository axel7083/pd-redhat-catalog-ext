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

import { fireEvent, render } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';

import FacetPanel from './FacetPanel.svelte';

const VALUES = Array.from({ length: 12 }, (_, index) => ({ value: `publisher-${index}`, count: 100 - index }));

test('only the first values are shown until expanded', async () => {
  const { getByText, queryByText } = render(FacetPanel, {
    label: 'Publisher',
    values: VALUES,
    selected: [],
    ontoggle: vi.fn(),
  });

  expect(getByText('publisher-0')).toBeInTheDocument();
  expect(queryByText('publisher-11')).not.toBeInTheDocument();

  await fireEvent.click(getByText('Show all (12)'));
  expect(getByText('publisher-11')).toBeInTheDocument();
});

test('selected values are listed first, even without results', () => {
  const { getAllByRole } = render(FacetPanel, {
    label: 'Publisher',
    values: VALUES,
    selected: ['publisher-11', 'gone'],
    ontoggle: vi.fn(),
  });

  const items = getAllByRole('listitem').map(item => item.textContent?.trim());
  expect(items[0]).toContain('publisher-11');
  expect(items[1]).toContain('gone');
});

test('long lists can be filtered', async () => {
  const { getByLabelText, getAllByRole } = render(FacetPanel, {
    label: 'Publisher',
    values: VALUES,
    selected: [],
    ontoggle: vi.fn(),
  });

  await fireEvent.input(getByLabelText('Filter Publisher'), { target: { value: 'publisher-1' } });

  // publisher-1, publisher-10, publisher-11
  expect(getAllByRole('listitem')).toHaveLength(3);
});

test('nothing is rendered without values', () => {
  const { container } = render(FacetPanel, { label: 'Publisher', values: [], selected: [], ontoggle: vi.fn() });

  expect(container.querySelector('section')).toBeNull();
});
