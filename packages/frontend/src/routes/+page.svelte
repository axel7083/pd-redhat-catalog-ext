<script module lang="ts">
/**
 * Scroll position of the home page, restored when coming back to it (from the catalog or a repository).
 */
let homeScroll = 0;
</script>

<script lang="ts">
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import type { SearchResult } from '@podman-desktop/extension-redhat-catalog-core-api';
import { Button, SearchInput } from '@podman-desktop/ui-svelte';

import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
// inlined (data URL), like the other webview images
import redHatLogo from '$lib/home/assets/redhat-hat.webp?inline';
import FrontPage from '$lib/home/FrontPage.svelte';
import { catalogHref } from '/@/utils/search-params';
import type { PageProps } from './$types';

let { data }: PageProps = $props();

let text = $state('');
let scroller: HTMLDivElement | undefined = $state(undefined);

/**
 * Facet counts of the catalog (categories), when loaded: the page does not wait for them.
 */
let catalog: SearchResult | undefined = $state.raw(undefined);
$effect(() => {
  const promise = data.catalog;
  promise
    .then(result => {
      if (promise === data.catalog) catalog = result;
    })
    .catch(console.error);
});

/**
 * The home page has no filters: searching opens the catalog with the text.
 */
function search(): void {
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  goto(catalogHref({ text: text.trim() || undefined })).catch(console.error);
}

function onsubmit(event: SubmitEvent): void {
  event.preventDefault();
  search();
}

/**
 * The page scrolls in its content, not the window: SvelteKit does not restore it.
 */
beforeNavigate(() => {
  homeScroll = scroller?.scrollTop ?? 0;
});

afterNavigate(({ type }) => {
  // the rows render their placeholders first: restore once laid out
  if (type === 'popstate') requestAnimationFrame(() => scroller?.scrollTo({ top: homeScroll }));
});
</script>

<!-- the NavPage layout of Podman Desktop, with the Red Hat logo before the title -->
<div class="flex flex-col w-full h-full pt-4 bg-[var(--pd-content-bg)]" role="region" aria-label="Red Hat Catalog">
  <div class="flex flex-row items-center gap-x-3 px-5 pb-2" role="region" aria-label="header">
    <img src={redHatLogo} alt="Red Hat" class="h-7 w-auto" />
    <h1 class="m-0 text-xl font-bold text-[var(--pd-content-header)]">Red Hat Catalog</h1>
  </div>
  <div bind:this={scroller} class="flex flex-col w-full h-full min-h-0 overflow-y-auto">
    <form class="flex flex-row items-center gap-3 px-5 pt-4 pb-6" role="search" onsubmit={onsubmit}>
      <SearchInput class="grow" title="Red Hat Ecosystem Catalog" bind:searchTerm={text} />
      <Button icon={faArrowRight} aria-label="Search the catalog" onclick={search}>
        {text.trim() ? 'Search' : 'Browse the catalog'}
      </Button>
    </form>
    <FrontPage catalog={catalog} />
  </div>
</div>
