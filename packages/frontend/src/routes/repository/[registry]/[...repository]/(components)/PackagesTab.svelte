<script lang="ts">
import { faBoxOpen, faWarning } from '@fortawesome/free-solid-svg-icons';
import type { CatalogImage, ImagePackage } from '@podman-desktop/extension-redhat-catalog-core-api';
import { EmptyScreen, SearchInput } from '@podman-desktop/ui-svelte';

import ListSkeleton from '$lib/skeleton/ListSkeleton.svelte';
import { catalogAPI } from '/@/api/client';

interface Props {
  image: CatalogImage;
}

let { image }: Props = $props();

let filter = $state('');
let packages: Promise<ImagePackage[]> = $derived(catalogAPI.getPackages(image.id));

function matches(item: ImagePackage): boolean {
  const term = filter.trim().toLowerCase();
  return !term || item.name.toLowerCase().includes(term) || !!item.summary?.toLowerCase().includes(term);
}

function version(item: ImagePackage): string {
  const value = [item.version, item.release].filter(Boolean).join('-');
  return item.epoch && item.epoch !== '0' ? `${item.epoch}:${value}` : value;
}
</script>

{#await packages}
  <ListSkeleton />
{:then items}
  {#if items.length === 0}
    <EmptyScreen
      icon={faBoxOpen}
      title="No package list"
      aria-label="No package list"
      message="The publisher did not provide an RPM manifest for this image." />
  {:else}
    {@const visible = items.filter(matches)}
    <div class="flex flex-row items-center gap-x-3">
      <SearchInput class="grow" title="packages" bind:searchTerm={filter} />
      <span class="text-sm text-(--pd-content-text) whitespace-nowrap"
        >{visible.length} of {items.length} packages</span>
    </div>
    <table class="w-full text-sm text-(--pd-content-text) border-collapse" aria-label="Packages">
      <thead>
        <tr class="text-left text-(--pd-table-header-text) border-b border-[var(--pd-content-divider)]">
          <th class="py-2 pr-3 font-normal">Name</th>
          <th class="py-2 pr-3 font-normal">Version</th>
          <th class="py-2 font-normal">Architecture</th>
        </tr>
      </thead>
      <tbody>
        {#each visible as item (`${item.name}-${version(item)}-${item.architecture}`)}
          <tr class="border-b border-[var(--pd-content-divider)]">
            <td class="py-1 pr-3">{item.name}</td>
            <td class="py-1 pr-3 font-mono">{version(item)}</td>
            <td class="py-1">{item.architecture ?? '—'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
{:catch err}
  <EmptyScreen
    icon={faWarning}
    title="Unable to fetch the packages"
    aria-label="Error while fetching the packages"
    message={err instanceof Error ? err.message : String(err)} />
{/await}
