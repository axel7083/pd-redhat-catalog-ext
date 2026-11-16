<script lang="ts">
import type { RepositorySummary, SearchResult } from '@podman-desktop/extension-redhat-catalog-core-api';

import type { Pick } from './content';
import RepositoryTile from './RepositoryTile.svelte';

interface Props {
  result: Promise<SearchResult>;
  picks: Pick[];
  /**
   * Minimum width of a tile: the tiles of a single line of the grid are shown, the others are clipped.
   */
  minWidth?: number;
}

let { result, picks, minWidth = 220 }: Props = $props();

let current = $derived(await result);

/**
 * In the curated order, one per repository (a repository can be published on several registries).
 */
let tiles: Array<{ repository: RepositorySummary; pick: Pick }> = $derived(
  picks.flatMap(pick => {
    const repository = current.repositories.find(candidate => candidate.repository === pick.repository);
    return repository ? [{ repository, pick }] : [];
  }),
);
</script>

<!-- one line of at most 6 tiles: the rows after the first have a 0 height and are clipped -->
<div
  class="grid gap-x-3 auto-rows-[0] grid-rows-[auto] overflow-hidden"
  style:grid-template-columns="repeat(auto-fill, minmax(max({minWidth}px, calc((100% - 60px) / 6)), 1fr))">
  {#each tiles as tile (tile.repository.id)}
    <RepositoryTile repository={tile.repository} pick={tile.pick} />
  {/each}
</div>
