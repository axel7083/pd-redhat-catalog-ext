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
import type { ProviderContainerConnectionIdentifierInfo } from '../models/provider-container-connection-identifier-info';
import type { LocalImages } from '../models/local-image';
import type { PullStatus } from '../models/pull-status';
import type { SimpleImageInfo } from '../models/simple-image-info';

export abstract class ImageApi {
  static readonly CHANNEL: string = 'image-api';

  /**
   * Pull an image. When the registry requires Red Hat credentials and none are configured,
   * the user is offered to sign in before retrying.
   */
  abstract pull(options: {
    image: string;
    connection: ProviderContainerConnectionIdentifierInfo;
    /**
     * OCI architecture to pull (e.g. `arm64`). Defaults to the architecture of the container engine.
     */
    architecture?: string;
  }): Promise<SimpleImageInfo>;

  /**
   * The OCI architecture of the host (amd64, arm64, …): the architecture pulled by default.
   */
  abstract getHostArchitecture(): Promise<string>;

  /**
   * Pulls in progress, and failed pulls until they are retried or dismissed (see Messages.UPDATE_PULLS).
   */
  abstract getPulls(): Promise<PullStatus[]>;

  /**
   * Forget a failed pull.
   */
  abstract dismissPull(image: string): Promise<void>;

  /**
   * Local images of the started connections, kept up to date by the backend (image and connection events) and
   * published on Messages.UPDATE_LOCAL_IMAGES: the webview tells pulled repositories without asking the engine.
   */
  abstract getLocalImages(): Promise<LocalImages>;

  /**
   * Open the image details page for the given image.
   */
  abstract navigateToImageDetails(image: SimpleImageInfo): Promise<void>;
  /**
   * Open the image run page for the given image.
   */
  abstract navigateToImageRun(image: SimpleImageInfo): Promise<void>;
}
