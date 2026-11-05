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
import { expect, test, vi } from 'vitest';

import { TtlCache } from '/@/utils/ttl-cache';

test('concurrent gets share a single load', async () => {
  const cache = new TtlCache<number>(1_000);
  const loader = vi.fn().mockResolvedValue(42);

  const [a, b] = await Promise.all([cache.get('key', loader), cache.get('key', loader)]);

  expect(a).toBe(42);
  expect(b).toBe(42);
  expect(loader).toHaveBeenCalledOnce();
});

test('entries expire after the ttl', async () => {
  let now = 0;
  const cache = new TtlCache<number>(1_000, 10, () => now);
  const loader = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

  expect(await cache.get('key', loader)).toBe(1);
  now = 999;
  expect(await cache.get('key', loader)).toBe(1);
  now = 1_000;
  expect(await cache.get('key', loader)).toBe(2);
});

test('rejected loads are evicted so the next get retries', async () => {
  const cache = new TtlCache<number>(1_000);
  const loader = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(1);

  await expect(cache.get('key', loader)).rejects.toThrow('boom');
  expect(cache.has('key')).toBe(false);
  expect(await cache.get('key', loader)).toBe(1);
});

test('the least recently used entry is evicted above max entries', async () => {
  const cache = new TtlCache<string>(1_000, 2);

  await cache.get('a', async () => 'a');
  await cache.get('b', async () => 'b');
  // touch a, so b becomes the least recently used
  await cache.get('a', async () => 'unused');
  await cache.get('c', async () => 'c');

  expect(cache.size).toBe(2);
  expect(cache.has('a')).toBe(true);
  expect(cache.has('b')).toBe(false);
  expect(cache.has('c')).toBe(true);
});
