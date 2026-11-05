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

interface Entry<V> {
  promise: Promise<V>;
  expiresAt: number;
}

/**
 * In-memory cache of promises with a time-to-live and in-flight de-duplication:
 * concurrent `get` calls for the same key share a single loader call, and a rejected
 * load is evicted immediately so the next call retries.
 *
 * The catalog APIs send no cache headers and Pyxis takes ~2s per detail query, hence this cache.
 */
export class TtlCache<V> {
  readonly #entries = new Map<string, Entry<V>>();

  constructor(
    protected readonly ttlMs: number,
    protected readonly maxEntries: number = 200,
    protected readonly now: () => number = Date.now,
  ) {}

  get(key: string, loader: () => Promise<V>): Promise<V> {
    const existing = this.#entries.get(key);
    if (existing && existing.expiresAt > this.now()) {
      // refresh the insertion order so the least recently used entry is evicted first
      this.#entries.delete(key);
      this.#entries.set(key, existing);
      return existing.promise;
    }

    const promise = loader();
    const entry: Entry<V> = { promise, expiresAt: this.now() + this.ttlMs };
    this.#entries.delete(key);
    this.#entries.set(key, entry);
    this.#evict();

    promise.catch(() => {
      if (this.#entries.get(key) === entry) this.#entries.delete(key);
    });
    return promise;
  }

  has(key: string): boolean {
    const existing = this.#entries.get(key);
    return !!existing && existing.expiresAt > this.now();
  }

  clear(): void {
    this.#entries.clear();
  }

  get size(): number {
    return this.#entries.size;
  }

  #evict(): void {
    while (this.#entries.size > this.maxEntries) {
      const oldest = this.#entries.keys().next();
      if (oldest.done) return;
      this.#entries.delete(oldest.value);
    }
  }
}
