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

import { renderDescription } from '/@/utils/markdown';

test('markdown is rendered', () => {
  expect(renderDescription('# Title\n\n`code`', 'markdown')).toContain('<h1>Title</h1>');
});

test('scripts and event handlers are removed', () => {
  const html = renderDescription('<p onclick="alert(1)">x</p><script>alert(1)</script>', 'html');

  expect(html).toBe('<p>x</p>');
});

test('markdown cannot inject scripts either', () => {
  expect(renderDescription('<img src=x onerror="alert(1)">', 'markdown')).not.toContain('onerror');
});
