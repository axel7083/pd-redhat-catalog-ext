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
import { describe, expect, test } from 'vitest';

import { currentFreshnessGrade, HydraResponseSchema, parseFreshnessGrades } from '/@/hydra/hydra-schemas';

// not valid JSON once unwrapped
const MALFORMED = ['"[{"grade": "A"'];

describe('freshness grades', () => {
  test('parse double-encoded grades', () => {
    const raw = [JSON.stringify(JSON.stringify([{ grade: 'A', start_date: { $date: 1 } }]))];
    expect(parseFreshnessGrades(raw)).toEqual([{ grade: 'A', start_date: { $date: 1 } }]);
  });

  test('parse single-encoded grades', () => {
    const raw = [JSON.stringify([{ grade: 'C', start_date: { $date: 1 } }])];
    expect(parseFreshnessGrades(raw)).toEqual([{ grade: 'C', start_date: { $date: 1 } }]);
  });

  test('malformed grades are ignored', () => {
    expect(parseFreshnessGrades(MALFORMED)).toEqual([]);
    expect(parseFreshnessGrades(undefined)).toEqual([]);
  });

  test('current grade is the one valid now', () => {
    const grades = [
      { grade: 'A', start_date: { $date: 0 }, end_date: { $date: 100 } },
      { grade: 'C', start_date: { $date: 100 } },
    ];
    expect(currentFreshnessGrade(grades, 50)).toBe('A');
    expect(currentFreshnessGrade(grades, 150)).toBe('C');
    expect(currentFreshnessGrade([], 150)).toBeUndefined();
  });
});

describe('HydraResponseSchema', () => {
  test('flat facet arrays become value/count pairs', () => {
    const parsed = HydraResponseSchema.parse({
      response: { numFound: 1, start: 0, docs: [] },
      facet_counts: { facet_fields: { architecture: ['amd64', 10, 'arm64', 3] } },
    });

    expect(parsed.facet_counts?.facet_fields.architecture).toEqual([
      { value: 'amd64', count: 10 },
      { value: 'arm64', count: 3 },
    ]);
  });

  test('invalid facet pairs are rejected', () => {
    const result = HydraResponseSchema.safeParse({
      response: { numFound: 1, start: 0, docs: [] },
      facet_counts: { facet_fields: { architecture: [10, 'amd64'] } },
    });
    expect(result.success).toBe(false);
  });
});
