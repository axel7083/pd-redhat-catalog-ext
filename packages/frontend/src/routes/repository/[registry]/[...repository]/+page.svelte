<script lang="ts">
import { faExternalLink, faWarning } from '@fortawesome/free-solid-svg-icons';
import { Button, DetailsPage, EmptyScreen, Tab } from '@podman-desktop/ui-svelte';

import { afterNavigate, beforeNavigate, goto, invalidateAll } from '$app/navigation';
import { page } from '$app/state';
import GradeBadge from '$lib/badges/GradeBadge.svelte';
import HardenedBadge from '$lib/badges/HardenedBadge.svelte';
import Label from '$lib/badges/Label.svelte';
import RepositoryIcon from '$lib/icons/RepositoryIcon.svelte';
import PlatformSelect from '$lib/selects/PlatformSelect.svelte';
import { dialogAPI, readRouterState } from '/@/api/client';
import { hostArchitecture } from '/@/stores/host';
import { appLocation } from '/@/utils/location';
import { selectImage } from '/@/utils/platform';
import LoadingBar from '$lib/progress/LoadingBar.svelte';
import RepositoryContent from './(components)/RepositoryContent.svelte';
import type { DetailTab } from './(components)/tabs';
import { TAB_TITLES, TABS } from './(components)/tabs';
import type { PageProps } from './$types';

let { data }: PageProps = $props();

function parseTab(url: URL): DetailTab {
  const value = url.searchParams.get('tab');
  return TABS.includes(value as DetailTab) ? (value as DetailTab) : 'overview';
}

/**
 * The tab (`?tab=`) and the platform picked in the header (`?arch=`, defaults to the host architecture: what a pull
 * gets). Writable deriveds: they follow the URL, and are updated as soon as a navigation starts. While the data of the
 * new tab or platform loads, async Svelte holds the page.url update: links built from page.url meanwhile (e.g. clicking
 * another tab while a platform loads) would bring the previous tab or platform back.
 */
let tab: DetailTab = $derived(parseTab(page.url));
let requestedArchitecture: string | undefined = $derived(page.url.searchParams.get('arch') ?? undefined);

beforeNavigate(({ to }) => {
  if (to?.url.pathname !== page.url.pathname || !to) return;
  tab = parseTab(to.url);
  requestedArchitecture = to.url.searchParams.get('arch') ?? undefined;
});

function urlFor(next: { tab?: DetailTab; architecture?: string }): string {
  const architecture = next.architecture ?? requestedArchitecture;
  const query = [`tab=${encodeURIComponent(next.tab ?? tab)}`];
  if (architecture) query.push(`arch=${encodeURIComponent(architecture)}`);
  return `${page.url.pathname}?${query.join('&')}`;
}

function selectArchitecture(value: string): void {
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  goto(urlFor({ architecture: value }), { replaceState: true, noScroll: true, keepFocus: true }).catch(console.error);
}

/**
 * The explore page the repository was opened from (search, scope, filters). Kept across the tab and platform
 * navigations (same component). Without one (the webview was recreated on this page), the explore page saved with the
 * webview state.
 */
let explore: string = $state(readRouterState().explore ?? '/');

afterNavigate(({ from }) => {
  if (from?.route.id === '/') explore = appLocation(from.url);
});

/**
 * Back to the explore page as it was left; history.back() would step back through tabs.
 */
function close(): Promise<void> {
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  return goto(explore);
}

async function retry(reset: () => void): Promise<void> {
  await invalidateAll();
  reset();
}
</script>

<DetailsPage
  title={data.repository}
  subtitle={data.registry}
  breadcrumbLeftPart="Catalog"
  breadcrumbRightPart={data.repository}
  onbreadcrumbClick={close}
  onclose={close}>
  {#snippet iconSnippet()}
    <RepositoryIcon size={28} />
  {/snippet}
  {#snippet actionsSnippet()}
    {#await data.detail then detail}
      {#if detail.latestImages.length > 1}
        <PlatformSelect
          images={detail.latestImages}
          selected={selectImage(detail.latestImages, requestedArchitecture, $hostArchitecture)}
          host={$hostArchitecture}
          disabled={tab === 'tags'}
          onselect={selectArchitecture} />
      {/if}
      <Button
        type="link"
        icon={faExternalLink}
        aria-label="Open in the Red Hat Ecosystem Catalog"
        onclick={(): Promise<boolean> => dialogAPI.openExternal(detail.catalogUrl)}>Open in catalog</Button>
    {/await}
  {/snippet}
  {#snippet subtitleSnippet()}
    {#await data.detail}
      <!-- same height as the loaded subtitle: the header does not move (loading is shown below the tabs) -->
      <div class="h-5" aria-hidden="true"></div>
    {:then detail}
      <div class="flex flex-wrap items-center gap-1 text-sm">
        <span class="text-(--pd-content-text)">{detail.name}</span>
        {#if detail.buildCategories.includes('Hardened')}<HardenedBadge />{/if}
        {#if detail.releaseCategories.includes('Deprecated')}<Label tone="warning">Deprecated</Label>{/if}
        <GradeBadge
          grade={selectImage(detail.latestImages, requestedArchitecture, $hostArchitecture)?.freshnessGrade} />
      </div>
    {:catch}
      <!-- the error is shown in the content -->
    {/await}
  {/snippet}
  {#snippet tabsSnippet()}
    {#each TABS as value (value)}
      <Tab title={TAB_TITLES[value]} url={urlFor({ tab: value })} selected={tab === value} />
    {/each}
  {/snippet}
  {#snippet contentSnippet()}
    <!-- relative: the loading bars are pinned to the top of the content, right below the tabs -->
    <!-- the Containerfile editor takes the whole tab body (it scrolls itself); the other tabs are padded -->
    <div
      class={[
        'relative flex flex-col w-full h-full',
        tab === 'containerfile' ? 'overflow-hidden' : 'overflow-y-auto p-5 gap-y-4',
      ]}>
      <!-- keyed: another repository starts on the skeleton instead of showing the previous one while loading -->
      {#key `${data.registry}/${data.repository}`}
        <svelte:boundary>
          <RepositoryContent detail={data.detail} tab={tab} architecture={requestedArchitecture ?? $hostArchitecture} />

          {#snippet pending()}
            <LoadingBar loading />
          {/snippet}

          {#snippet failed(error, reset)}
            <EmptyScreen
              icon={faWarning}
              title="Something went wrong while fetching the repository"
              aria-label="Error while fetching the repository"
              message={error instanceof Error ? error.message : String(error)}>
              <div class="flex gap-2 justify-center">
                <Button title="Retry" type="link" onclick={(): Promise<void> => retry(reset)}>Retry</Button>
              </div>
            </EmptyScreen>
          {/snippet}
        </svelte:boundary>
      {/key}
    </div>
  {/snippet}
</DetailsPage>
