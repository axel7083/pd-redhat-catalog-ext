<script lang="ts">
import type { SearchResult } from '@podman-desktop/extension-redhat-catalog-core-api';

import ArticlesFeature from './ArticlesFeature.svelte';
import CategoryChips from './CategoryChips.svelte';
import CollectionShelf from './CollectionShelf.svelte';
import { COLLECTIONS } from './content';

interface Props {
  /**
   * The search of the whole catalog: its category counts.
   */
  catalog: SearchResult | undefined;
}

let { catalog }: Props = $props();

/**
 * The long tail: every category, but "Other" (the largest, and meaningless).
 */
let categories = $derived(
  (catalog?.facets.application_categories_list ?? []).filter(value => value.value !== 'Other').slice(0, 24),
);
</script>

<!-- the articles, a line of curated images per collection, then every category -->
<div class="flex flex-col gap-y-8 px-5 pt-2 pb-10">
  <ArticlesFeature />
  {#each COLLECTIONS as collection (collection.id)}
    <CollectionShelf collection={collection} />
  {/each}
  <CategoryChips categories={categories} />
</div>
