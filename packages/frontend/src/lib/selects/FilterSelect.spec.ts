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

import { fireEvent, render, within } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';

import FilterSelect from './FilterSelect.svelte';

const OPTIONS = Array.from({ length: 10 }, (_, index) => ({ value: `category-${index}`, count: 100 - index }));

test.each([
  { selected: [], summary: 'Category' },
  { selected: ['category-1'], summary: 'category-1' },
  { selected: ['category-1', 'category-2'], summary: 'Category · 2' },
])('summary with $selected.length selected values', ({ selected, summary }) => {
  const { getByRole } = render(FilterSelect, { label: 'Category', options: OPTIONS, selected, onchange: vi.fn() });

  expect(getByRole('button', { name: 'Category' })).toHaveTextContent(summary);
});

test('toggling values keeps the list open and reports the selection', async () => {
  const onchange = vi.fn();
  const { getByRole, getByTitle } = render(FilterSelect, {
    label: 'Category',
    options: OPTIONS,
    selected: ['category-1'],
    onchange,
  });

  await fireEvent.click(getByRole('button', { name: 'Category' }));
  await fireEvent.click(within(getByTitle('category-3')).getByRole('checkbox'));

  expect(onchange).toHaveBeenCalledWith(['category-1', 'category-3']);
  expect(getByRole('listbox')).toBeInTheDocument();
});

test('long lists can be searched', async () => {
  const { getByRole, getByLabelText, getAllByRole } = render(FilterSelect, {
    label: 'Category',
    options: OPTIONS,
    selected: [],
    onchange: vi.fn(),
  });

  await fireEvent.click(getByRole('button', { name: 'Category' }));
  await fireEvent.input(getByLabelText('Search Category'), { target: { value: 'category-9' } });

  expect(getAllByRole('option')).toHaveLength(1);
});

test('the clear button removes every value', async () => {
  const onchange = vi.fn();
  const { getByRole } = render(FilterSelect, {
    label: 'Category',
    options: OPTIONS,
    selected: ['category-1'],
    onchange,
  });

  await fireEvent.click(getByRole('button', { name: 'Clear Category' }));

  expect(onchange).toHaveBeenCalledWith([]);
});

test('Escape closes the list', async () => {
  const { getByRole, queryByRole } = render(FilterSelect, {
    label: 'Category',
    options: OPTIONS,
    selected: [],
    onchange: vi.fn(),
  });

  await fireEvent.click(getByRole('button', { name: 'Category' }));
  await fireEvent.keyDown(getByRole('listbox'), { key: 'Escape' });

  expect(queryByRole('listbox')).not.toBeInTheDocument();
});

test('a selected value without results stays listed', async () => {
  const { getByRole, getAllByRole } = render(FilterSelect, {
    label: 'Category',
    options: OPTIONS,
    selected: ['gone'],
    onchange: vi.fn(),
  });

  await fireEvent.click(getByRole('button', { name: 'Category' }));

  // first, and selected
  expect(getAllByRole('option')[0]).toHaveTextContent('gone');
  expect(getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
});

test.each([
  { name: 'fits: aligned on the left of the trigger', right: 500, aligned: 'left-0' },
  { name: 'overflows the page: aligned on the right of the trigger', right: 5000, aligned: 'right-0' },
])('list $name', async ({ right, aligned }) => {
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1024);
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ right } as DOMRect);
  const { getByRole } = render(FilterSelect, { label: 'Category', options: OPTIONS, selected: [], onchange: vi.fn() });

  await fireEvent.click(getByRole('button', { name: 'Category' }));

  expect(getByRole('listbox')).toHaveClass(aligned);
  rect.mockRestore();
});

test('opening the list does not scroll the page to its search input', async () => {
  const focus = vi.spyOn(HTMLInputElement.prototype, 'focus');
  const { getByRole } = render(FilterSelect, { label: 'Category', options: OPTIONS, selected: [], onchange: vi.fn() });

  await fireEvent.click(getByRole('button', { name: 'Category' }));

  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  focus.mockRestore();
});
