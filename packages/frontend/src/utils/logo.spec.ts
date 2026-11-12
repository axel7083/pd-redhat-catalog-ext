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

import { classifyLogo, isCorsLogoHost } from '/@/utils/logo';

function pixels(rgba: [number, number, number, number], count = 4): Uint8ClampedArray {
  return new Uint8ClampedArray(Array.from({ length: count }, () => rgba).flat());
}

test('wide wordmarks', () => {
  expect(classifyLogo(1346, 309)).toBe('wide');
});

test('white artwork on a transparent background is light', () => {
  const data = new Uint8ClampedArray([...pixels([255, 255, 255, 255]), ...pixels([0, 0, 0, 0])]);
  expect(classifyLogo(300, 300, data)).toBe('light');
});

test('dark or colored artwork is dark', () => {
  expect(classifyLogo(300, 300, pixels([40, 40, 40, 255]))).toBe('dark');
  expect(classifyLogo(199, 150, pixels([238, 0, 0, 255]))).toBe('dark');
});

test('unreadable pixels default to dark', () => {
  expect(classifyLogo(300, 300)).toBe('dark');
  expect(classifyLogo(300, 300, pixels([0, 0, 0, 0]))).toBe('dark');
});

test.each([
  { url: 'https://connect.redhat.com/hydra/prm/v1/companies/123/logo', expected: true },
  { url: 'https://static.redhat.com/libs/redhat/brand-assets/latest/corp/logo--hat-only.svg', expected: false },
  { url: 'not a url', expected: false },
])('isCorsLogoHost($url)', ({ url, expected }) => {
  expect(isCorsLogoHost(url)).toBe(expected);
});
