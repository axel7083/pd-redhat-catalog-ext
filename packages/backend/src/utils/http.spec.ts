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
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { fetchJson, HttpError, isRetryable, USER_AGENT } from '/@/utils/http';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, statusText: status === 200 ? 'OK' : 'Error' });
}

test('identifies itself with the extension user agent', async () => {
  fetchMock.mockResolvedValue(json({ ok: true }));

  expect(await fetchJson('https://example.com')).toEqual({ ok: true });
  const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
  expect(headers.get('user-agent')).toBe(USER_AGENT);
});

test('retries once on a server error', async () => {
  fetchMock.mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json({ ok: true }));

  expect(await fetchJson('https://example.com')).toEqual({ ok: true });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('retries once on a timeout, then fails', async () => {
  fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'));

  await expect(fetchJson('https://example.com')).rejects.toThrow('timed out');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('client errors are not retried', async () => {
  fetchMock.mockResolvedValue(json({}, 404));

  await expect(fetchJson('https://example.com')).rejects.toThrow(HttpError);
  expect(fetchMock).toHaveBeenCalledOnce();
});

test.each([
  { err: new HttpError(502, 'u', 'bad gateway'), expected: true },
  { err: new HttpError(400, 'u', 'bad request'), expected: false },
  { err: new DOMException('t', 'TimeoutError'), expected: true },
  { err: new DOMException('a', 'AbortError'), expected: false },
  { err: new TypeError('fetch failed'), expected: true },
  { err: new Error('other'), expected: false },
])('isRetryable($err)', ({ err, expected }) => {
  expect(isRetryable(err)).toBe(expected);
});
