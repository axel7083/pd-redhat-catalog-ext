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

/**
 * Download the Pyxis GraphQL schema through introspection and write it as SDL to `pyxis/schema.graphql`.
 * The snapshot is committed: codegen validates every query in `src/pyxis/queries.ts` against it.
 */
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildClientSchema, getIntrospectionQuery, lexicographicSortSchema, printSchema } from 'graphql';

const PYXIS_GRAPHQL_URL = 'https://catalog.redhat.com/api/containers/graphql/';
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'pyxis', 'schema.graphql');

const response = await fetch(PYXIS_GRAPHQL_URL, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'user-agent': 'podman-desktop-redhat-catalog' },
  body: JSON.stringify({ query: getIntrospectionQuery() }),
});
if (!response.ok) throw new Error(`introspection failed: ${response.status} ${response.statusText}`);

const { data, errors } = await response.json();
if (errors?.length) throw new Error(`introspection failed: ${JSON.stringify(errors)}`);

const schema = lexicographicSortSchema(buildClientSchema(data));
await writeFile(OUTPUT, `${printSchema(schema)}\n`, 'utf8');
console.log(`wrote ${OUTPUT}`);
