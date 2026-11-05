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
import type { PullTarget } from '../models/repository';

export const HUMMINGBIRD_QUAY_PREFIX = 'quay.io/hummingbird/';
export const HARDENED_REPOSITORY_PREFIX = 'hi/';

/**
 * Build a pull spec for a pull target, by digest when provided, by tag otherwise.
 */
export function toPullSpec(
  target: Pick<PullTarget, 'registry' | 'repository'>,
  ref: { tag?: string; digest?: string },
): string {
  const base = `${target.registry}/${target.repository}`;
  if (ref.digest) return `${base}@${ref.digest}`;
  return `${base}:${ref.tag ?? 'latest'}`;
}

/**
 * Image name prefixes (without tag) under which a local image belongs to the given repository.
 *
 * Hardened images (`hi/*`) are byte-identical to the Hummingbird images on quay.io, so a local
 * `quay.io/hummingbird/<name>` image is matched as well.
 */
export function localImagePrefixes(target: Pick<PullTarget, 'registry' | 'repository'>): string[] {
  const prefixes = [`${target.registry}/${target.repository}`];
  if (target.repository.startsWith(HARDENED_REPOSITORY_PREFIX)) {
    prefixes.push(`${HUMMINGBIRD_QUAY_PREFIX}${target.repository.slice(HARDENED_REPOSITORY_PREFIX.length)}`);
  }
  return prefixes;
}

/**
 * Whether a local image name (`registry/repository:tag` or `registry/repository@digest`) belongs to one of the prefixes.
 */
export function matchesImagePrefix(imageName: string, prefixes: string[]): boolean {
  return prefixes.some(prefix => imageName.startsWith(`${prefix}:`) || imageName.startsWith(`${prefix}@`));
}
