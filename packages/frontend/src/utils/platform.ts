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
import type { CatalogImage } from '@podman-desktop/extension-redhat-catalog-core-api';

/**
 * The image shown for a repository: the requested architecture, else the host one (what a pull gets), else the
 * first one (the latest images are sorted amd64 first).
 */
export function selectImage(
  images: CatalogImage[],
  requested: string | undefined,
  host: string | undefined,
): CatalogImage | undefined {
  return (
    images.find(image => image.architecture === requested) ??
    images.find(image => image.architecture === host) ??
    images[0]
  );
}
