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
import { mergeConfig } from 'vitest/config';

import viteConfig from './vitest.config';

/**
 * Live contract tests against the catalog APIs (network required). They run the canonical queries
 * through the zod schemas and the generated GraphQL types, and fail when the APIs drift.
 */
const config = mergeConfig(viteConfig, {
  test: {
    testTimeout: 60_000,
  },
});
// mergeConfig concatenates arrays: replace the unit test patterns
config.test = { ...config.test, include: ['src/**/*.contract.ts'] };

export default config;
