<script lang="ts">
import { faExternalLink, faWarning } from '@fortawesome/free-solid-svg-icons';
import type { CatalogImage, RepositoryDetail } from '@podman-desktop/extension-redhat-catalog-core-api';
import { Button, DetailsPage, EmptyScreen, Tab } from '@podman-desktop/ui-svelte';

import { goto, invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import GradeBadge from '$lib/badges/GradeBadge.svelte';
import Label from '$lib/badges/Label.svelte';
import RepositoryIcon from '$lib/icons/RepositoryIcon.svelte';
import { dialogAPI } from '/@/api/client';
import ContainerfileTab from './(components)/ContainerfileTab.svelte';
import DetailSkeleton from './(components)/DetailSkeleton.svelte';
import GetThisImageTab from './(components)/GetThisImageTab.svelte';
import ImageSelect from './(components)/ImageSelect.svelte';
import OverviewTab from './(components)/OverviewTab.svelte';
import PackagesTab from './(components)/PackagesTab.svelte';
import SecurityTab from './(components)/SecurityTab.svelte';
import TagsTab from './(components)/TagsTab.svelte';
import type { DetailTab } from './(components)/tabs';
import { IMAGE_TABS, TAB_TITLES } from './(components)/tabs';
import type { PageProps } from './$types';

let { data }: PageProps = $props();

function tabUrl(tab: DetailTab): string {
  const url = new URL(page.url);
  url.searchParams.set('tab', tab);
  return `${url.pathname}${url.search}`;
}

function selectArchitecture(architecture: string): void {
  const url = new URL(page.url);
  url.searchParams.set('arch', architecture);
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  goto(`${url.pathname}${url.search}`, { replaceState: true, noScroll: true, keepFocus: true }).catch(console.error);
}

function selectedImage(detail: RepositoryDetail): CatalogImage | undefined {
  return (
    detail.latestImages.find(({ architecture }) => architecture === data.architecture) ??
    detail.latestImages.find(({ architecture }) => architecture === 'amd64') ??
    detail.latestImages[0]
  );
}

function close(): Promise<void> {
  return history.length > 1 ? Promise.resolve(history.back()) : goto(resolve('/'));
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
      <Button
        type="link"
        icon={faExternalLink}
        aria-label="Open in the Red Hat Ecosystem Catalog"
        onclick={(): Promise<boolean> => dialogAPI.openExternal(detail.catalogUrl)}>Open in catalog</Button>
    {/await}
  {/snippet}
  {#snippet subtitleSnippet()}
    {#await data.detail then detail}
      <div class="flex flex-wrap items-center gap-1 text-sm">
        <span class="text-(--pd-content-text)">{detail.name}</span>
        {#if detail.buildCategories.includes('Hardened')}<Label tone="accent">Hardened</Label>{/if}
        {#if detail.releaseCategories.includes('Deprecated')}<Label tone="warning">Deprecated</Label>{/if}
        <GradeBadge grade={detail.latestImages[0]?.freshnessGrade} />
      </div>
    {/await}
  {/snippet}
  {#snippet tabsSnippet()}
    {#each Object.entries(TAB_TITLES) as [tab, title] (tab)}
      <Tab title={title} url={tabUrl(tab as DetailTab)} selected={data.tab === tab} />
    {/each}
  {/snippet}
  {#snippet contentSnippet()}
    <div class="flex flex-col w-full h-full overflow-y-auto p-5 gap-y-4">
      {#await data.detail}
        <DetailSkeleton />
      {:then detail}
        {@const image = selectedImage(detail)}
        {#if IMAGE_TABS.includes(data.tab) && detail.latestImages.length > 0}
          <ImageSelect images={detail.latestImages} selected={image} onselect={selectArchitecture} />
        {/if}

        {#if data.tab === 'overview'}
          <OverviewTab detail={detail} />
        {:else if data.tab === 'get-this-image'}
          <GetThisImageTab detail={detail} />
        {:else if data.tab === 'tags'}
          <TagsTab detail={detail} />
        {:else if !image}
          <EmptyScreen
            icon={faWarning}
            title="No image published"
            aria-label="No image published"
            message="This repository has no published image." />
        {:else if data.tab === 'security'}
          <SecurityTab image={image} />
        {:else if data.tab === 'packages'}
          <PackagesTab image={image} />
        {:else if data.tab === 'containerfile'}
          <ContainerfileTab image={image} />
        {/if}
      {:catch err}
        <EmptyScreen
          icon={faWarning}
          title="Something went wrong while fetching the repository"
          aria-label="Error while fetching the repository"
          message={err instanceof Error ? err.message : String(err)}>
          <div class="flex gap-2 justify-center">
            <Button title="Retry" type="link" onclick={invalidateAll}>Retry</Button>
          </div>
        </EmptyScreen>
      {/await}
    </div>
  {/snippet}
</DetailsPage>
