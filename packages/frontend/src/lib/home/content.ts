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
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import {
  faBrain,
  faCertificate,
  faCubes,
  faDatabase,
  faHandshake,
  faLayerGroup,
  faShieldHalved,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';
import type { SearchQuery } from '@podman-desktop/extension-redhat-catalog-core-api';

export interface Article {
  /**
   * What the article is for the reader, shown above the title.
   */
  kicker: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  icon: IconDefinition;
  /**
   * The images the article is about.
   */
  collection?: string;
}

/**
 * Selected articles. There is no official articles API: the list is curated (the search index serves them, but its
 * ranking does not pick the introductory ones). The first one is the lead.
 */
export const ARTICLES: Article[] = [
  {
    kicker: 'Hardened images 101',
    title: 'Red Hat Hardened Images: Top 5 benefits for software developers',
    summary:
      'Minimal, distroless images rebuilt continuously: fewer CVE alerts to triage, a verifiable supply chain, and less to maintain.',
    url: 'https://developers.redhat.com/articles/2026/05/12/red-hat-hardened-images-top-5-benefits-software-developers',
    source: 'Red Hat Developer',
    icon: faShieldHalved,
    collection: 'hardened',
  },
  {
    kicker: 'Certified explained',
    title: 'What does Red Hat certified and partner validated mean?',
    summary: 'What Red Hat checks before a partner image is certified, and what support you get.',
    url: 'https://access.redhat.com/articles/7105241',
    source: 'Red Hat Customer Portal',
    icon: faCertificate,
  },
  {
    kicker: 'Choosing a base image',
    title: 'Red Hat UBI vs. Red Hat Hardened Images: How to choose',
    summary: 'Universal Base Images or Hardened Images: which foundation fits your application.',
    url: 'https://developers.redhat.com/articles/2026/06/29/red-hat-ubi-vs-red-hat-hardened-images-how-to-choose',
    source: 'Red Hat Developer',
    icon: faLayerGroup,
  },
  {
    kicker: 'In Podman Desktop',
    title: 'Harden local container base images in Podman Desktop',
    summary: 'Swap the base images of your local containers for hardened ones, from Podman Desktop.',
    url: 'https://developers.redhat.com/articles/2026/08/10/harden-local-container-base-images-podman-desktop',
    source: 'Red Hat Developer',
    icon: faWrench,
  },
];

/**
 * A repository picked for a collection (an editorial choice). Its title and description come from the catalog;
 * `title` and `description` only fix catalog data that is unusable as is (a repository path as the title, an
 * unrelated description).
 */
export interface Pick {
  repository: string;
  title?: string;
  description?: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  icon: IconDefinition;
  picks: Pick[];
  /**
   * The search behind "See all": the filters are applied on the catalog. None when the collection is a showcase with
   * nothing to filter on (its repositories share no product, category or search term).
   */
  query?: SearchQuery;
}

/**
 * Curated collections, in display order.
 */
export const COLLECTIONS: Collection[] = [
  {
    id: 'hardened',
    title: 'Red Hat Hardened Images',
    description: 'Minimal and distroless, rebuilt continuously with no known CVEs',
    icon: faShieldHalved,
    query: { filters: { build_categories_list: ['Hardened'] } },
    picks: ['hi/python', 'hi/nodejs', 'hi/openjdk', 'hi/go', 'hi/nginx', 'hi/postgresql', 'hi/rust', 'hi/httpd'].map(
      repository => ({ repository }),
    ),
  },
  {
    id: 'base',
    title: 'Start from a base image',
    description: 'Universal Base Images: RHEL, free to use and redistribute',
    icon: faCubes,
    query: {
      filters: {
        product_listings_names: [
          'Red Hat Universal Base Image 10',
          'Red Hat Universal Base Image 9',
          'Red Hat Universal Base Image 8',
        ],
      },
    },
    picks: ['ubi10/ubi', 'ubi10/ubi-minimal', 'ubi10/ubi-micro', 'ubi10/ubi-init', 'ubi9/ubi', 'ubi9/ubi-minimal'].map(
      repository => ({ repository }),
    ),
  },
  {
    id: 'languages',
    title: 'Build with your language',
    description: 'Runtimes and toolchains on UBI, ready for your code',
    icon: faLayerGroup,
    query: { filters: { build_categories_list: ['Builder image'] } },
    picks: [
      'ubi10/python-312-minimal',
      'ubi10/nodejs-24',
      'ubi10/openjdk-25',
      'ubi10/go-toolset',
      'ubi10/ruby-40',
      'ubi10/php-84',
    ].map(repository => ({ repository })),
  },
  {
    id: 'databases',
    title: 'Databases',
    description: 'Supported database servers on RHEL',
    icon: faDatabase,
    query: { filters: { application_categories_list: ['Database & Data Management'] } },
    picks: [
      'rhel10/postgresql-18',
      'rhel10/mysql-84',
      'rhel10/mariadb-118',
      'rhel10/memcached',
      'hi/valkey',
      'hi/sqlite',
    ].map(repository => ({ repository })),
  },
  {
    id: 'ai',
    title: 'Red Hat AI',
    description: 'Serve and tune models, and plug agents into RHEL',
    icon: faBrain,
    picks: [
      // the catalog titles of these repositories are their paths
      { repository: 'rhaiis/vllm-cuda-rhel9', title: 'AI Inference Server (CUDA)' },
      { repository: 'rhaiis/vllm-rocm-rhel9', title: 'AI Inference Server (ROCm)' },
      { repository: 'rhaiis/vllm-cpu-rhel9', title: 'AI Inference Server (CPU)' },
      { repository: 'rhelai1/instructlab-nvidia-rhel9', title: 'InstructLab (NVIDIA)' },
      // catalog description: "RHEL AI UI"
      {
        repository: 'rhelai1/docling-serve-rhel9',
        title: 'Docling Serve',
        description: 'Converts documents for generative AI applications',
      },
      { repository: 'rhel10/mcp-server-for-rhel' },
    ],
  },
  {
    id: 'partners',
    title: 'From certified partners',
    description: 'Software vendors certified by Red Hat, supported on RHEL and OpenShift',
    icon: faHandshake,
    query: { scope: 'partners' },
    picks: [
      // catalog description: "MCR Repository"
      { repository: 'mssql/rhel/server', description: 'Microsoft SQL Server on Red Hat Enterprise Linux' },
      { repository: 'couchbase/server' },
      { repository: 'hashicorp/vault' },
      { repository: 'cockroachdb/cockroach' },
      { repository: 'hazelcast/hazelcast-enterprise-5-rhel8' },
      { repository: 'crunchydata/crunchy-postgres' },
      { repository: 'nginx/nginx-ingress' },
      { repository: 'dynatrace/oneagent' },
    ],
  },
];
