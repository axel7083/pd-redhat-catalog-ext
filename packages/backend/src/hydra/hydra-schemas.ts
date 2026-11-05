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
import { z } from 'zod';
import { FACET_FIELDS } from '@podman-desktop/extension-redhat-catalog-core-api';
import type { FacetField, FacetValue } from '@podman-desktop/extension-redhat-catalog-core-api';

import type { HydraField } from '/@/hydra/hydra-query';

/**
 * Hydra Solr has no published schema: every field is validated at runtime.
 */

const stringArray = z.array(z.string()).optional();

/**
 * `freshness_grades_json` is an array holding a JSON string of a JSON string:
 * `["\"[{\"grade\": \"A\", \"start_date\": {\"$date\": 1793828730634}, ...}]\""]`
 */
const FreshnessGrade = z.object({
  grade: z.string(),
  start_date: z.object({ $date: z.number() }).optional(),
  end_date: z.object({ $date: z.number() }).nullish(),
});
export type HydraFreshnessGrade = z.infer<typeof FreshnessGrade>;

export function parseFreshnessGrades(raw: string[] | undefined): HydraFreshnessGrade[] {
  if (!raw?.length) return [];
  const grades: HydraFreshnessGrade[] = [];
  for (const item of raw) {
    try {
      let value: unknown = JSON.parse(item);
      if (typeof value === 'string') value = JSON.parse(value);
      const parsed = z.array(FreshnessGrade).safeParse(value);
      if (parsed.success) grades.push(...parsed.data);
    } catch {
      // ignore malformed grades, they are informative only
    }
  }
  return grades;
}

/**
 * The grade valid at `now`, or the most recent one.
 */
export function currentFreshnessGrade(grades: HydraFreshnessGrade[], now: number = Date.now()): string | undefined {
  const current = grades.find(
    grade => (grade.start_date?.$date ?? 0) <= now && (!grade.end_date || grade.end_date.$date > now),
  );
  return (current ?? grades.at(-1))?.grade;
}

export const HydraDocSchema = z.object({
  id: z.string(),
  repository: z.string(),
  registry: z.string(),
  partnerName: z.string().optional(),
  view_uri: z.string().optional(),
  display_data_short_description: z.string().optional(),
  push_date: z.string().optional(),
  logo_uri: z.string().optional(),
  allTitle: z.string().optional(),
  build_categories_list: stringArray,
  architecture: stringArray,
  repository_tags: stringArray,
  lastModifiedDate: z.string().optional(),
  freshness_grades_json: stringArray,
  release_categories: stringArray,
} satisfies Record<HydraField, z.ZodType>);
export type HydraDoc = z.infer<typeof HydraDocSchema>;

/**
 * Solr returns facets as flat `[value, count, value, count, ...]` arrays.
 */
const FlatFacet = z.array(z.union([z.string(), z.number()])).transform((flat, ctx): FacetValue[] => {
  const values: FacetValue[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const value = flat[i];
    const count = flat[i + 1];
    if (typeof value !== 'string' || typeof count !== 'number') {
      ctx.addIssue({ code: 'custom', message: `invalid facet pair at index ${i}` });
      return z.NEVER;
    }
    values.push({ value, count });
  }
  return values;
});

export const HydraResponseSchema = z.object({
  response: z.object({
    numFound: z.number(),
    start: z.number(),
    // a document that does not match the schema must not break the whole page
    docs: z.array(z.unknown()),
  }),
  facet_counts: z
    .object({
      facet_fields: z.object(
        Object.fromEntries(FACET_FIELDS.map(field => [field, FlatFacet.optional()])) as Record<
          FacetField,
          z.ZodOptional<typeof FlatFacet>
        >,
      ),
    })
    .optional(),
});
export type HydraResponse = z.infer<typeof HydraResponseSchema>;
