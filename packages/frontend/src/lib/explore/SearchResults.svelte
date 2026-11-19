<script lang="ts">
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import type {
  ProviderContainerConnectionDetailedInfo,
  SearchQuery,
  SearchResult,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import { EmptyScreen, LinearProgress } from '@podman-desktop/ui-svelte';

import RepositoryCard from '$lib/cards/RepositoryCard.svelte';
import Pagination from '$lib/explore/Pagination.svelte';

interface Props {
  query: SearchQuery;
  result: Promise<SearchResult>;
  connection: ProviderContainerConnectionDetailedInfo | undefined;
  onpage: (page: number) => void;
}

let { query, result, connection, onpage }: Props = $props();

/**
 * Async Svelte: the first render shows the boundary pending snippet (skeleton); on a new search the current
 * results stay on screen, dimmed, until the new ones arrive.
 */
let current = $derived(await result);
</script>

<div class="flex flex-col w-full">
  <div class="h-0.5">
    {#if $effect.pending()}<LinearProgress />{/if}
  </div>

  <div class="px-5 py-3 flex flex-col gap-y-3">
    {#if current.repositories.length === 0}
      <EmptyScreen
        icon={faMagnifyingGlass}
        title="No repositories found"
        aria-label="No repositories found"
        message="Try other search terms or remove some filters." />
    {:else}
      <div
        class={[
          'grid min-[920px]:grid-cols-2 min-[1180px]:grid-cols-3 gap-3 transition-opacity',
          $effect.pending() && 'opacity-60',
        ]}
        aria-busy={$effect.pending() > 0}>
        {#each current.repositories as repository (repository.id)}
          <RepositoryCard object={repository} connection={connection} />
        {/each}
      </div>
      <Pagination page={current.page} pageSize={current.pageSize} total={current.total} onpage={onpage} />
    {/if}
  </div>
</div>
