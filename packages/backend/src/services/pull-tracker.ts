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
import type { Disposable } from '@podman-desktop/api';
import type { PullStatus } from '@podman-desktop/extension-redhat-catalog-core-api';
import { Messages } from '@podman-desktop/extension-redhat-catalog-core-api';
import { inject, injectable, preDestroy } from 'inversify';

import { WebviewService } from '/@/services/webview-service';
import { Publisher } from '/@/utils/publisher';

/**
 * Pulls started from the extension. The webview components come and go (tabs, navigation); the pull state lives
 * here and is published on every change.
 */
@injectable()
export class PullTracker extends Publisher<PullStatus[]> implements Disposable {
  readonly #pulls = new Map<string, PullStatus>();

  constructor(
    @inject(WebviewService)
    webviewService: WebviewService,
  ) {
    super(webviewService, Messages.UPDATE_PULLS, () => this.all());
  }

  all(): PullStatus[] {
    return Array.from(this.#pulls.values());
  }

  isPulling(image: string): boolean {
    return this.#pulls.get(image)?.status === 'pulling';
  }

  start(image: string): void {
    this.#pulls.set(image, { image, status: 'pulling', startedAt: Date.now() });
    this.notify();
  }

  succeed(image: string): void {
    this.#pulls.delete(image);
    this.notify();
  }

  fail(image: string, err: unknown): void {
    const startedAt = this.#pulls.get(image)?.startedAt ?? Date.now();
    this.#pulls.set(image, {
      image,
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      startedAt,
    });
    this.notify();
  }

  dismiss(image: string): void {
    if (this.#pulls.get(image)?.status !== 'failed') return;
    this.#pulls.delete(image);
    this.notify();
  }

  @preDestroy()
  override dispose(): void {
    super.dispose();
    this.#pulls.clear();
  }
}
