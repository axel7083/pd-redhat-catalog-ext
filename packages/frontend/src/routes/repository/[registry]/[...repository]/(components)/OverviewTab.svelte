<script lang="ts">
import type { CatalogImage, RepositoryDetail } from '@podman-desktop/extension-redhat-catalog-core-api';

import Label from '$lib/badges/Label.svelte';
import ExternalContent from '$lib/content/ExternalContent.svelte';
import { dialogAPI } from '/@/api/client';
import { formatDate, formatSize } from '/@/utils/format';

interface Props {
  detail: RepositoryDetail;
  /**
   * The image of the platform picked in the page header: size and push date.
   */
  image: CatalogImage | undefined;
}

let { detail, image: latest }: Props = $props();
let architectures = $derived(detail.latestImages.map(({ architecture }) => architecture));
let categories = $derived([...detail.buildCategories, ...detail.applicationCategories]);

let entries = $derived(
  [
    { label: 'Publisher', value: detail.publisher },
    { label: 'Pull from', value: detail.pullTarget.registry },
    { label: 'Last pushed', value: formatDate(latest?.pushDate) },
    {
      label: 'Size',
      value: latest?.sizeBytes ? `${formatSize(latest.sizeBytes)} (${latest.architecture})` : undefined,
    },
    { label: 'End of life', value: formatDate(detail.eolDate) },
  ].filter(item => !!item.value),
);
</script>

<!-- same layout as the extension details page: description, then a summary card on the right -->
<div class="flex flex-col-reverse lg:flex-row gap-5 w-full">
  <section class="flex flex-col grow min-w-0 gap-y-3" aria-label="Description">
    {#if detail.replacedBy}
      <div class="py-2 px-3 bg-amber-600/15 border-l-3 border-l-amber-600 rounded-r text-(--pd-content-text)">
        This repository is replaced by <strong>{detail.replacedBy}</strong>.
      </div>
    {/if}
    {#if detail.description}
      <ExternalContent content={detail.description} format={detail.descriptionFormat} />
    {:else if detail.shortDescription}
      <p class="m-0 text-[var(--pd-details-body-text)]">{detail.shortDescription}</p>
    {:else}
      <p class="m-0 text-[var(--pd-details-body-text)] opacity-70">The publisher did not provide a description.</p>
    {/if}
  </section>

  <aside
    class="flex flex-col gap-y-3 lg:w-72 lg:min-w-72 h-fit bg-[var(--pd-details-card-bg)] p-4 rounded-md"
    aria-label="Repository information">
    {#each entries as item (item.label)}
      <div class="flex flex-col gap-y-0.5">
        <span class="uppercase text-xs text-[var(--pd-details-card-header)]">{item.label}</span>
        <span class="text-sm text-[var(--pd-details-card-text)] break-all">{item.value}</span>
      </div>
    {/each}

    {#each [{ title: 'Architectures', values: architectures }, { title: 'Categories', values: categories }] as group (group.title)}
      {#if group.values.length}
        <div class="flex flex-col gap-y-1">
          <span class="uppercase text-xs text-[var(--pd-details-card-header)]">{group.title}</span>
          <div class="flex flex-wrap gap-1">
            {#each group.values as value (value)}<Label>{value}</Label>{/each}
          </div>
        </div>
      {/if}
    {/each}

    {#if detail.documentationLinks.length}
      <div class="flex flex-col gap-y-1">
        <span class="uppercase text-xs text-[var(--pd-details-card-header)]">Documentation</span>
        {#each detail.documentationLinks as link (link.url)}
          <button
            class="text-left text-sm text-[var(--pd-link)] hover:bg-[var(--pd-link-hover-bg)] rounded-[4px] p-0.5 cursor-pointer"
            onclick={(): Promise<boolean> => dialogAPI.openExternal(link.url)}>{link.title}</button>
        {/each}
      </div>
    {/if}
  </aside>
</div>
