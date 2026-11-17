<script lang="ts">
import type { FacetValue } from '@podman-desktop/extension-redhat-catalog-core-api';

import { catalogHref } from '/@/utils/search-params';

interface Props {
  categories: FacetValue[];
}

let { categories }: Props = $props();
</script>

<!-- links to the catalog with a query string: catalogHref(), which the rule does not recognize -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<section class="flex flex-col gap-y-3" aria-label="Browse by category">
  <h2 class="m-0 text-base font-semibold text-[var(--pd-content-header)]">Browse by category</h2>
  <div class="flex flex-row flex-wrap gap-2">
    {#each categories as category (category.value)}
      <a
        href={catalogHref({ filters: { application_categories_list: [category.value] } })}
        class="flex items-center gap-x-2 rounded-full border border-[var(--pd-content-divider)] px-3 py-1 text-sm text-[var(--pd-content-text)] no-underline hover:border-[var(--pd-content-card-border-selected)] hover:text-[var(--pd-content-header)]">
        {category.value}
        <span class="text-xs opacity-60">{category.count.toLocaleString()}</span>
      </a>
    {/each}
  </div>
</section>
