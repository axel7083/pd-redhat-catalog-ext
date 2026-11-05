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

export const TABS = ['overview', 'get-this-image', 'tags', 'security', 'packages', 'containerfile'] as const;
export type DetailTab = (typeof TABS)[number];

export const TAB_TITLES: Record<DetailTab, string> = {
  overview: 'Overview',
  'get-this-image': 'Get this image',
  tags: 'Tags',
  security: 'Security',
  packages: 'Packages',
  containerfile: 'Containerfile',
};

/**
 * Tabs showing data of a single image (one per architecture).
 */
export const IMAGE_TABS: DetailTab[] = ['security', 'packages', 'containerfile'];
