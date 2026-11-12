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

import { findLocalImage } from './local-images';

const CONNECTION = { providerId: 'podman', name: 'machine' };
const SNAPSHOT = {
  'podman:machine': [
    { id: 'a', names: ['quay.io/hummingbird/nginx:latest'] },
    { id: 'b', names: ['registry.access.redhat.com/hi/python:3.12'] },
  ],
};

test('finds the local image of a repository on a connection', () => {
  expect(
    findLocalImage(SNAPSHOT, CONNECTION, ['registry.access.redhat.com/hi/nginx', 'quay.io/hummingbird/nginx']),
  ).toEqual({
    id: 'a',
    name: 'quay.io/hummingbird/nginx:latest',
    connection: CONNECTION,
  });
});

test('nothing on another connection, or without connection', () => {
  expect(
    findLocalImage(SNAPSHOT, { providerId: 'podman', name: 'other' }, ['quay.io/hummingbird/nginx']),
  ).toBeUndefined();
  expect(findLocalImage(SNAPSHOT, undefined, ['quay.io/hummingbird/nginx'])).toBeUndefined();
});
