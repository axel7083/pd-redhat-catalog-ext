<script lang="ts">
import { faFileCode } from '@fortawesome/free-solid-svg-icons';
import type { CatalogImage, ImageFile } from '@podman-desktop/extension-redhat-catalog-core-api';
import { EmptyScreen } from '@podman-desktop/ui-svelte';

import CodeViewer from '$lib/monaco/CodeViewer.svelte';
import { catalogAPI } from '/@/api/client';

interface Props {
  image: CatalogImage;
}

let { image }: Props = $props();

let containerfile: ImageFile | undefined = $derived(await catalogAPI.getContainerfile(image.id));
</script>

{#if containerfile}
  <!-- the editor fills the tab; copy is available from the editor (selection, context menu) -->
  <div class={['flex grow min-h-0 transition-opacity', $effect.pending() && 'opacity-60']}>
    <CodeViewer content={containerfile.content} language="dockerfile" label="Containerfile" />
  </div>
{:else}
  <EmptyScreen
    icon={faFileCode}
    title="No Containerfile"
    aria-label="No Containerfile"
    message="The publisher did not provide the build file of this image." />
{/if}
