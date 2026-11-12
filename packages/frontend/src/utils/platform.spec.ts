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
import type { CatalogImage } from '@podman-desktop/extension-redhat-catalog-core-api';
import { expect, test } from 'vitest';

import { selectImage } from '/@/utils/platform';

const IMAGES = ['amd64', 'arm64'].map(architecture => ({ id: architecture, architecture, tags: [] }) as CatalogImage);

test.each([
  { requested: 'arm64', host: 'amd64', expected: 'arm64' },
  { requested: undefined, host: 'arm64', expected: 'arm64' },
  { requested: 's390x', host: 'ppc64le', expected: 'amd64' },
  { requested: undefined, host: undefined, expected: 'amd64' },
])('selectImage($requested, host $host) → $expected', ({ requested, host, expected }) => {
  expect(selectImage(IMAGES, requested, host)?.architecture).toBe(expected);
});

test('no image', () => {
  expect(selectImage([], 'amd64', 'amd64')).toBeUndefined();
});
