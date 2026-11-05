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

import { resolvePullTarget } from '/@/catalog/registry-resolver';

test.each([
  {
    name: 'Red Hat repository with terms → registry.redhat.io',
    input: {
      registry: 'registry.access.redhat.com',
      repository: 'rhel9/postgresql-16',
      vendorLabel: 'redhat',
      requiresTerms: true,
    },
    expected: { registry: 'registry.redhat.io', requiresLogin: true, redHatLogin: true, reason: 'redhat-terms' },
  },
  {
    name: 'Red Hat repository without terms → registry.access.redhat.com',
    input: {
      registry: 'registry.access.redhat.com',
      repository: 'hi/nginx',
      vendorLabel: 'redhat',
      requiresTerms: false,
    },
    expected: {
      registry: 'registry.access.redhat.com',
      requiresLogin: false,
      redHatLogin: false,
      reason: 'redhat-public',
    },
  },
  {
    name: 'certified partner → registry.connect.redhat.com, login required',
    input: {
      registry: 'registry.connect.redhat.com',
      repository: 'sonatype/nexus',
      vendorLabel: 'sonatype',
      requiresTerms: false,
    },
    expected: { registry: 'registry.connect.redhat.com', requiresLogin: true, redHatLogin: false, reason: 'partner' },
  },
  {
    name: 'partner on quay.io → as-is',
    input: { registry: 'quay.io', repository: 'acme/app', vendorLabel: 'acme', requiresTerms: true },
    expected: { registry: 'quay.io', requiresLogin: false, redHatLogin: false, reason: 'partner' },
  },
  {
    name: 'partner re-hosting under a Red Hat registry is not a Red Hat repository',
    input: {
      registry: 'registry.access.redhat.com',
      repository: 'rhel9/thing',
      vendorLabel: 'acme',
      requiresTerms: true,
    },
    expected: { registry: 'registry.access.redhat.com', requiresLogin: false, redHatLogin: false, reason: 'partner' },
  },
])('$name', ({ input, expected }) => {
  expect(resolvePullTarget(input)).toEqual({ ...expected, repository: input.repository });
});
