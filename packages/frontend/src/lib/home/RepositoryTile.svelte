<script lang="ts">
import type { RepositorySummary } from '@podman-desktop/extension-redhat-catalog-core-api';

import { resolve } from '$app/paths';
import HardenedBadge from '$lib/badges/HardenedBadge.svelte';
import RepositoryLogo from '$lib/icons/RepositoryLogo.svelte';
import { catalogAPI } from '/@/api/client';
import type { Pick } from './content';

interface Props {
  repository: RepositorySummary;
  /**
   * The curated pick: fixes of unusable catalog titles and descriptions.
   */
  pick?: Pick;
}

let { repository, pick }: Props = $props();

let hardened = $derived(repository.buildCategories.includes('Hardened'));
let partner = $derived(!!repository.publisher && repository.publisher !== 'Red Hat');
// "Red Hat Hardened Images <streams>": the repository name reads better, the badge says it is hardened
let title = $derived(pick?.title ?? (hardened ? repository.repository.replace(/^hi\//, '') : repository.title));
let description = $derived(
  pick?.description ?? (repository.description === repository.title ? undefined : repository.description),
);

let prefetched = false;
function prefetch(): void {
  if (prefetched) return;
  prefetched = true;
  catalogAPI.prefetchRepository(repository.registry, repository.repository).catch(() => {
    prefetched = false;
  });
}
</script>

<!-- front page card: what the image is, at a glance; pull and run are on the catalog cards and the repository page -->
<a
  href={resolve('/repository/[registry]/[...repository]', {
    registry: repository.registry,
    repository: repository.repository,
  })}
  onmouseenter={prefetch}
  onfocus={prefetch}
  class="group flex flex-col gap-y-3 h-full min-w-0 rounded-lg border border-[var(--pd-content-bg)] bg-[var(--pd-content-card-bg)] p-4 no-underline hover:border-[var(--pd-content-card-border-selected)]"
  aria-label={repository.title}>
  <div class="flex flex-row items-start justify-between gap-x-2 min-w-0">
    <RepositoryLogo url={repository.logoUrl} name={repository.publisher ?? repository.repository} wide />
    {#if hardened}<HardenedBadge />{/if}
  </div>
  <div class="flex flex-col min-w-0 gap-y-0.5">
    <span class="truncate font-semibold text-[var(--pd-content-header)]">{title}</span>
    <span class="truncate text-xs text-[var(--pd-content-text)] opacity-70">
      {partner ? repository.publisher : repository.repository}
    </span>
  </div>
  <p class="m-0 line-clamp-2 h-10 leading-5 text-sm text-[var(--pd-content-text)]">{description ?? ''}</p>
</a>
