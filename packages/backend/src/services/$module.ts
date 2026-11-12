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
import { ContainerModule } from 'inversify';

import { StartupSymbol } from '/@/inject/symbol';
import { AuthService } from '/@/services/auth-service';
import { CatalogService } from '/@/services/catalog-service';
import { DialogService } from '/@/services/dialog-service';
import { HydraSearchService } from '/@/services/hydra-search-service';
import { ImageService } from '/@/services/image-service';
import { LocalImagesService } from '/@/services/local-images-service';
import { ProviderService } from '/@/services/provider-service';
import { PullTracker } from '/@/services/pull-tracker';
import { PyxisService } from '/@/services/pyxis-service';
import { RoutingService } from '/@/services/routing-service';
import { WebviewService } from '/@/services/webview-service';

const module = new ContainerModule(options => {
  options.bind<AuthService>(AuthService).toSelf().inSingletonScope();
  options.bind<CatalogService>(CatalogService).toSelf().inSingletonScope();
  options.bind<DialogService>(DialogService).toSelf().inSingletonScope();
  options.bind<HydraSearchService>(HydraSearchService).toSelf().inSingletonScope();
  options.bind<ImageService>(ImageService).toSelf().inSingletonScope();
  options.bind<LocalImagesService>(LocalImagesService).toSelf().inSingletonScope();
  options.bind<ProviderService>(ProviderService).toSelf().inSingletonScope();
  options.bind<PullTracker>(PullTracker).toSelf().inSingletonScope();
  options.bind<PyxisService>(PyxisService).toSelf().inSingletonScope();
  options.bind<RoutingService>(RoutingService).toSelf().inSingletonScope();
  options.bind<WebviewService>(WebviewService).toSelf().inSingletonScope();

  // mark it as a startup service
  options.bind(StartupSymbol).toService(DialogService);
  options.bind(StartupSymbol).toService(WebviewService);
  // lists the local images at activation, so the first search already knows what is pulled
  options.bind(StartupSymbol).toService(LocalImagesService);
});

export { module };
