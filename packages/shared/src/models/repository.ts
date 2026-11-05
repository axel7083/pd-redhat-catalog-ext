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
 * Where the image of a repository should be pulled from.
 *
 * The search index always reports `registry.access.redhat.com` for Red Hat content, even for repositories
 * that registry refuses to serve, so the pull target is resolved from Pyxis.
 */
export interface PullTarget {
  registry: string;
  repository: string;
  /**
   * The registry requires credentials (`registry.redhat.io`, `registry.connect.redhat.com`, private partner registries).
   */
  requiresLogin: boolean;
  /**
   * The credentials can be provisioned by the Red Hat authentication extension (registry.redhat.io only).
   */
  redHatLogin: boolean;
  reason: 'redhat-public' | 'redhat-terms' | 'partner';
}

export interface DocumentationLink {
  title: string;
  url: string;
  type?: string;
}

export interface CatalogImage {
  /**
   * Pyxis image id, used to fetch vulnerabilities, packages and the Containerfile.
   */
  id: string;
  architecture: string;
  /**
   * Digest to use in a pull spec: the manifest list digest when available, the schema 2 digest otherwise.
   */
  digest?: string;
  tags: string[];
  pushDate?: string;
  freshnessGrade?: string;
  sizeBytes?: number;
  user?: string;
  env: string[];
  labels: Record<string, string>;
}

export interface TagGroup {
  /**
   * The manifest (list) digest shared by every architecture of this group.
   */
  digest?: string;
  tags: string[];
  pushDate?: string;
  architectures: string[];
  freshnessGrade?: string;
}

export interface RepositoryDetail {
  id: string;
  registry: string;
  repository: string;
  name: string;
  shortDescription?: string;
  /**
   * Markdown long description. Falls back to the HTML long description when the markdown one is missing.
   */
  description?: string;
  descriptionFormat: 'markdown' | 'html';
  publisher?: string;
  requiresTerms: boolean;
  eolDate?: string;
  documentationLinks: DocumentationLink[];
  releaseCategories: string[];
  buildCategories: string[];
  applicationCategories: string[];
  replacedBy?: string;
  /**
   * Publisher-provided instructions replacing the default "Get this image" content.
   */
  getThisImageOverride?: string;
  pullTarget: PullTarget;
  /**
   * The recommended tag, preferring a "technical" (version-release) tag over `latest`.
   */
  recommendedTag?: string;
  /**
   * The most recent image per architecture.
   */
  latestImages: CatalogImage[];
  tagGroups: TagGroup[];
  totalImages: number;
  catalogUrl: string;
}

export type Severity = 'critical' | 'important' | 'moderate' | 'low' | 'unknown';

export interface Vulnerability {
  cveId: string;
  severity: Severity;
  advisoryId?: string;
  advisoryType?: string;
  advisoryUrl?: string;
  cveUrl: string;
  publicDate?: string;
  affectedPackages: string[];
}

export interface ImagePackage {
  name: string;
  version?: string;
  release?: string;
  epoch?: string;
  architecture?: string;
  summary?: string;
}

export interface ImageFile {
  filename: string;
  content: string;
}
