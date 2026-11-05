<script lang="ts">
import type { RepositoryDetail } from '@podman-desktop/extension-redhat-catalog-core-api';

import Label from '$lib/badges/Label.svelte';
import ExternalContent from '$lib/content/ExternalContent.svelte';
import { dialogAPI } from '/@/api/client';
import { formatDate, formatSize } from '/@/utils/format';

interface Props {
  detail: RepositoryDetail;
}

let { detail }: Props = $props();

let latest = $derived(detail.latestImages[0]);
let architectures = $derived(detail.latestImages.map(({ architecture }) => architecture));
</script>

<div class="flex flex-row gap-x-6 w-full">
  <section class="flex flex-col grow min-w-0 gap-y-3" aria-label="Description">
    {#if detail.replacedBy}
      <div class="py-2 px-3 bg-amber-600/15 border-l-3 border-l-amber-600 rounded-r text-(--pd-content-text)">
        This repository is replaced by <strong>{detail.replacedBy}</strong>.
      </div>
    {/if}
    {#if detail.shortDescription}
      <p class="m-0 text-(--pd-content-header) text-lg">{detail.shortDescription}</p>
    {/if}
    {#if detail.description}
      <ExternalContent content={detail.description} format={detail.descriptionFormat} />
    {:else}
      <p class="text-(--pd-content-text) opacity-70">The publisher did not provide a description.</p>
    {/if}
  </section>

  <aside
    class="flex flex-col w-72 min-w-72 gap-y-4 text-sm text-(--pd-content-text)"
    aria-label="Repository information">
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 m-0">
      {#if detail.publisher}
        <dt class="opacity-70">Publisher</dt>
        <dd class="m-0">{detail.publisher}</dd>
      {/if}
      <dt class="opacity-70">Pull from</dt>
      <dd class="m-0 break-all">{detail.pullTarget.registry}</dd>
      {#if latest?.pushDate}
        <dt class="opacity-70">Last pushed</dt>
        <dd class="m-0">{formatDate(latest.pushDate)}</dd>
      {/if}
      {#if latest?.sizeBytes}
        <dt class="opacity-70">Size</dt>
        <dd class="m-0">{formatSize(latest.sizeBytes)} ({latest.architecture})</dd>
      {/if}
      {#if detail.eolDate}
        <dt class="opacity-70">End of life</dt>
        <dd class="m-0">{formatDate(detail.eolDate)}</dd>
      {/if}
      <dt class="opacity-70">Images</dt>
      <dd class="m-0">{detail.totalImages}</dd>
    </dl>

    {#each [{ title: 'Architectures', values: architectures }, { title: 'Categories', values: [...detail.buildCategories, ...detail.applicationCategories] }, { title: 'Release', values: detail.releaseCategories }] as group (group.title)}
      {#if group.values.length}
        <div class="flex flex-col gap-y-1">
          <span class="opacity-70">{group.title}</span>
          <div class="flex flex-wrap gap-1">
            {#each group.values as value (value)}<Label>{value}</Label>{/each}
          </div>
        </div>
      {/if}
    {/each}

    {#if detail.documentationLinks.length}
      <div class="flex flex-col gap-y-1">
        <span class="opacity-70">Documentation</span>
        <ul class="list-none p-0 m-0 flex flex-col gap-y-1">
          {#each detail.documentationLinks as link (link.url)}
            <li>
              <button
                class="text-left text-(--pd-link) hover:underline cursor-pointer"
                onclick={(): Promise<boolean> => dialogAPI.openExternal(link.url)}>{link.title}</button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </aside>
</div>
