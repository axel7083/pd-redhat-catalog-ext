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
import type { WebviewPanel } from '@podman-desktop/api';
import { beforeEach, expect, test, vi } from 'vitest';

import { PullTracker } from '/@/services/pull-tracker';
import type { WebviewService } from '/@/services/webview-service';

const postMessage = vi.fn().mockResolvedValue(true);
const WEBVIEW_SERVICE_MOCK = {
  getPanel: vi.fn(() => ({ webview: { postMessage } }) as unknown as WebviewPanel),
} as unknown as WebviewService;

beforeEach(() => {
  vi.clearAllMocks();
});

test('a pull is tracked until it succeeds', () => {
  const tracker = new PullTracker(WEBVIEW_SERVICE_MOCK);

  tracker.start('quay.io/a:1');
  expect(tracker.isPulling('quay.io/a:1')).toBe(true);
  expect(postMessage).toHaveBeenLastCalledWith({
    id: 'update-pulls',
    body: [expect.objectContaining({ image: 'quay.io/a:1', status: 'pulling' })],
  });

  tracker.succeed('quay.io/a:1');
  expect(tracker.all()).toEqual([]);
});

test('a failed pull is kept until dismissed or retried', () => {
  const tracker = new PullTracker(WEBVIEW_SERVICE_MOCK);

  tracker.start('quay.io/a:1');
  tracker.fail('quay.io/a:1', new Error('denied'));
  expect(tracker.all()).toEqual([expect.objectContaining({ status: 'failed', error: 'denied' })]);

  tracker.start('quay.io/a:1');
  expect(tracker.isPulling('quay.io/a:1')).toBe(true);

  tracker.fail('quay.io/a:1', 'again');
  tracker.dismiss('quay.io/a:1');
  expect(tracker.all()).toEqual([]);
});

test('dismiss ignores pulls in progress', () => {
  const tracker = new PullTracker(WEBVIEW_SERVICE_MOCK);

  tracker.start('quay.io/a:1');
  tracker.dismiss('quay.io/a:1');

  expect(tracker.isPulling('quay.io/a:1')).toBe(true);
});
