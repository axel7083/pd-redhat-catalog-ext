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

import { AuthApiImpl } from '/@/apis/auth-api-impl';
import { CatalogApiImpl } from '/@/apis/catalog-api-impl';
import { DialogApiImpl } from '/@/apis/dialog-api-impl';
import { ImageApiImpl } from '/@/apis/image-api-impl';
import { ProviderApiImpl } from '/@/apis/provider-api-impl';
import { RoutingApiImpl } from '/@/apis/routing-api-impl';

const module = new ContainerModule(options => {
  const impls: Array<new (...args: never[]) => unknown> = [
    AuthApiImpl,
    CatalogApiImpl,
    DialogApiImpl,
    ImageApiImpl,
    ProviderApiImpl,
    RoutingApiImpl,
  ];

  impls.forEach(implementation => {
    options.bind(implementation).toSelf().inSingletonScope();
  });
});

export { module };
