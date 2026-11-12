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
import type { TelemetryLogger } from '@podman-desktop/api';
import { beforeEach, expect, test, vi } from 'vitest';

import { CatalogService } from '/@/services/catalog-service';
import type { HydraSearchService } from '/@/services/hydra-search-service';
import type { PyxisService } from '/@/services/pyxis-service';

const HYDRA_MOCK = { search: vi.fn() } as unknown as HydraSearchService;
const PYXIS_MOCK = {
  getTags: vi.fn(),
  getVulnerabilities: vi.fn(),
  getPackages: vi.fn(),
  getFiles: vi.fn(),
} as unknown as PyxisService;
const TELEMETRY_MOCK = { logUsage: vi.fn() } as unknown as TelemetryLogger;

beforeEach(() => {
  vi.resetAllMocks();
});

test('prefetchTabs warms every tab query and ignores failures', async () => {
  vi.mocked(PYXIS_MOCK.getTags).mockRejectedValue(new Error('timeout'));
  vi.mocked(PYXIS_MOCK.getVulnerabilities).mockResolvedValue([]);
  vi.mocked(PYXIS_MOCK.getPackages).mockResolvedValue([]);
  vi.mocked(PYXIS_MOCK.getFiles).mockResolvedValue([]);

  await new CatalogService(HYDRA_MOCK, PYXIS_MOCK, TELEMETRY_MOCK).prefetchTabs('quay.io', 'a/b', 'image');

  expect(PYXIS_MOCK.getTags).toHaveBeenCalledWith('quay.io', 'a/b');
  expect(PYXIS_MOCK.getVulnerabilities).toHaveBeenCalledWith('image');
  expect(PYXIS_MOCK.getPackages).toHaveBeenCalledWith('image');
  expect(PYXIS_MOCK.getFiles).toHaveBeenCalledWith('image');
});
