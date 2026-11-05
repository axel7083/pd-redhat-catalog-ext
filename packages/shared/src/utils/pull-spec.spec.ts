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

import { localImagePrefixes, matchesImagePrefix, toPullSpec } from './pull-spec';

const TARGET = { registry: 'registry.access.redhat.com', repository: 'hi/nginx' };

test('toPullSpec prefers the digest', () => {
  expect(toPullSpec(TARGET, { tag: '1.29' })).toBe('registry.access.redhat.com/hi/nginx:1.29');
  expect(toPullSpec(TARGET, { tag: '1.29', digest: 'sha256:abc' })).toBe(
    'registry.access.redhat.com/hi/nginx@sha256:abc',
  );
  expect(toPullSpec(TARGET, {})).toBe('registry.access.redhat.com/hi/nginx:latest');
});

test('hardened repositories also match the Hummingbird images', () => {
  expect(localImagePrefixes(TARGET)).toEqual(['registry.access.redhat.com/hi/nginx', 'quay.io/hummingbird/nginx']);
  expect(localImagePrefixes({ registry: 'registry.redhat.io', repository: 'rhel9/postgresql-16' })).toEqual([
    'registry.redhat.io/rhel9/postgresql-16',
  ]);
});

test('matchesImagePrefix requires a tag or digest separator', () => {
  const prefixes = localImagePrefixes(TARGET);
  expect(matchesImagePrefix('quay.io/hummingbird/nginx:latest', prefixes)).toBe(true);
  expect(matchesImagePrefix('registry.access.redhat.com/hi/nginx@sha256:abc', prefixes)).toBe(true);
  expect(matchesImagePrefix('registry.access.redhat.com/hi/nginx-unprivileged:latest', prefixes)).toBe(false);
});
