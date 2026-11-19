<script lang="ts">
import { faArrowRight, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';

import { dialogAPI } from '/@/api/client';
import { catalogHref } from '/@/utils/search-params';
import type { Article } from './content';
import { ARTICLES, COLLECTIONS } from './content';

interface Props {
  /**
   * Stack the lead and the list (narrow columns).
   */
  stacked?: boolean;
}

let { stacked = false }: Props = $props();

let lead = $derived(ARTICLES[0]);
let others = $derived(ARTICLES.slice(1));
let leadCollection = $derived(COLLECTIONS.find(collection => collection.id === lead.collection));

function open(article: Article): void {
  dialogAPI.openExternal(article.url).catch(console.error);
}
</script>

<!-- link to the catalog with a query string: catalogHref(), which the rule does not recognize -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<section
  class={['grid gap-3', stacked ? 'grid-cols-1' : 'grid-cols-1 min-[1000px]:grid-cols-[3fr_2fr]']}
  aria-label="Learn the essentials">
  <!-- the lead article: what it says, a link to read it, and the images it is about; its illustration on the right,
       over a soft red glow -->
  <div
    class="relative flex flex-row items-center gap-x-6 overflow-hidden rounded-lg border border-[var(--pd-content-bg)] bg-[var(--pd-content-card-bg)] p-6">
    {#if lead.illustration}
      <div
        class="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_75%_50%,rgba(238,0,0,0.16),transparent_65%)]"
        aria-hidden="true">
      </div>
    {/if}
    <div class="relative flex flex-col justify-between gap-y-5 grow min-w-0 self-stretch">
      <div class="flex flex-col gap-y-2">
        <span class="text-xs font-semibold uppercase tracking-wider text-[var(--pd-content-text)] opacity-70">
          {lead.kicker}
        </span>
        <button
          type="button"
          class="text-left text-lg font-semibold leading-snug text-[var(--pd-content-header)] cursor-pointer hover:underline"
          title={lead.url}
          onclick={(): void => open(lead)}>{lead.title}</button>
        <p class="m-0 max-w-2xl text-sm leading-normal text-[var(--pd-content-text)]">{lead.summary}</p>
      </div>
      <div class="flex flex-row flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {#if leadCollection?.query}
          <a
            href={catalogHref(leadCollection.query)}
            class="flex items-center gap-x-1.5 rounded-md bg-[var(--pd-button-primary-bg)] px-3 py-1.5 text-[var(--pd-button-text)] no-underline hover:bg-[var(--pd-button-primary-hover-bg)]">
            Browse {leadCollection.title}
            <Fa icon={faArrowRight} size="0.85x" />
          </a>
        {/if}
        <button
          type="button"
          class="flex items-center gap-x-1.5 text-[var(--pd-link)] cursor-pointer hover:underline"
          onclick={(): void => open(lead)}>
          Read on {lead.source}
          <Fa icon={faArrowUpRightFromSquare} size="0.8x" />
        </button>
      </div>
    </div>
    {#if lead.illustration}
      <img src={lead.illustration} alt="" class="relative hidden min-[1200px]:block w-52 shrink-0 object-contain" />
    {/if}
  </div>

  <!-- the others -->
  <div
    class="flex flex-col rounded-lg bg-[var(--pd-content-card-bg)] divide-y divide-[var(--pd-content-divider)] overflow-hidden">
    {#each others as article (article.url)}
      <button
        type="button"
        class="group flex flex-row items-start gap-x-3 grow p-4 text-left cursor-pointer hover:bg-[var(--pd-content-card-hover-bg)]"
        title={article.url}
        onclick={(): void => open(article)}>
        <span
          class="flex shrink-0 items-center justify-center w-8 h-8 rounded-md bg-[var(--pd-content-bg)] text-[var(--pd-content-text)]"
          aria-hidden="true">
          <Fa icon={article.icon} />
        </span>
        <span class="flex flex-col min-w-0 gap-y-0.5">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-[var(--pd-content-text)] opacity-70">
            {article.kicker}
          </span>
          <span class="text-sm font-medium leading-5 text-[var(--pd-content-header)] group-hover:underline">
            {article.title}
          </span>
          <span class="flex items-center gap-x-1 text-xs text-[var(--pd-content-text)] opacity-60">
            {article.source}
            <Fa icon={faArrowUpRightFromSquare} size="0.75x" />
          </span>
        </span>
      </button>
    {/each}
  </div>
</section>
