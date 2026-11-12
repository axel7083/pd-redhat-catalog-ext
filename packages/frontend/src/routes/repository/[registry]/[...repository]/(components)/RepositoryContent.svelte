<script lang="ts">
import { faWarning } from '@fortawesome/free-solid-svg-icons';
import type { CatalogImage, RepositoryDetail } from '@podman-desktop/extension-redhat-catalog-core-api';
import { EmptyScreen } from '@podman-desktop/ui-svelte';

import LoadingBar from '$lib/progress/LoadingBar.svelte';
import PendingBar from '$lib/progress/PendingBar.svelte';
import ImageCaption from '$lib/content/ImageCaption.svelte';
import { catalogAPI } from '/@/api/client';
import { selectImage } from '/@/utils/platform';
import ContainerfileTab from './ContainerfileTab.svelte';
import GetThisImageTab from './GetThisImageTab.svelte';
import OverviewTab from './OverviewTab.svelte';
import PackagesTab from './PackagesTab.svelte';
import SecurityTab from './SecurityTab.svelte';
import type { DetailTab } from './tabs';
import { IMAGE_TABS } from './tabs';
import TagsTab from './TagsTab.svelte';

interface Props {
  detail: Promise<RepositoryDetail>;
  tab: DetailTab;
  /**
   * The platform picked in the page header (or the host one).
   */
  architecture?: string;
}

let { detail: detailPromise, tab, architecture }: Props = $props();

let detail = $derived(await detailPromise);

let image: CatalogImage | undefined = $derived(selectImage(detail.latestImages, architecture, undefined));

/**
 * Once the user stays on the repository, warm the backend cache of the other tabs so opening them is instant
 * (measured cold: tags ~1.7s, security/packages/Containerfile ~0.5s each).
 */
const PREFETCH_DELAY_MS = 500;
$effect(() => {
  const imageId = image?.id;
  if (!imageId) return;
  const { registry, repository } = detail;
  const timer = setTimeout(() => {
    catalogAPI.prefetchTabs(registry, repository, imageId).catch(console.debug);
  }, PREFETCH_DELAY_MS);
  return (): void => clearTimeout(timer);
});
</script>

<!-- the Containerfile is shown edge to edge, without caption -->
{#if IMAGE_TABS.includes(tab) && tab !== 'containerfile' && image}
  <ImageCaption image={image} />
{/if}

{#if tab === 'overview'}
  <OverviewTab detail={detail} image={image} />
{:else if tab === 'get-this-image'}
  <GetThisImageTab detail={detail} image={image} />
{:else if IMAGE_TABS.includes(tab) && !image}
  <EmptyScreen
    icon={faWarning}
    title="No image published"
    aria-label="No image published"
    message="This repository has no published image." />
{:else}
  <!-- a new boundary per tab: opening a tab shows a skeleton, changing architecture keeps the current data -->
  {#key tab}
    <svelte:boundary>
      <PendingBar />
      {#if tab === 'tags'}
        <TagsTab detail={detail} />
      {:else if image && tab === 'security'}
        <SecurityTab image={image} />
      {:else if image && tab === 'packages'}
        <PackagesTab image={image} />
      {:else if image && tab === 'containerfile'}
        <ContainerfileTab image={image} />
      {/if}

      {#snippet pending()}
        <LoadingBar loading />
      {/snippet}

      {#snippet failed(error, reset)}
        <EmptyScreen
          icon={faWarning}
          title="Unable to fetch the {tab}"
          aria-label="Error while fetching the {tab}"
          message={error instanceof Error ? error.message : String(error)}>
          <button class="text-(--pd-link) hover:underline cursor-pointer" onclick={reset}>Retry</button>
        </EmptyScreen>
      {/snippet}
    </svelte:boundary>
  {/key}
{/if}
