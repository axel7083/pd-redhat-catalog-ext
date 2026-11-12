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

/**
 * Identify Podman Desktop to the catalog APIs instead of impersonating the catalog website.
 */
export const USER_AGENT = 'podman-desktop-redhat-catalog';

/**
 * Per-attempt timeout. The catalog APIs answer in ~0.3-0.9s, but Pyxis has random 8-24s outliers
 * (see `pnpm measure`): a stalled request is abandoned and retried instead of blocking the UI.
 */
export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_RETRIES = 1;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Timeouts, network failures and server errors are worth retrying; client errors are not.
 */
export function isRetryable(err: unknown): boolean {
  if (err instanceof HttpError) return err.status >= 500;
  if (err instanceof DOMException) return err.name === 'TimeoutError';
  // fetch rejects with a TypeError on network failures
  return err instanceof TypeError;
}

/**
 * GET or POST (read-only GraphQL queries) a JSON document, with a timeout per attempt and retries
 * on retryable errors. Every catalog request is a read, so retrying is safe.
 */
export async function fetchJson(
  url: string | URL,
  init: RequestInit = {},
  options: { timeoutMs?: number; retries?: number } = {},
): Promise<unknown> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchOnce(url, init, timeoutMs);
    } catch (err: unknown) {
      if (attempt >= retries || !isRetryable(err)) throw err;
      console.warn(`retrying ${String(url)} after ${String(err)}`);
    }
  }
}

async function fetchOnce(url: string | URL, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  headers.set('user-agent', USER_AGENT);

  const response = await fetch(url, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new HttpError(response.status, String(url), `${response.status} ${response.statusText} for ${String(url)}`);
  }
  return response.json();
}
