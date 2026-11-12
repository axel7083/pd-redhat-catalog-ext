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
// Pyxis answers with explicit nulls
/* eslint-disable no-null/no-null */
import { describe, expect, test } from 'vitest';

import {
  currentGrade,
  pickRecommendedTag,
  toContainerfile,
  toPackages,
  toRepositoryDetail,
  toRepositoryTags,
  toSeverity,
  toTagGroups,
  toVulnerabilities,
} from '/@/catalog/repository-mapper';
import type { RepositoryDetailQuery } from '/@/pyxis/generated/graphql';

type Image = NonNullable<
  NonNullable<NonNullable<RepositoryDetailQuery['find_repository_images_by_registry_path']>['data']>[number]
>;

function image(id: string, architecture: string, digest: string, tags: string[], pushDate: string): Image {
  return {
    _id: id,
    architecture,
    docker_image_digest: null,
    sum_layer_size_bytes: 1024,
    freshness_grades: [{ grade: 'A', start_date: '2026-01-01T00:00:00Z', end_date: null }],
    repositories: [
      {
        repository: 'other/repository',
        manifest_list_digest: 'sha256:other',
        manifest_schema2_digest: null,
        push_date: pushDate,
        tags: [{ name: 'other' }],
      },
      {
        repository: 'rhel9/postgresql-16',
        manifest_list_digest: digest,
        manifest_schema2_digest: 'sha256:schema2',
        push_date: pushDate,
        tags: tags.map(name => ({ name })),
      },
    ],
  };
}

const QUERY: RepositoryDetailQuery = {
  latest_build: null,
  get_repository_vendor_by_registry_path: { data: { name: 'Red Hat' } },
  get_repository_by_registry_path: {
    error: null,
    data: {
      _id: 'repo-id',
      registry: 'registry.access.redhat.com',
      repository: 'rhel9/postgresql-16',
      vendor_label: 'redhat',
      requires_terms: true,
      eol_date: null,
      display_data: {
        name: 'PostgreSQL 16',
        short_description: 'short',
        long_description: '<p>None</p>\n',
        long_description_markdown: '# PostgreSQL',
      },
      documentation_links: [
        { title: 'Docs', type: 'documentation', url: 'https://example.com' },
        { title: null, type: null, url: null },
      ],
      release_categories: ['Generally Available'],
      build_categories: ['Standalone image'],
      application_categories: ['Database', null],
      content_stream_tags: null,
      replaced_by_repository_name: null,
      ui_get_this_image_override: null,
    },
  },
  find_repository_images_by_registry_path: {
    total: 600,
    error: null,
    data: [
      image('new-amd64', 'amd64', 'sha256:new', ['1-200', 'latest', '1'], '2026-11-02T00:00:00Z'),
      image('new-arm64', 'arm64', 'sha256:new', ['1-200', 'latest', '1'], '2026-11-02T00:00:00Z'),
      image('old-amd64', 'amd64', 'sha256:old', ['1-100'], '2026-10-01T00:00:00Z'),
    ],
  },
};

describe('toRepositoryDetail', () => {
  test('maps the repository, resolves the pull target and groups tags', () => {
    const detail = toRepositoryDetail('registry.access.redhat.com', 'rhel9/postgresql-16', QUERY);

    expect(detail).toEqual(
      expect.objectContaining({
        id: 'repo-id',
        name: 'PostgreSQL 16',
        description: '# PostgreSQL',
        descriptionFormat: 'markdown',
        requiresTerms: true,
        applicationCategories: ['Database'],
        documentationLinks: [{ title: 'Docs', type: 'documentation', url: 'https://example.com' }],
        recommendedTag: '1-200',
        publisher: 'Red Hat',
        totalImages: 600,
        catalogUrl: 'https://catalog.redhat.com/software/containers/rhel9/postgresql-16/repo-id',
      }),
    );
    expect(detail.pullTarget.registry).toBe('registry.redhat.io');
    expect(detail.latestImages.map(({ id }) => id)).toEqual(['new-amd64', 'new-arm64']);
    expect(detail.latestImages[0]).toEqual(
      expect.objectContaining({
        digest: 'sha256:new',
        tags: ['1-200', 'latest', '1'],
        freshnessGrade: 'A',
        sizeBytes: 1024,
      }),
    );
  });

  test('the amd64 image comes first, whatever the push order', () => {
    const query = structuredClone(QUERY);
    query.find_repository_images_by_registry_path!.data!.reverse();

    const detail = toRepositoryDetail('registry.access.redhat.com', 'rhel9/postgresql-16', query);
    expect(detail.latestImages.map(({ architecture }) => architecture)).toEqual(['amd64', 'arm64']);
  });

  test('the build tagged latest is the default one, even when variants were pushed after it', () => {
    const query = structuredClone(QUERY);
    query.find_repository_images_by_registry_path!.data = [
      image('builder-amd64', 'amd64', 'sha256:builder', ['1-builder', '1-builder-300'], '2026-11-03T00:00:00Z'),
    ];
    query.latest_build = {
      data: [image('latest-amd64', 'amd64', 'sha256:latest', ['1', '1-200', 'latest'], '2026-11-02T00:00:00Z')],
    };

    const detail = toRepositoryDetail('registry.access.redhat.com', 'rhel9/postgresql-16', query);
    expect(detail.latestImages.map(({ id }) => id)).toEqual(['latest-amd64']);
    expect(detail.recommendedTag).toBe('1-200');
  });

  test('without a latest tag, the newest images are the default build', () => {
    const detail = toRepositoryDetail('registry.access.redhat.com', 'rhel9/postgresql-16', QUERY);
    expect(detail.latestImages.map(({ id }) => id)).toEqual(['new-amd64', 'new-arm64']);
  });

  test('ignores the "<p>None</p>" HTML description', () => {
    const query = structuredClone(QUERY);
    query.get_repository_by_registry_path!.data!.display_data!.long_description_markdown = null;

    const detail = toRepositoryDetail('registry.access.redhat.com', 'rhel9/postgresql-16', query);
    expect(detail.description).toBeUndefined();
  });

  test('throws when the repository does not exist', () => {
    expect(() =>
      toRepositoryDetail('quay.io', 'nope', {
        get_repository_by_registry_path: { error: { status: 404, detail: 'not found' }, data: null },
        get_repository_vendor_by_registry_path: null,
        latest_build: null,
        find_repository_images_by_registry_path: null,
      }),
    ).toThrow('Repository quay.io/nope not found: not found');
  });
});

test('toRepositoryTags groups the images of a build', () => {
  expect(
    toRepositoryTags('rhel9/postgresql-16', {
      find_repository_images_by_registry_path: QUERY.find_repository_images_by_registry_path,
    }),
  ).toEqual([
    expect.objectContaining({ digest: 'sha256:new', architectures: ['amd64', 'arm64'] }),
    expect.objectContaining({ digest: 'sha256:old', tags: ['1-100'], architectures: ['amd64'] }),
  ]);
});

test('toTagGroups drops groups without tags', () => {
  expect(toTagGroups([{ id: 'a', architecture: 'amd64', digest: 'sha256:a', tags: [] }])).toEqual([]);
});

test.each([
  { tags: ['latest', '1', '1.2', '1.2.3-17'], expected: '1.2.3-17' },
  { tags: ['latest', '9', '9.6'], expected: '9.6' },
  { tags: ['1-200', '1.12.11-1793827681', 'latest'], expected: '1.12.11-1793827681' },
  { tags: ['latest'], expected: 'latest' },
  { tags: [], expected: undefined },
])('pickRecommendedTag($tags) → $expected', ({ tags, expected }) => {
  expect(pickRecommendedTag(tags)).toBe(expected);
});

test('currentGrade', () => {
  const grades = [
    { grade: 'A', start_date: '2026-01-01T00:00:00Z', end_date: '2026-02-01T00:00:00Z' },
    { grade: 'B', start_date: '2026-02-01T00:00:00Z', end_date: null },
  ];
  expect(currentGrade(grades, Date.parse('2026-01-15T00:00:00Z'))).toBe('A');
  expect(currentGrade(grades, Date.parse('2026-03-01T00:00:00Z'))).toBe('B');
});

test('toSeverity', () => {
  expect(toSeverity('Critical')).toBe('critical');
  expect(toSeverity('Important')).toBe('important');
  expect(toSeverity('whatever')).toBe('unknown');
  expect(toSeverity(null)).toBe('unknown');
});

test('toVulnerabilities merges duplicated CVEs and sorts by severity', () => {
  const vulnerabilities = toVulnerabilities([
    {
      cve_id: 'CVE-1',
      severity: 'Moderate',
      advisory_id: '2026:1',
      advisory_type: 'RHSA',
      public_date: null,
      affected_packages: [{ name: 'curl', version: '1', arch: 'x86_64' }],
    },
    {
      cve_id: 'CVE-2',
      severity: 'Critical',
      advisory_id: null,
      advisory_type: null,
      public_date: null,
      affected_packages: null,
    },
    {
      cve_id: 'CVE-1',
      severity: 'Moderate',
      advisory_id: '2026:1',
      advisory_type: 'RHSA',
      public_date: null,
      affected_packages: [{ name: 'libcurl', version: '1', arch: 'x86_64' }],
    },
  ]);

  expect(vulnerabilities).toEqual([
    expect.objectContaining({ cveId: 'CVE-2', severity: 'critical', advisoryUrl: undefined }),
    expect.objectContaining({
      cveId: 'CVE-1',
      severity: 'moderate',
      advisoryId: 'RHSA-2026:1',
      advisoryUrl: 'https://access.redhat.com/errata/RHSA-2026:1',
      cveUrl: 'https://access.redhat.com/security/cve/CVE-1',
      affectedPackages: ['curl-1', 'libcurl-1'],
    }),
  ]);
});

test('toPackages drops duplicated entries', () => {
  const rpm = { name: 'bash', version: '5', release: '1', epoch: null, architecture: 'x86_64', summary: 'shell' };
  expect(toPackages([rpm, { ...rpm }, { ...rpm, architecture: 'noarch' }])).toHaveLength(2);
});

test('toPackages sorts by name and drops unnamed packages', () => {
  expect(
    toPackages([
      { name: 'zlib', version: '1', release: '1', epoch: null, architecture: 'x86_64', summary: null },
      { name: null, version: null, release: null, epoch: null, architecture: null, summary: null },
      { name: 'bash', version: '5', release: '1', epoch: null, architecture: 'x86_64', summary: 'shell' },
    ]).map(({ name }) => name),
  ).toEqual(['bash', 'zlib']);
});

test('toContainerfile picks the build file', () => {
  expect(
    toContainerfile([
      { filename: 'other', key: 'other', content: 'x' },
      { filename: 'Dockerfile', key: 'buildfile', content: 'FROM ubi9' },
    ]),
  ).toEqual({ filename: 'Dockerfile', content: 'FROM ubi9' });
  expect(toContainerfile([])).toBeUndefined();
});
