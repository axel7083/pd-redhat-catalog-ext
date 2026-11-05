<script lang="ts">
import type { RepositorySummary } from '@podman-desktop/extension-redhat-catalog-core-api';
import { TableDurationColumn } from '@podman-desktop/ui-svelte';

import { resolve } from '$app/paths';
import GradeBadge from '$lib/badges/GradeBadge.svelte';
import Label from '$lib/badges/Label.svelte';
import RepositoryIcon from '$lib/icons/RepositoryIcon.svelte';
import { catalogAPI } from '/@/api/client';

interface Props {
  object: RepositorySummary;
  pulled?: Promise<boolean>;
}

let { object: repository, pulled }: Props = $props();

let logoFailed = $state(false);
let hardened = $derived(repository.buildCategories.includes('Hardened'));
let deprecated = $derived(repository.releaseCategories.includes('Deprecated'));
let updated = $derived(repository.pushDate ?? repository.lastModified);

let prefetched = false;
/**
 * Warm the backend cache: the detail query takes ~2s.
 */
function prefetch(): void {
  if (prefetched) return;
  prefetched = true;
  catalogAPI.prefetchRepository(repository.registry, repository.repository).catch(() => {
    prefetched = false;
  });
}
</script>

<a
  href={resolve('/repository/[registry]/[...repository]', {
    registry: repository.registry,
    repository: repository.repository,
  })}
  onmouseenter={prefetch}
  onfocus={prefetch}
  class="rounded-lg border border-[var(--pd-content-bg)] flex flex-col bg-[var(--pd-content-card-bg)] hover:border-[var(--pd-content-card-border-selected)] min-h-48 max-h-48 no-underline"
  aria-label={repository.title}>
  <div class="p-3 h-full w-full flex flex-col gap-y-2 justify-between">
    <div class="flex flex-col w-full gap-y-2 min-w-0">
      <div class="flex flex-row items-center gap-x-2 min-w-0">
        {#if repository.logoUrl && !logoFailed}
          <img
            src={repository.logoUrl}
            alt=""
            class="w-6 h-6 object-contain"
            onerror={(): boolean => (logoFailed = true)} />
        {:else}
          <RepositoryIcon />
        {/if}
        <div class="flex flex-col min-w-0">
          <div class="text-(--pd-content-header) truncate" title={repository.title}>{repository.title}</div>
          <div class="text-(--pd-link) truncate text-sm" title="{repository.registry}/{repository.repository}">
            {repository.repository}
          </div>
        </div>
      </div>

      {#if repository.description}
        <p class="line-clamp-2 overflow-hidden text-(--pd-content-text) m-0">{repository.description}</p>
      {/if}

      <div class="flex flex-wrap gap-1">
        {#if hardened}<Label tone="accent">Hardened</Label>{/if}
        {#if deprecated}<Label tone="warning">Deprecated</Label>{/if}
        {#await pulled then isPulled}
          {#if isPulled}<Label title="An image of this repository is present locally">Pulled</Label>{/if}
        {/await}
        {#each repository.architectures as architecture (architecture)}
          <Label>{architecture}</Label>
        {/each}
      </div>
    </div>

    <div class="flex flex-row items-center justify-between gap-x-2 text-sm text-(--pd-content-text)">
      <span class="truncate" title="Publisher">{repository.publisher ?? 'Unknown publisher'}</span>
      <span class="flex items-center gap-x-2 whitespace-nowrap">
        {#if updated}
          <span class="flex gap-x-1">
            <TableDurationColumn object={new Date(updated)} /> ago
          </span>
        {/if}
        <GradeBadge grade={repository.freshnessGrade} />
      </span>
    </div>
  </div>
</a>
