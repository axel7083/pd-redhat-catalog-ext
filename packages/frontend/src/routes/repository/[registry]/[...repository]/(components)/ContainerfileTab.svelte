<script lang="ts">
import { faFileCode, faWarning } from '@fortawesome/free-solid-svg-icons';
import type { CatalogImage, ImageFile } from '@podman-desktop/extension-redhat-catalog-core-api';
import { EmptyScreen } from '@podman-desktop/ui-svelte';

import CodeBlock from '$lib/content/CodeBlock.svelte';
import ListSkeleton from '$lib/skeleton/ListSkeleton.svelte';
import { catalogAPI } from '/@/api/client';

interface Props {
  image: CatalogImage;
}

let { image }: Props = $props();

let file: Promise<ImageFile | undefined> = $derived(catalogAPI.getContainerfile(image.id));
</script>

{#await file}
  <ListSkeleton />
{:then containerfile}
  {#if containerfile}
    <CodeBlock code={containerfile.content} label={containerfile.filename} />
  {:else}
    <EmptyScreen
      icon={faFileCode}
      title="No Containerfile"
      aria-label="No Containerfile"
      message="The publisher did not provide the build file of this image." />
  {/if}
{:catch err}
  <EmptyScreen
    icon={faWarning}
    title="Unable to fetch the Containerfile"
    aria-label="Error while fetching the Containerfile"
    message={err instanceof Error ? err.message : String(err)} />
{/await}
