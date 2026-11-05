<script lang="ts">
import { faMagnifyingGlass, faWarning } from '@fortawesome/free-solid-svg-icons';
import type {
  FacetField,
  ProviderContainerConnectionDetailedInfo,
  RepositorySummary,
  SearchQuery,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import {
  FACET_FIELDS,
  FACET_LABELS,
  localImagePrefixes,
  matchesImagePrefix,
  Messages,
  SORT_KEYS,
  SORT_LABELS,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import {
  Button,
  Checkbox,
  Dropdown,
  EmptyScreen,
  LinearProgress,
  NavPage,
  SearchInput,
} from '@podman-desktop/ui-svelte';
import { onMount } from 'svelte';

import { goto, invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import { navigating } from '$app/state';
import RepositoryCard from '$lib/cards/RepositoryCard.svelte';
import FacetPanel from '$lib/explore/FacetPanel.svelte';
import Pagination from '$lib/explore/Pagination.svelte';
import ContainerProviderConnectionSelect from '$lib/selects/ContainerProviderConnectionSelect.svelte';
import { imageAPI, rpcBrowser } from '/@/api/client';
import { selectedConnection } from '/@/states/connection.svelte';
import { providerConnectionsInfo } from '/@/stores/connections';
import { hasFilters, toggleFilter, toSearchParams, updateQuery } from '/@/utils/search-params';
import type { PageProps } from './$types';

let { data }: PageProps = $props();

let query = $derived(data.query);
let result = $derived(data.result);
let loading = $derived(navigating.to?.route.id === '/');

// writable derived: follows the URL, and the input while typing
let text = $derived(query.text ?? '');

let connection: ProviderContainerConnectionDetailedInfo | undefined = $derived(
  selectedConnection.resolve($providerConnectionsInfo),
);

let imagesVersion = $state(0);
onMount(() => rpcBrowser.subscribe(Messages.UPDATE_IMAGES, () => imagesVersion++).unsubscribe);

/**
 * The search index reports registry.access.redhat.com even for images pulled from registry.redhat.io.
 */
function prefixes(repository: RepositorySummary): string[] {
  const target = { registry: repository.registry, repository: repository.repository };
  const all = localImagePrefixes(target);
  if (repository.registry === 'registry.access.redhat.com') {
    all.push(...localImagePrefixes({ ...target, registry: 'registry.redhat.io' }));
  }
  return all;
}

/**
 * @param _version bumped on image events so the derived re-runs
 */
function listPulled(
  repositories: RepositorySummary[],
  current: ProviderContainerConnectionDetailedInfo | undefined,
  _version: number,
): Promise<string[]> {
  if (!current || !repositories.length) return Promise.resolve([]);
  return imageAPI
    .all({
      connection: { providerId: current.providerId, name: current.name },
      prefixes: repositories.flatMap(prefixes),
    })
    .then(images => images.map(({ name }) => name))
    .catch((err: unknown) => {
      console.error('unable to list local images', err);
      return [];
    });
}

let pulledNames: Promise<string[]> = $derived(listPulled(result?.repositories ?? [], connection, imagesVersion));

function navigate(next: SearchQuery): Promise<void> {
  const params = toSearchParams(next).toString();
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  return goto(`${resolve('/')}${params ? `?${params}` : ''}`, { keepFocus: true, noScroll: true });
}

let debounce: ReturnType<typeof setTimeout> | undefined;
function oninput(): void {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    if (text.trim() !== (query.text ?? '').trim()) navigate(updateQuery(query, { text })).catch(console.error);
  }, 400);
}

function ontoggle(field: FacetField, value: string): void {
  navigate(toggleFilter(query, field, value)).catch(console.error);
}

function clearFilters(): void {
  navigate(updateQuery(query, { filters: {} })).catch(console.error);
}

function onpage(page: number): void {
  navigate({ ...query, page })
    .then(() => document.getElementById('results')?.scrollTo({ top: 0 }))
    .catch(console.error);
}
</script>

<NavPage title="Red Hat Ecosystem Catalog" searchEnabled={false}>
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

  {#snippet content()}
    <div class="flex flex-row w-full h-full min-h-0">
      <!-- facets -->
      <aside
        class="w-64 min-w-64 flex flex-col gap-y-4 overflow-y-auto px-5 py-3 border-r border-[var(--pd-content-divider)]"
        aria-label="Filters">
        <div class="flex flex-col gap-y-1 text-sm text-(--pd-content-text)">
          <Checkbox
            checked={!!query.hardenedFirst}
            title="Show Red Hat Hardened Images first"
            onclick={(checked): Promise<void> => navigate(updateQuery(query, { hardenedFirst: checked }))}>
            Hardened images first
          </Checkbox>
          <Checkbox
            checked={!!query.includeDeprecated}
            title="Include deprecated repositories"
            onclick={(checked): Promise<void> => navigate(updateQuery(query, { includeDeprecated: checked }))}>
            Include deprecated
          </Checkbox>
        </div>
        {#if hasFilters(query)}
          <Button type="link" aria-label="Clear filters" onclick={clearFilters}>Clear filters</Button>
        {/if}
        {#if result}
          {#each FACET_FIELDS as field (field)}
            <FacetPanel
              label={FACET_LABELS[field]}
              values={result.facets[field]}
              selected={query.filters?.[field] ?? []}
              ontoggle={(value): void => ontoggle(field, value)} />
          {/each}
        {/if}
      </aside>

      <!-- results -->
      <div id="results" class="flex flex-col grow min-w-0 overflow-y-auto px-5 py-3 gap-y-3">
        <div class="flex flex-row items-center gap-x-3">
          <SearchInput class="grow" title="catalog" bind:searchTerm={text} oninput={oninput} />
          <div class="w-48">
            <Dropdown
              ariaLabel="Sort by"
              value={query.sort ?? 'relevance'}
              options={SORT_KEYS.map(key => ({ value: key, label: SORT_LABELS[key] }))}
              onChange={(sort): Promise<void> => navigate(updateQuery(query, { sort: sort as SearchQuery['sort'] }))} />
          </div>
        </div>

        <div class="h-1">
          {#if loading}<LinearProgress />{/if}
        </div>

        {#if data.error}
          <EmptyScreen
            icon={faWarning}
            title="Something went wrong while searching the catalog"
            aria-label="Error while searching the catalog"
            message={data.error}>
            <div class="flex gap-2 justify-center">
              <Button title="Retry" type="link" onclick={invalidateAll}>Retry</Button>
            </div>
          </EmptyScreen>
        {:else if result?.repositories.length === 0}
          <EmptyScreen
            icon={faMagnifyingGlass}
            title="No repositories found"
            aria-label="No repositories found"
            message="Try other search terms or remove some filters." />
        {:else if result}
          <div
            class={[
              'grid min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3 gap-3 transition-opacity',
              loading && 'opacity-60',
            ]}>
            {#each result.repositories as repository (repository.id)}
              {@const repositoryPrefixes = prefixes(repository)}
              <RepositoryCard
                object={repository}
                pulled={pulledNames.then(names => names.some(name => matchesImagePrefix(name, repositoryPrefixes)))} />
            {/each}
          </div>
          <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onpage={onpage} />
        {/if}
      </div>
    </div>
  {/snippet}
</NavPage>
