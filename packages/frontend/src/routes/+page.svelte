<script lang="ts">
import { faWarning } from '@fortawesome/free-solid-svg-icons';
import type {
  FacetField,
  ProviderContainerConnectionDetailedInfo,
  SearchQuery,
  SearchResult,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import { SCOPE_LABELS, SEARCH_SCOPES, SORT_KEYS, SORT_LABELS } from '@podman-desktop/extension-redhat-catalog-core-api';
import { Button, EmptyScreen, NavPage, SearchInput, Tab } from '@podman-desktop/ui-svelte';
import { untrack } from 'svelte';

import { goto, invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import SearchResults from '$lib/explore/SearchResults.svelte';
import SearchSkeleton from '$lib/explore/SearchSkeleton.svelte';
import FilterSelect from '$lib/selects/FilterSelect.svelte';
import Select from '$lib/selects/Select.svelte';
import ContainerProviderConnectionSelect from '$lib/selects/ContainerProviderConnectionSelect.svelte';
import { selectedConnection } from '/@/states/connection.svelte';
import { providerConnectionsInfo } from '/@/stores/connections';
import { toSearchParams, updateQuery } from '/@/utils/search-params';
import type { PageProps } from './$types';

let { data }: PageProps = $props();

let query = $derived(data.query);

// writable derived: follows the URL, and the input while typing
let text = $derived(query.text ?? '');

let connection: ProviderContainerConnectionDetailedInfo | undefined = $derived(
  selectedConnection.resolve($providerConnectionsInfo),
);

function href(next: SearchQuery): string {
  const params = toSearchParams(next).toString();
  return `${resolve('/')}${params ? `?${params}` : ''}`;
}

function navigate(next: SearchQuery): Promise<void> {
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  return goto(href(next), { keepFocus: true, noScroll: true });
}

/**
 * Search as the text changes (typing, or the clear button of the input), debounced. Reacting to the value
 * rather than to input events also covers clearing.
 */
$effect(() => {
  const value = text.trim();
  const current = untrack(() => query);
  if (value === (current.text ?? '').trim()) return;
  const timer = setTimeout(() => {
    navigate(updateQuery(current, { text: value })).catch(console.error);
  }, 300);
  return (): void => clearTimeout(timer);
});

const SORT_ITEMS = SORT_KEYS.map(key => ({ value: key, label: SORT_LABELS[key] }));

const FILTERS: Array<{ field: FacetField; label: string; width: string }> = [
  { field: 'architecture', label: 'Architecture', width: 'w-44' },
  { field: 'build_categories_list', label: 'Image type', width: 'w-52' },
  { field: 'application_categories_list', label: 'Category', width: 'w-56' },
];

/**
 * Facet values (and counts) of the latest search: the filters stay usable while a new search runs.
 */
let facets: SearchResult['facets'] | undefined = $state.raw(undefined);
$effect(() => {
  const promise = data.result;
  promise
    .then(result => {
      if (promise === data.result) facets = result.facets;
    })
    .catch(() => {
      // the error is shown by the results boundary
    });
});

function onfilter(field: FacetField, values: string[]): void {
  navigate(updateQuery(query, { filters: { ...query.filters, [field]: values } })).catch(console.error);
}

function onpage(page: number): void {
  navigate({ ...query, page })
    .then(() => document.getElementById('explore')?.scrollTo({ top: 0 }))
    .catch(console.error);
}

async function retry(reset: () => void): Promise<void> {
  await invalidateAll();
  reset();
}
</script>

<NavPage title="Red Hat Catalog" searchEnabled={false}>
  {#snippet additionalActions()}
    {#if $providerConnectionsInfo.length > 1}
      <div class="w-[250px]">
        <ContainerProviderConnectionSelect
          clearable={false}
          onChange={(value): void => selectedConnection.select(value)}
          value={connection}
          containerProviderConnections={$providerConnectionsInfo} />
      </div>
    {/if}
  {/snippet}

  {#snippet tabs()}
    {#each SEARCH_SCOPES as scope (scope)}
      <Tab
        title={SCOPE_LABELS[scope]}
        url={href(updateQuery(query, { scope, filters: {} }))}
        selected={(query.scope ?? 'all') === scope} />
    {/each}
  {/snippet}

  {#snippet content()}
    <div id="explore" class="flex flex-col w-full h-full min-h-0 overflow-y-auto">
      <!-- a single bar of query controls, which never waits on the network -->
      <div
        class="sticky top-0 z-20 flex flex-row flex-wrap items-center gap-3 px-5 pt-4 pb-3 bg-(--pd-content-bg)"
        aria-label="Search and filters">
        <SearchInput class="grow min-w-64" title="Red Hat Ecosystem Catalog" bind:searchTerm={text} />
        {#each FILTERS as filter (filter.field)}
          <div class={filter.width}>
            <FilterSelect
              label={filter.label}
              loading={!facets}
              options={facets?.[filter.field] ?? []}
              selected={query.filters?.[filter.field] ?? []}
              onchange={(values): void => onfilter(filter.field, values)} />
          </div>
        {/each}
        <div class="w-44">
          <Select
            label="Sort by"
            name="sort"
            items={SORT_ITEMS}
            value={SORT_ITEMS.find(item => item.value === (query.sort ?? 'relevance'))}
            clearable={false}
            searchable={false}
            onchange={(item): void => {
              if (item) navigate(updateQuery(query, { sort: item.value })).catch(console.error);
            }} />
        </div>
      </div>

      <svelte:boundary>
        <SearchResults
          query={query}
          result={data.result}
          connection={connection}
          onclear={(): Promise<void> => navigate(updateQuery(query, { filters: {} }))}
          onpage={onpage} />

        {#snippet pending()}
          <SearchSkeleton />
        {/snippet}

        {#snippet failed(error, reset)}
          <EmptyScreen
            icon={faWarning}
            title="Something went wrong while searching the catalog"
            aria-label="Error while searching the catalog"
            message={error instanceof Error ? error.message : String(error)}>
            <div class="flex gap-2 justify-center">
              <Button title="Retry" type="link" onclick={(): Promise<void> => retry(reset)}>Retry</Button>
            </div>
          </EmptyScreen>
        {/snippet}
      </svelte:boundary>
    </div>
  {/snippet}
</NavPage>
