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
import { expect, test } from 'vitest';

import { isTimestampTag, pickPrimaryTag, sortTagsForDisplay } from './tags';

test.each([
  { tags: ['0', '0.29', '0.29.1', '0.29.1-1794283099', 'latest'], expected: '0.29.1' },
  {
    tags: ['0-builder', '0.29-builder', '0.29.1-builder', '0.29.1-builder-1794431771', '1794431771', 'latest-builder'],
    expected: '0.29.1-builder',
  },
  { tags: ['1', '1-1793872299', '1793872352', '9.9', '9.9-1793872299', 'latest'], expected: '9.9' },
  { tags: ['0.29.1-1794255913'], expected: '0.29.1-1794255913' },
  { tags: ['latest', '1794255913'], expected: 'latest' },
  { tags: [], expected: undefined },
])('pickPrimaryTag($tags) → $expected', ({ tags, expected }) => {
  expect(pickPrimaryTag(tags)).toBe(expected);
});

test('isTimestampTag', () => {
  expect(isTimestampTag('1794431771')).toBe(true);
  expect(isTimestampTag('9.9')).toBe(false);
});

test('sortTagsForDisplay puts the primary tag first and timestamps last', () => {
  expect(sortTagsForDisplay(['1794283099', '0.29.1-1794283099', 'latest', '0.29.1', '0'])).toEqual([
    '0.29.1',
    'latest',
    '0',
    '0.29.1-1794283099',
    '1794283099',
  ]);
});
