<script lang="ts">
import { faDownload, faPlay } from '@fortawesome/free-solid-svg-icons';
import type {
  ProviderContainerConnectionDetailedInfo,
  RepositoryDetail,
  SimpleImageInfo,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import { localImagePrefixes, Messages, toPullSpec } from '@podman-desktop/extension-redhat-catalog-core-api';
import { Button, Dropdown, ErrorMessage } from '@podman-desktop/ui-svelte';
import { onMount } from 'svelte';

import RegistryAccessBanner from '$lib/banners/RegistryAccessBanner.svelte';
import CodeBlock from '$lib/content/CodeBlock.svelte';
import ExternalContent from '$lib/content/ExternalContent.svelte';
import ContainerProviderConnectionSelect from '$lib/selects/ContainerProviderConnectionSelect.svelte';
import { imageAPI, rpcBrowser } from '/@/api/client';
import { selectedConnection } from '/@/states/connection.svelte';
import { authStatus } from '/@/stores/auth';
import { providerConnectionsInfo } from '/@/stores/connections';
import { shortDigest } from '/@/utils/format';

interface Props {
  detail: RepositoryDetail;
}

let { detail }: Props = $props();

const DIGEST = 'digest';

let latest = $derived(detail.tagGroups[0]);
let tags = $derived(latest?.tags ?? []);

// writable derived: defaults to the recommended technical tag, and follows the user selection
let reference = $derived(detail.recommendedTag ?? tags[0] ?? 'latest');

let spec = $derived(
  reference === DIGEST && latest?.digest
    ? toPullSpec(detail.pullTarget, { digest: latest.digest })
    : toPullSpec(detail.pullTarget, { tag: reference }),
);

let commands = $derived(
  [detail.pullTarget.requiresLogin ? `podman login ${detail.pullTarget.registry}` : undefined, `podman pull ${spec}`]
    .filter(Boolean)
    .join('\n'),
);

let connection: ProviderContainerConnectionDetailedInfo | undefined = $derived(
  selectedConnection.resolve($providerConnectionsInfo),
);

let imagesVersion = $state(0);
onMount(() => rpcBrowser.subscribe(Messages.UPDATE_IMAGES, () => imagesVersion++).unsubscribe);

/**
 * @param _version bumped on image events so the derived re-runs
 */
function listLocalImages(
  current: ProviderContainerConnectionDetailedInfo | undefined,
  _version: number,
): Promise<SimpleImageInfo[]> {
  if (!current) return Promise.resolve([]);
  return imageAPI.all({
    connection: { providerId: current.providerId, name: current.name },
    prefixes: localImagePrefixes(detail.pullTarget),
  });
}

let localImages: Promise<SimpleImageInfo[]> = $derived(listLocalImages(connection, imagesVersion));

let pulling = $state(false);
let pullError: string | undefined = $state(undefined);

async function pull(): Promise<void> {
  if (!connection) return;
  pulling = true;
  pullError = undefined;
  try {
    await imageAPI.pull({ image: spec, connection: { providerId: connection.providerId, name: connection.name } });
    imagesVersion++;
  } catch (err: unknown) {
    pullError = err instanceof Error ? err.message : String(err);
  } finally {
    pulling = false;
  }
}

let options = $derived([
  ...tags.map(tag => ({ value: tag, label: tag === detail.recommendedTag ? `${tag} (recommended)` : tag })),
  ...(latest?.digest ? [{ value: DIGEST, label: `Digest ${shortDigest(latest.digest)}` }] : []),
]);
</script>

<div class="flex flex-col gap-y-4 max-w-4xl">
  <RegistryAccessBanner target={detail.pullTarget} auth={$authStatus} />

  {#if detail.getThisImageOverride}
    <section class="flex flex-col gap-y-2" aria-label="Publisher instructions">
      <h2 class="m-0 text-(--pd-content-header) text-base">Publisher instructions</h2>
      <ExternalContent content={detail.getThisImageOverride} format="markdown" />
    </section>
  {/if}

  <section class="flex flex-col gap-y-3" aria-label="Pull">
    <div class="flex flex-row flex-wrap items-end gap-3">
      <label class="flex flex-col gap-y-1 text-sm text-(--pd-content-text)">
        Tag
        <div class="w-64">
          <Dropdown ariaLabel="Tag" bind:value={reference} options={options} />
        </div>
      </label>
      {#if $providerConnectionsInfo.length > 1}
        <label class="flex flex-col gap-y-1 text-sm text-(--pd-content-text)">
          Container engine
          <div class="w-64">
            <ContainerProviderConnectionSelect
              clearable={false}
              value={connection}
              onChange={(value): void => selectedConnection.select(value)}
              containerProviderConnections={$providerConnectionsInfo} />
          </div>
        </label>
      {/if}
      <Button
        icon={faDownload}
        inProgress={pulling}
        disabled={connection?.status !== 'started'}
        title={connection?.status === 'started' ? `Pull ${spec}` : 'Start a container engine to pull'}
        aria-label="Pull image"
        onclick={pull}>Pull</Button>
    </div>
    {#if pullError}<ErrorMessage error={pullError} />{/if}

    <CodeBlock code={commands} label="Pull command" />
  </section>

  {#await localImages then images}
    {#if images.length}
      <section class="flex flex-col gap-y-2" aria-label="Local images">
        <h2 class="m-0 text-(--pd-content-header) text-base">Local images</h2>
        <ul class="list-none p-0 m-0 flex flex-col gap-y-2">
          {#each images as image (image.id + image.name)}
            <li class="flex flex-row items-center gap-x-3 text-sm text-(--pd-content-text)">
              <span class="grow truncate font-mono" title={image.name}>{image.name}</span>
              <Button
                type="secondary"
                aria-label="Open {image.name}"
                onclick={(): Promise<void> => imageAPI.navigateToImageDetails(image)}>Open</Button>
              <Button
                icon={faPlay}
                aria-label="Run {image.name}"
                onclick={(): Promise<void> => imageAPI.navigateToImageRun(image)}>Run</Button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  {/await}
</div>
