<script lang="ts">
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import type { SearchResult } from '@podman-desktop/extension-redhat-catalog-core-api';
import Fa from 'svelte-fa';

import { resolve } from '$app/paths';
import { catalogAPI } from '/@/api/client';
import { catalogSearch } from '/@/utils/search-params';
import CollectionTiles from './CollectionTiles.svelte';
import type { Collection } from './content';

interface Props {
  collection: Collection;
  minWidth?: number;
}

let { collection, minWidth = 220 }: Props = $props();

let result: Promise<SearchResult> = $derived(
  catalogAPI.search({
    repositories: collection.picks.map(pick => pick.repository),
    page: 0,
    // a repository can be published on several registries
    pageSize: collection.picks.length * 2,
  }),
);
</script>

<!-- link to the catalog with a query string: resolve('/') + catalogSearch(), which the rule does not recognize -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<section class="flex flex-col gap-y-3" aria-label={collection.title}>
  <div class="flex flex-row items-end gap-x-3">
    <div class="flex flex-col min-w-0 grow">
      <h2 class="m-0 text-base font-semibold text-[var(--pd-content-header)]">{collection.title}</h2>
      <span class="truncate text-sm text-[var(--pd-content-text)] opacity-80">{collection.description}</span>
    </div>
    {#if collection.query}
      <a
        href={resolve('/') + catalogSearch(collection.query)}
        class="flex shrink-0 items-center gap-x-1.5 text-sm text-[var(--pd-link)] no-underline hover:underline"
        aria-label="See all {collection.title}">
        See all <Fa icon={faArrowRight} size="0.85x" />
      </a>
    {/if}
  </div>

  <svelte:boundary>
    <CollectionTiles result={result} picks={collection.picks} minWidth={minWidth} />
    {#snippet pending()}
      <div
        class="grid gap-x-3 auto-rows-[0] grid-rows-[auto] overflow-hidden"
        style:grid-template-columns="repeat(auto-fill, minmax(max({minWidth}px, calc((100% - 60px) / 6)), 1fr))"
        aria-hidden="true">
        {#each collection.picks as pick (pick.repository)}
          <div class="h-[154px] rounded-lg bg-[var(--pd-content-card-bg)] animate-pulse"></div>
        {/each}
      </div>
    {/snippet}
    {#snippet failed()}
      <p class="m-0 text-sm text-[var(--pd-content-text)] opacity-70">Unable to load this collection.</p>
    {/snippet}
  </svelte:boundary>
</section>
