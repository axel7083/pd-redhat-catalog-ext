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
import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * Generate TypedDocumentString for every `graphql(...)` call in src/pyxis, validated against the committed
 * Pyxis schema snapshot (see scripts/download-pyxis-schema.mjs).
 */
const config: CodegenConfig = {
  schema: 'pyxis/schema.graphql',
  documents: ['src/pyxis/queries.ts'],
  ignoreNoDocuments: false,
  generates: {
    './src/pyxis/generated/': {
      preset: 'client',
      config: {
        documentMode: 'string',
        useTypeImports: true,
        enumsAsTypes: true,
        skipTypename: true,
        avoidOptionals: false,
        scalars: {
          DateTime: 'string',
          ObjectID: 'string',
          ObjectIDFilterScalar: 'string',
          URI: 'string',
          Int64: 'number',
        },
      },
      presetConfig: {
        fragmentMasking: false,
      },
    },
  },
};

export default config;
