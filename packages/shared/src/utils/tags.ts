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
 * Builds carry many tags: floating ones (`latest`, `1`, `9.9`), technical ones (`9.9-1793872299`) and timestamps
 * (`1793872352`). These helpers pick what to show first.
 */

const TIMESTAMP = /^\d{9,}$/;
const RELEASE_SUFFIX = /-\d{9,}$/;

/**
 * A pure build timestamp, e.g. `1794431771`: unreadable, never shown first.
 */
export function isTimestampTag(tag: string): boolean {
  return TIMESTAMP.test(tag);
}

/**
 * The most readable tag of a build: the most specific version without release suffix
 * (`0.29.1` rather than `0`, `0.29` or `0.29.1-1794283099`), `latest` only when nothing else is available.
 */
export function pickPrimaryTag(tags: string[]): string | undefined {
  const candidates = tags.filter(tag => !isTimestampTag(tag) && !/^latest/.test(tag));
  const readable = candidates.filter(tag => !RELEASE_SUFFIX.test(tag));
  const pool = readable.length ? readable : candidates;
  if (pool.length === 0) return tags.find(tag => !isTimestampTag(tag)) ?? tags[0];
  return pool.toSorted(
    (a, b) => (b.match(/[.-]/g) ?? []).length - (a.match(/[.-]/g) ?? []).length || b.length - a.length,
  )[0];
}

/**
 * Tags in display order: the primary one, the other readable ones, then technical and timestamp tags.
 */
export function sortTagsForDisplay(tags: string[]): string[] {
  const primary = pickPrimaryTag(tags);
  const rank = (tag: string): number => {
    if (tag === primary) return 0;
    if (isTimestampTag(tag)) return 3;
    if (RELEASE_SUFFIX.test(tag)) return 2;
    return 1;
  };
  return tags.toSorted((a, b) => rank(a) - rank(b));
}
