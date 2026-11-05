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
import type { Disposable, ImageInfo, ProviderContainerConnection, TelemetryLogger } from '@podman-desktop/api';
import {
  containerEngine as containerEngineAPI,
  navigation as navigationAPI,
  ProgressLocation,
  window as windowAPI,
} from '@podman-desktop/api';
import type {
  ProviderContainerConnectionIdentifierInfo,
  SimpleImageInfo,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import { matchesImagePrefix, Messages } from '@podman-desktop/extension-redhat-catalog-core-api';
import { inject, injectable, postConstruct, preDestroy } from 'inversify';
import { z } from 'zod';

import { REGISTRY_REDHAT_IO } from '/@/catalog/registry-resolver';
import { TelemetryLoggerSymbol } from '/@/inject/symbol';
import { AuthService } from '/@/services/auth-service';
import { ProviderService } from '/@/services/provider-service';
import { WebviewService } from '/@/services/webview-service';
import type { AsyncInit } from '/@/utils/async-init';
import { Publisher } from '/@/utils/publisher';
import { TelemetryEvents } from '/@/utils/telemetry-events';

const ImageEvent = z.object({
  Type: z.literal('image'),
  Action: z.literal(['pull', 'delete', 'remove', 'tag', 'untag']),
});

const AUTH_ERROR = /unauthorized|authentication required|\b401\b|\b403\b|access denied|denied: /i;

export function isAuthenticationError(err: unknown): boolean {
  return AUTH_ERROR.test(err instanceof Error ? err.message : String(err));
}

export const SIGN_IN_ACTION = 'Sign in with Red Hat';

/**
 * Local image names of an image: its tags, and its digests for images pulled by digest.
 */
export function imageNames(image: Pick<ImageInfo, 'RepoTags' | 'RepoDigests'>): string[] {
  return [...(image.RepoTags ?? []), ...(image.RepoDigests ?? [])];
}

@injectable()
export class ImageService extends Publisher<void> implements AsyncInit, Disposable {
  #disposables: Disposable[] = [];

  constructor(
    @inject(TelemetryLoggerSymbol)
    protected readonly telemetryLogger: TelemetryLogger,
    @inject(WebviewService)
    webviewService: WebviewService,
    @inject(ProviderService)
    protected readonly providers: ProviderService,
    @inject(AuthService)
    protected readonly auth: AuthService,
  ) {
    super(webviewService, Messages.UPDATE_IMAGES, () => {});
  }

  public async pull(options: { image: string; connection: ProviderContainerConnection }): Promise<SimpleImageInfo> {
    const telemetry: Record<string, unknown> = {
      registry: options.image.split('/')[0],
      byDigest: options.image.includes('@'),
    };

    try {
      try {
        return await this.#pull(options, telemetry);
      } catch (err: unknown) {
        if (!(await this.#offerSignIn(options.image, err))) throw err;
        telemetry['retriedAfterSignIn'] = true;
        return await this.#pull(options, telemetry);
      }
    } catch (err: unknown) {
      telemetry['error'] = String(err);
      throw err;
    } finally {
      this.telemetryLogger.logUsage(TelemetryEvents.PULL_IMAGE, telemetry);
    }
  }

  /**
   * On an authentication failure for registry.redhat.io, offer to sign in with Red Hat.
   * @returns true if the user signed in and the pull should be retried
   */
  async #offerSignIn(image: string, err: unknown): Promise<boolean> {
    if (!image.startsWith(`${REGISTRY_REDHAT_IO}/`) || !isAuthenticationError(err)) return false;

    if (!this.auth.isProviderAvailable()) {
      const install = 'Install Red Hat Authentication';
      const answer = await windowAPI.showWarningMessage(
        `Pulling from ${REGISTRY_REDHAT_IO} requires a Red Hat account. Install the Red Hat Authentication extension to sign in, or add the registry credentials in Settings > Registries.`,
        install,
        'Cancel',
      );
      if (answer === install) await this.auth.installAuthenticationExtension();
      return false;
    }

    const answer = await windowAPI.showWarningMessage(
      `Pulling from ${REGISTRY_REDHAT_IO} requires a Red Hat account. Sign in to configure the registry credentials.`,
      SIGN_IN_ACTION,
      'Cancel',
    );
    if (answer !== SIGN_IN_ACTION) return false;

    const status = await this.auth.signIn();
    return status.signedIn;
  }

  async #pull(
    options: { image: string; connection: ProviderContainerConnection },
    telemetry: Record<string, unknown>,
  ): Promise<SimpleImageInfo> {
    return windowAPI.withProgress(
      {
        location: ProgressLocation.TASK_WIDGET,
        title: `Pulling ${options.image}`,
        cancellable: true,
      },
      async (_, token) => {
        token.onCancellationRequested(() => (telemetry['cancelled'] = true));

        await containerEngineAPI.pullImage(options.connection.connection, options.image, () => {}, undefined, token);
        const images = await containerEngineAPI.listImages({
          provider: options.connection.connection,
        });
        const image = images.find(image => imageNames(image).includes(options.image));
        if (!image) throw new Error(`Cannot find image ${options.image}`);
        return {
          name: options.image,
          connection: this.providers.toProviderContainerConnectionDetailedInfo(options.connection),
          id: image.Id,
        };
      },
    );
  }

  public async all(options: {
    connection: ProviderContainerConnection;
    prefixes: string[];
  }): Promise<SimpleImageInfo[]> {
    const images = await containerEngineAPI.listImages({
      provider: options.connection.connection,
    });

    const connection: ProviderContainerConnectionIdentifierInfo = {
      providerId: options.connection.providerId,
      name: options.connection.connection.name,
    };

    return images.reduce((accumulator, current) => {
      const name = imageNames(current).find(name => matchesImagePrefix(name, options.prefixes));
      if (name) {
        accumulator.push({
          id: current.Id,
          name,
          connection,
        });
      }
      return accumulator;
    }, [] as SimpleImageInfo[]);
  }

  async #getEngineId(image: SimpleImageInfo): Promise<string> {
    const connection = this.providers.getProviderContainerConnection(image.connection);
    const info = await containerEngineAPI.listInfos({
      provider: connection.connection,
    });
    if (info.length !== 1) throw new Error('Unexpected number of connections');
    return info[0].engineId;
  }

  public async navigateToImageDetails(image: SimpleImageInfo): Promise<void> {
    return navigationAPI.navigateToImage(image.id, await this.#getEngineId(image), image.name);
  }

  public async navigateToImageRun(image: SimpleImageInfo): Promise<void> {
    return navigationAPI.navigateToImageRun(image.id, await this.#getEngineId(image), image.name);
  }

  @preDestroy()
  override dispose(): void {
    super.dispose();
    this.#disposables.forEach((disposable: Disposable) => disposable.dispose());
  }

  @postConstruct()
  async init(): Promise<void> {
    this.#disposables.push(
      containerEngineAPI.onEvent(event => {
        if (!ImageEvent.safeParse(event).success) return;
        this.notify();
      }),
    );
  }
}
