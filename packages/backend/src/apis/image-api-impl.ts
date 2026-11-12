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
import type {
  LocalImages,
  ProviderContainerConnectionIdentifierInfo,
  PullStatus,
  SimpleImageInfo,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import { ImageApi } from '@podman-desktop/extension-redhat-catalog-core-api';
import { inject, injectable } from 'inversify';

import { hostArchitecture, ImageService } from '/@/services/image-service';
import { ProviderService } from '/@/services/provider-service';
import { LocalImagesService } from '/@/services/local-images-service';
import { PullTracker } from '/@/services/pull-tracker';

@injectable()
export class ImageApiImpl extends ImageApi {
  constructor(
    @inject(ProviderService)
    protected readonly providers: ProviderService,
    @inject(ImageService)
    protected readonly images: ImageService,
    @inject(PullTracker)
    protected readonly pulls: PullTracker,
    @inject(LocalImagesService)
    protected readonly localImages: LocalImagesService,
  ) {
    super();
  }

  override pull(options: {
    image: string;
    connection: ProviderContainerConnectionIdentifierInfo;
    architecture?: string;
  }): Promise<SimpleImageInfo> {
    const connection = this.providers.getProviderContainerConnection(options.connection);
    return this.images.pull({
      image: options.image,
      connection,
      architecture: options.architecture,
    });
  }

  override async getHostArchitecture(): Promise<string> {
    return hostArchitecture();
  }

  override async getPulls(): Promise<PullStatus[]> {
    return this.pulls.all();
  }

  override async dismissPull(image: string): Promise<void> {
    this.pulls.dismiss(image);
  }

  override async getLocalImages(): Promise<LocalImages> {
    return this.localImages.snapshot();
  }

  override navigateToImageDetails(image: SimpleImageInfo): Promise<void> {
    return this.images.navigateToImageDetails(image);
  }

  override navigateToImageRun(image: SimpleImageInfo): Promise<void> {
    return this.images.navigateToImageRun(image);
  }
}
