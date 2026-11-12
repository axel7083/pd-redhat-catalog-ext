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
import type { ProviderContainerConnection, TelemetryLogger } from '@podman-desktop/api';
import {
  containerEngine as containerEngineAPI,
  navigation as navigationAPI,
  ProgressLocation,
  window as windowAPI,
} from '@podman-desktop/api';
import type { SimpleImageInfo } from '@podman-desktop/extension-redhat-catalog-core-api';
import { inject, injectable } from 'inversify';

import { REGISTRY_REDHAT_IO } from '/@/catalog/registry-resolver';
import { TelemetryLoggerSymbol } from '/@/inject/symbol';
import { AuthService } from '/@/services/auth-service';
import { imageNames } from '/@/services/image-names';
import { LocalImagesService } from '/@/services/local-images-service';
import { ProviderService } from '/@/services/provider-service';
import { PullTracker } from '/@/services/pull-tracker';
import { TelemetryEvents } from '/@/utils/telemetry-events';

export { imageNames } from '/@/services/image-names';

// registry.redhat.io answers anonymous pulls with a link to https://access.redhat.com/RegistryAuthentication
const AUTH_ERROR =
  /unauthorized|authentication required|RegistryAuthentication|\b401\b|\b403\b|access denied|denied: /i;

export function isAuthenticationError(err: unknown): boolean {
  return AUTH_ERROR.test(err instanceof Error ? err.message : String(err));
}

export const SIGN_IN_ACTION = 'Sign in with Red Hat';

const SIGNATURE_ERROR = /signature was required|no signature exists|source image rejected/i;

/**
 * Fedora and RHEL hosts require Red Hat signatures for registry.redhat.io and registry.access.redhat.com
 * (containers-common policy.json, sigstoreSigned). Red Hat attaches the signature shortly after publishing a
 * build: a build pulled in the first minutes is rejected. Explain it instead of the raw policy error.
 */
export function explainPullError(image: string, err: unknown): unknown {
  const message = err instanceof Error ? err.message : String(err);
  if (!SIGNATURE_ERROR.test(message)) return err;
  return new Error(
    `${image} was rejected because it is not signed yet: your container policy requires Red Hat signatures, ` +
      'which are attached a few minutes after a build is published. Try again in a few minutes, or pull an earlier tag.',
    { cause: err },
  );
}

/**
 * Node.js architecture names to OCI ones. Podman machines (macOS, Windows) run the host architecture.
 */
const OCI_ARCHITECTURES: Record<string, string> = { x64: 'amd64', arm64: 'arm64', ppc64: 'ppc64le', s390x: 's390x' };

export function hostArchitecture(arch: string = process.arch): string {
  return OCI_ARCHITECTURES[arch] ?? arch;
}

@injectable()
export class ImageService {
  constructor(
    @inject(TelemetryLoggerSymbol)
    protected readonly telemetryLogger: TelemetryLogger,
    @inject(ProviderService)
    protected readonly providers: ProviderService,
    @inject(AuthService)
    protected readonly auth: AuthService,
    @inject(PullTracker)
    protected readonly pulls: PullTracker,
    @inject(LocalImagesService)
    protected readonly localImages: LocalImagesService,
  ) {}

  public async pull(options: {
    image: string;
    connection: ProviderContainerConnection;
    architecture?: string;
  }): Promise<SimpleImageInfo> {
    const telemetry: Record<string, unknown> = {
      registry: options.image.split('/')[0],
      byDigest: options.image.includes('@'),
      architecture: options.architecture ?? 'default',
    };

    this.pulls.start(options.image);
    try {
      let image: SimpleImageInfo;
      try {
        image = await this.#pull(options, telemetry);
      } catch (err: unknown) {
        if (!(await this.#offerSignIn(options.image, err))) throw err;
        telemetry['retriedAfterSignIn'] = true;
        image = await this.#pull(options, telemetry);
      }
      // the local images are up to date when the pull is reported done: the cards switch to Open/Run at once
      await this.localImages.refresh();
      this.pulls.succeed(options.image);
      return image;
    } catch (err: unknown) {
      telemetry['error'] = String(err);
      this.pulls.fail(options.image, err);
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
    options: { image: string; connection: ProviderContainerConnection; architecture?: string },
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

        try {
          // only another architecture than the host one needs an explicit platform
          const platform =
            options.architecture && options.architecture !== hostArchitecture()
              ? `linux/${options.architecture}`
              : undefined;
          await containerEngineAPI.pullImage(options.connection.connection, options.image, () => {}, platform, token);
        } catch (err: unknown) {
          throw explainPullError(options.image, err);
        }
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
}
