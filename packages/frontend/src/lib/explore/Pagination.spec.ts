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

import Pagination from './Pagination.svelte';

test('shows the range and navigates', async () => {
  const onpage = vi.fn();
  const { getByText, getByRole } = render(Pagination, { page: 1, pageSize: 24, total: 100, onpage });

  expect(getByText('25–48 of 100')).toBeInTheDocument();
  expect(getByText('Page 2 of 5')).toBeInTheDocument();

  await fireEvent.click(getByRole('button', { name: 'Next page' }));
  expect(onpage).toHaveBeenCalledWith(2);
});

test('previous is disabled on the first page and next on the last', () => {
  const { getByRole } = render(Pagination, { page: 0, pageSize: 24, total: 10, onpage: vi.fn() });

  expect(getByRole('button', { name: 'Previous page' })).toBeDisabled();
  expect(getByRole('button', { name: 'Next page' })).toBeDisabled();
});
