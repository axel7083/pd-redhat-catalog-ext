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

import { appLocation } from './location';

test('keeps the path and the query', () => {
  expect(appLocation(new URL('http://webview.localhost/repository/r/ubi9/ubi?tab=packages&arch=arm64'))).toBe(
    '/repository/r/ubi9/ubi?tab=packages&arch=arm64',
  );
});

test('drops the webviewId added by Podman Desktop', () => {
  expect(appLocation(new URL('http://webview.localhost/?webviewId=7'))).toBe('/');
  expect(appLocation(new URL('http://webview.localhost/?webviewId=7&q=ubi'))).toBe('/?q=ubi');
});
