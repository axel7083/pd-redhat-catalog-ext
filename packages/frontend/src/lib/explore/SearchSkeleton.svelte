<script lang="ts">
import { DEFAULT_PAGE_SIZE } from '@podman-desktop/extension-redhat-catalog-core-api';

import RepositoryCardSkeleton from '$lib/skeleton/RepositoryCardSkeleton.svelte';
</script>

<!-- same layout as SearchResults: the result count, then the grid -->
<div class="flex flex-col w-full" role="status" aria-label="Loading the catalog">
  <div class="px-5 pb-2 animate-pulse" aria-hidden="true">
    <div class="h-2.5 w-28 my-1 rounded bg-(--pd-content-card-bg)"></div>
  </div>
  <div class="px-5 py-3 grid min-[920px]:grid-cols-2 min-[1180px]:grid-cols-3 gap-3">
    <!-- a full page of cards: the scrollbar is there from the start, the layout does not move when results arrive -->
    {#each Array.from({ length: DEFAULT_PAGE_SIZE }, (_, index) => index) as card (card)}
      <RepositoryCardSkeleton />
    {/each}
  </div>
</div>
