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
import type {
  CatalogImage,
  DocumentationLink,
  ImageFile,
  ImagePackage,
  RepositoryDetail,
  Severity,
  TagGroup,
  Vulnerability,
} from '@podman-desktop/extension-redhat-catalog-core-api';

import { resolvePullTarget } from '/@/catalog/registry-resolver';
import type {
  ImageFilesQuery,
  ImagePackagesQuery,
  ImageVulnerabilitiesQuery,
  RepositoryDetailQuery,
  RepositoryTagsQuery,
} from '/@/pyxis/generated/graphql';

type PyxisRepository = NonNullable<NonNullable<RepositoryDetailQuery['get_repository_by_registry_path']>['data']>;
type PyxisDetailImage = NonNullable<
  NonNullable<NonNullable<RepositoryDetailQuery['find_repository_images_by_registry_path']>['data']>[number]
>;
type PyxisTagImage = NonNullable<
  NonNullable<NonNullable<RepositoryTagsQuery['find_repository_images_by_registry_path']>['data']>[number]
>;
/**
 * The image fields shared by the detail and tags queries; the size is only fetched with the detail.
 */
type PyxisImage = PyxisTagImage & Partial<Pick<PyxisDetailImage, 'sum_layer_size_bytes'>>;
type PyxisFreshnessGrade = NonNullable<NonNullable<PyxisImage['freshness_grades']>[number]>;
type PyxisVulnerability = NonNullable<
  NonNullable<NonNullable<ImageVulnerabilitiesQuery['find_image_vulnerabilities']>['data']>[number]
>;
type PyxisRpm = NonNullable<
  NonNullable<NonNullable<NonNullable<ImagePackagesQuery['get_image_rpm_manifest']>['data']>['rpms']>[number]
>;
type PyxisFile = NonNullable<NonNullable<NonNullable<ImageFilesQuery['find_image_files']>['data']>[number]>;

const CATALOG_URL = 'https://catalog.redhat.com/software/containers';

function compact<T>(values: Array<T | null | undefined> | null | undefined): T[] {
  // GraphQL nullable lists contain nulls
  // eslint-disable-next-line no-null/no-null
  return (values ?? []).filter((value): value is T => value !== null && value !== undefined);
}

function orUndefined<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

/**
 * The grade valid at `now`, or the most recent one.
 */
export function currentGrade(grades: PyxisFreshnessGrade[], now: number = Date.now()): string | undefined {
  const current = grades.find(grade => {
    const start = grade.start_date ? Date.parse(grade.start_date) : 0;
    const end = grade.end_date ? Date.parse(grade.end_date) : Number.POSITIVE_INFINITY;
    return start <= now && now < end;
  });
  return orUndefined((current ?? grades.at(-1))?.grade);
}

/**
 * The image `repositories` entry describing the repository we look at: an image can be published
 * in several repositories and registries.
 */
function repositoryEntry(
  image: PyxisImage,
  repository: string,
): NonNullable<NonNullable<PyxisImage['repositories']>[number]> | undefined {
  const entries = compact(image.repositories);
  return entries.find(entry => entry.repository === repository) ?? entries[0];
}

export function toCatalogImage(image: PyxisImage, repository: string, now?: number): CatalogImage | undefined {
  if (!image._id) return undefined;
  const entry = repositoryEntry(image, repository);

  return {
    id: image._id,
    // the top-level architecture is reliable, some images carry labels of another architecture
    architecture: image.architecture ?? 'unknown',
    digest: orUndefined(entry?.manifest_list_digest ?? entry?.manifest_schema2_digest ?? image.docker_image_digest),
    tags: compact(entry?.tags?.map(tag => tag?.name)),
    pushDate: orUndefined(entry?.push_date),
    freshnessGrade: currentGrade(compact(image.freshness_grades), now),
    sizeBytes: orUndefined(image.sum_layer_size_bytes),
  };
}

/**
 * Group the images of a same build (one image per architecture, sharing a manifest list digest).
 * The input is sorted by push date descending, so is the output.
 */
export function toTagGroups(images: CatalogImage[]): TagGroup[] {
  const groups = new Map<string, TagGroup>();
  for (const image of images) {
    const key = image.digest ?? `tags:${image.tags.join(',')}:${image.pushDate}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        digest: image.digest,
        tags: [],
        pushDate: image.pushDate,
        architectures: [],
        freshnessGrade: image.freshnessGrade,
      };
      groups.set(key, group);
    }
    for (const tag of image.tags) {
      if (!group.tags.includes(tag)) group.tags.push(tag);
    }
    if (!group.architectures.includes(image.architecture)) group.architectures.push(image.architecture);
    if (image.pushDate && (!group.pushDate || image.pushDate > group.pushDate)) group.pushDate = image.pushDate;
  }
  return Array.from(groups.values()).filter(group => group.tags.length > 0);
}

/**
 * Pick a "technical" tag rather than a floating one (`latest`, `1`), like the catalog website does:
 * prefer version-release tags (`9.6-1793617656`), then the most specific version.
 */
export function pickRecommendedTag(tags: string[]): string | undefined {
  const candidates = tags.filter(tag => tag !== 'latest');
  if (candidates.length === 0) return tags.length > 0 ? tags[0] : undefined;

  const specificity = (tag: string): [number, number, number] => [
    /-\d+$/.test(tag) ? 1 : 0,
    (tag.match(/[.-]/g) ?? []).length,
    tag.length,
  ];
  return candidates.toSorted((a, b) => {
    const [a1, a2, a3] = specificity(a);
    const [b1, b2, b3] = specificity(b);
    return b1 - a1 || b2 - a2 || b3 - a3;
  })[0];
}

function toDocumentationLinks(repository: PyxisRepository): DocumentationLink[] {
  return compact(repository.documentation_links).flatMap(link =>
    link.url ? [{ title: link.title ?? link.url, url: link.url, type: orUndefined(link.type) }] : [],
  );
}

/**
 * Descriptions are of variable quality: the HTML one is literally `<p>None</p>` for some repositories.
 */
function toDescription(repository: PyxisRepository): Pick<RepositoryDetail, 'description' | 'descriptionFormat'> {
  const markdown = repository.display_data?.long_description_markdown?.trim();
  if (markdown && markdown !== 'None') return { description: markdown, descriptionFormat: 'markdown' };

  const html = repository.display_data?.long_description?.trim();
  if (html && !/^<p>\s*None\s*<\/p>$/i.test(html)) return { description: html, descriptionFormat: 'html' };

  return { description: undefined, descriptionFormat: 'markdown' };
}

const ARCHITECTURE_ORDER = ['amd64', 'arm64', 'ppc64le', 's390x'];

function architectureRank(architecture: string): number {
  const rank = ARCHITECTURE_ORDER.indexOf(architecture);
  return rank === -1 ? ARCHITECTURE_ORDER.length : rank;
}

export function toRepositoryDetail(
  registry: string,
  repositoryName: string,
  query: RepositoryDetailQuery,
  now?: number,
): RepositoryDetail {
  const repository = query.get_repository_by_registry_path?.data;
  if (!repository) {
    const detail = query.get_repository_by_registry_path?.error?.detail;
    const reason = detail ? `: ${detail}` : '';
    throw new Error(`Repository ${registry}/${repositoryName} not found${reason}`);
  }

  const images = compact(query.find_repository_images_by_registry_path?.data)
    .map(image => toCatalogImage(image, repositoryName, now))
    .filter((image): image is CatalogImage => !!image);

  // Repositories can publish variants (e.g. hi/* `-builder`, `-fips`) alongside the default image: the build
  // tagged `latest` is the default one, even when variants were pushed after it (fetched apart: it may be older
  // than the newest images).
  const latestBuild = compact(query.latest_build?.data)
    .map(image => toCatalogImage(image, repositoryName, now))
    .filter((image): image is CatalogImage => !!image);
  const defaultBuild = latestBuild.length ? latestBuild : images;

  const latestImages: CatalogImage[] = [];
  for (const image of defaultBuild) {
    if (!latestImages.some(latest => latest.architecture === image.architecture)) latestImages.push(image);
  }
  // the first image is the default one (size, health index): the most common architecture first
  latestImages.sort((a, b) => architectureRank(a.architecture) - architectureRank(b.architecture));

  const id = repository._id ?? '';

  return {
    id,
    registry: repository.registry ?? registry,
    repository: repository.repository ?? repositoryName,
    name: repository.display_data?.name ?? repositoryName,
    shortDescription: orUndefined(repository.display_data?.short_description),
    ...toDescription(repository),
    publisher: orUndefined(query.get_repository_vendor_by_registry_path?.data?.name ?? repository.vendor_label),
    requiresTerms: !!repository.requires_terms,
    eolDate: orUndefined(repository.eol_date),
    documentationLinks: toDocumentationLinks(repository),
    releaseCategories: compact(repository.release_categories),
    buildCategories: compact(repository.build_categories),
    applicationCategories: compact(repository.application_categories),
    replacedBy: orUndefined(repository.replaced_by_repository_name),
    getThisImageOverride: orUndefined(repository.ui_get_this_image_override),
    pullTarget: resolvePullTarget({
      registry: repository.registry ?? registry,
      repository: repository.repository ?? repositoryName,
      vendorLabel: repository.vendor_label,
      requiresTerms: repository.requires_terms,
    }),
    recommendedTag: pickRecommendedTag(toTagGroups(defaultBuild)[0]?.tags ?? []),
    latestImages,
    totalImages: query.find_repository_images_by_registry_path?.total ?? images.length,
    catalogUrl: `${CATALOG_URL}/${repository.repository ?? repositoryName}/${id}`,
  };
}

export function toRepositoryTags(repositoryName: string, query: RepositoryTagsQuery, now?: number): TagGroup[] {
  const images = compact(query.find_repository_images_by_registry_path?.data)
    .map(image => toCatalogImage(image, repositoryName, now))
    .filter((image): image is CatalogImage => !!image);
  return toTagGroups(images);
}

const SEVERITIES: Severity[] = ['critical', 'important', 'moderate', 'low'];

export function toSeverity(value: string | null | undefined): Severity {
  const normalized = value?.toLowerCase();
  return SEVERITIES.find(severity => severity === normalized) ?? 'unknown';
}

export function toVulnerabilities(vulnerabilities: PyxisVulnerability[]): Vulnerability[] {
  const byCve = new Map<string, Vulnerability>();
  for (const vulnerability of vulnerabilities) {
    if (!vulnerability.cve_id) continue;
    const packages = compact(vulnerability.affected_packages).map(pkg =>
      [pkg.name, pkg.version].filter(Boolean).join('-'),
    );
    const existing = byCve.get(vulnerability.cve_id);
    if (existing) {
      // the same CVE can be listed once per advisory or architecture
      for (const pkg of packages) if (!existing.affectedPackages.includes(pkg)) existing.affectedPackages.push(pkg);
      continue;
    }
    const advisory =
      vulnerability.advisory_type && vulnerability.advisory_id
        ? `${vulnerability.advisory_type}-${vulnerability.advisory_id}`
        : undefined;
    byCve.set(vulnerability.cve_id, {
      cveId: vulnerability.cve_id,
      severity: toSeverity(vulnerability.severity),
      advisoryId: advisory,
      advisoryType: orUndefined(vulnerability.advisory_type),
      advisoryUrl: advisory ? `https://access.redhat.com/errata/${advisory}` : undefined,
      cveUrl: `https://access.redhat.com/security/cve/${vulnerability.cve_id}`,
      publicDate: orUndefined(vulnerability.public_date),
      affectedPackages: Array.from(new Set(packages)),
    });
  }
  return Array.from(byCve.values()).toSorted(
    (a, b) =>
      SEVERITIES.indexOf(a.severity === 'unknown' ? 'low' : a.severity) -
        SEVERITIES.indexOf(b.severity === 'unknown' ? 'low' : b.severity) || b.cveId.localeCompare(a.cveId),
  );
}

/**
 * Some RPM manifests list the same package twice: they are de-duplicated (name, epoch, version, release, arch).
 */
export function toPackages(rpms: PyxisRpm[]): ImagePackage[] {
  const seen = new Set<string>();
  return rpms
    .filter((rpm): rpm is PyxisRpm & { name: string } => !!rpm.name)
    .filter(rpm => {
      const key = [rpm.name, rpm.epoch, rpm.version, rpm.release, rpm.architecture].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(rpm => ({
      name: rpm.name,
      version: orUndefined(rpm.version),
      release: orUndefined(rpm.release),
      epoch: orUndefined(rpm.epoch),
      architecture: orUndefined(rpm.architecture),
      summary: orUndefined(rpm.summary),
    }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

/**
 * The build file of an image (Containerfile / Dockerfile), stored with the `buildfile` key.
 */
export function toContainerfile(files: PyxisFile[]): ImageFile | undefined {
  const file =
    files.find(item => item.key === 'buildfile') ??
    files.find(item => /(Container|Docker)file/.test(item.filename ?? ''));
  if (!file?.content) return undefined;
  return { filename: file.filename ?? 'Containerfile', content: file.content };
}
