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
import type { Disposable, ProviderContainerConnection } from '@podman-desktop/api';
import { containerEngine as containerEngineAPI } from '@podman-desktop/api';
import type { LocalImage, LocalImages } from '@podman-desktop/extension-redhat-catalog-core-api';
import { connectionKey, Messages } from '@podman-desktop/extension-redhat-catalog-core-api';
import { inject, injectable, postConstruct, preDestroy } from 'inversify';
import { z } from 'zod';

import { imageNames } from '/@/services/image-names';
import { ProviderService } from '/@/services/provider-service';
import { WebviewService } from '/@/services/webview-service';
import type { AsyncInit } from '/@/utils/async-init';
import { Publisher } from '/@/utils/publisher';

const ImageEvent = z.object({
  Type: z.literal('image'),
  Action: z.literal(['pull', 'delete', 'remove', 'tag', 'untag', 'load', 'import']),
});

/**
 * Events come in bursts (a pull tags, a prune removes many images): refresh once.
 */
const REFRESH_DELAY_MS = 300;

/**
 * A copy of the local images (ids and names only) of every started container connection, refreshed on image events
 * and connection changes (start, stop, register), and published to the webview. The webview tells whether a repository
 * is pulled from this snapshot instantly, instead of listing the images of the engine for every search.
 */
@injectable()
export class LocalImagesService extends Publisher<LocalImages> implements AsyncInit, Disposable {
  #images: LocalImages = {};
  #disposables: Disposable[] = [];
  #timer: ReturnType<typeof setTimeout> | undefined;
  #refreshing: Promise<void> | undefined;
  #pending = false;

  constructor(
    @inject(WebviewService)
    webviewService: WebviewService,
    @inject(ProviderService)
    protected readonly providers: ProviderService,
  ) {
    super(webviewService, Messages.UPDATE_LOCAL_IMAGES, () => this.snapshot());
  }

  snapshot(): LocalImages {
    return this.#images;
  }

  /**
   * List the images of the started connections. Concurrent calls are coalesced: one refresh runs at a time, and a
   * refresh requested meanwhile runs once after it.
   */
  refresh(): Promise<void> {
    if (this.#refreshing) {
      this.#pending = true;
      return this.#refreshing;
    }
    this.#refreshing = this.#refresh().finally(() => {
      this.#refreshing = undefined;
      if (this.#pending) {
        this.#pending = false;
        this.refresh().catch(console.error);
      }
    });
    return this.#refreshing;
  }

  async #refresh(): Promise<void> {
    const next: LocalImages = {};
    await Promise.all(
      this.providers.getContainerConnections().map(async (connection: ProviderContainerConnection) => {
        if (connection.connection.status() !== 'started') return;
        const key = connectionKey({ providerId: connection.providerId, name: connection.connection.name });
        try {
          const images = await containerEngineAPI.listImages({ provider: connection.connection });
          next[key] = images.map((image): LocalImage => ({ id: image.Id, names: imageNames(image) }));
        } catch (err: unknown) {
          // keep the previous list of a connection that failed to answer (e.g. restarting)
          console.warn(`unable to list the images of ${key}`, err);
          if (this.#images[key]) next[key] = this.#images[key];
        }
      }),
    );
    this.#images = next;
    this.notify();
  }

  protected scheduleRefresh(): void {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.refresh().catch(console.error);
    }, REFRESH_DELAY_MS);
  }

  @postConstruct()
  async init(): Promise<void> {
    this.#disposables.push(
      containerEngineAPI.onEvent(event => {
        if (ImageEvent.safeParse(event).success) this.scheduleRefresh();
      }),
    );
    // connection registered, unregistered, started or stopped
    this.#disposables.push(this.providers.event(() => this.scheduleRefresh()));
    // not awaited: the extension activation does not wait on the container engines
    this.refresh().catch(console.error);
  }

  @preDestroy()
  override dispose(): void {
    super.dispose();
    clearTimeout(this.#timer);
    this.#disposables.forEach(disposable => disposable.dispose());
    this.#disposables = [];
  }
}
