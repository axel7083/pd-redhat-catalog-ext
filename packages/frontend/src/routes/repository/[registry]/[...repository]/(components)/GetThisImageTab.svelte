<script lang="ts">
import { faCircleExclamation, faDownload, faGlobe, faLock, faPlay, faXmark } from '@fortawesome/free-solid-svg-icons';
import type {
  CatalogImage,
  ProviderContainerConnectionDetailedInfo,
  RepositoryDetail,
  SimpleImageInfo,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import {
  connectionKey,
  localImagePrefixes,
  matchesImagePrefix,
  sortTagsForDisplay,
  toPullSpec,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import { Button } from '@podman-desktop/ui-svelte';
import Fa from 'svelte-fa';

import RegistryAccessBanner from '$lib/banners/RegistryAccessBanner.svelte';
import CodeBlock from '$lib/content/CodeBlock.svelte';
import ExternalContent from '$lib/content/ExternalContent.svelte';
import ContainerProviderConnectionSelect from '$lib/selects/ContainerProviderConnectionSelect.svelte';
import Select from '$lib/selects/Select.svelte';
import { imageAPI } from '/@/api/client';
import { selectedConnection } from '/@/states/connection.svelte';
import { authStatus } from '/@/stores/auth';
import { providerConnectionsInfo } from '/@/stores/connections';
import { hostArchitecture } from '/@/stores/host';
import { localImages } from '/@/stores/local-images';
import { findPull, pulls } from '/@/stores/pulls';
import { shortDigest } from '/@/utils/format';

interface Props {
  detail: RepositoryDetail;
  /**
   * The image of the platform picked in the page header: the platform pulled.
   */
  image: CatalogImage | undefined;
}

let { detail, image }: Props = $props();

/**
 * Pulling another architecture than the host one needs an explicit platform, and emulation to run it.
 */
let foreignPlatform = $derived(!!image && !!$hostArchitecture && image.architecture !== $hostArchitecture);

const DIGEST = 'digest';

/**
 * The newest image: its tags and manifest list digest are shared by every architecture of the build.
 */
let latest = $derived(detail.latestImages[0]);

let tagItems = $derived([
  ...sortTagsForDisplay(latest?.tags ?? []).map(tag => ({
    value: tag,
    label: tag === detail.recommendedTag ? `${tag} (recommended)` : tag,
  })),
  ...(latest?.digest ? [{ value: DIGEST, label: `Digest ${shortDigest(latest.digest)}` }] : []),
]);

// writable derived: defaults to the recommended technical tag, and follows the user selection
let reference = $derived(detail.recommendedTag ?? latest?.tags[0] ?? 'latest');

let spec = $derived(
  reference === DIGEST && latest?.digest
    ? toPullSpec(detail.pullTarget, { digest: latest.digest })
    : toPullSpec(detail.pullTarget, { tag: reference }),
);

let commands = $derived(
  [
    detail.pullTarget.requiresLogin ? `podman login ${detail.pullTarget.registry}` : undefined,
    foreignPlatform && image ? `podman pull --platform linux/${image.architecture} ${spec}` : `podman pull ${spec}`,
  ]
    .filter(Boolean)
    .join('\n'),
);

let connection: ProviderContainerConnectionDetailedInfo | undefined = $derived(
  selectedConnection.resolve($providerConnectionsInfo),
);

let prefixes = $derived(localImagePrefixes(detail.pullTarget));

/**
 * Local images of this repository on the selected engine, from the published snapshot (no request to the engine).
 */
let localImagesOfRepository: SimpleImageInfo[] = $derived.by(() => {
  if (connection?.status !== 'started') return [];
  const target = { providerId: connection.providerId, name: connection.name };
  return ($localImages[connectionKey(target)] ?? []).flatMap(image =>
    image.names
      .filter(name => matchesImagePrefix(name, prefixes))
      .map(name => ({ id: image.id, name, connection: target })),
  );
});

/**
 * Tracked by the backend: leaving the tab and coming back keeps "Pulling…" and the error.
 */
let pullStatus = $derived(findPull($pulls, prefixes));
let pulling = $derived(pullStatus?.status === 'pulling');

function pull(): void {
  if (!connection) return;
  imageAPI
    .pull({
      image: spec,
      connection: { providerId: connection.providerId, name: connection.name },
      architecture: foreignPlatform ? image?.architecture : undefined,
    })
    .catch(() => {
      // reported by the pull tracker (pullStatus)
    });
}

function dismissError(): void {
  if (pullStatus?.status === 'failed') imageAPI.dismissPull(pullStatus.image).catch(console.error);
}
</script>

<div class="flex flex-col gap-y-4 max-w-4xl">
  <section
    class="flex flex-col gap-y-4 rounded-md bg-[var(--pd-content-card-bg)] p-4"
    aria-label="Pull with Podman Desktop">
    <div class="flex flex-row items-start justify-between gap-x-4">
      <div class="flex flex-col gap-y-1">
        <h2 class="m-0 text-base font-semibold text-[var(--pd-content-card-header-text)]">Pull with Podman Desktop</h2>
        <p class="m-0 flex items-center gap-x-1.5 text-sm text-[var(--pd-content-card-text)]">
          <Fa icon={detail.pullTarget.requiresLogin ? faLock : faGlobe} size="0.9x" />
          {#if detail.pullTarget.requiresLogin}
            From {detail.pullTarget.registry}, credentials required
          {:else}
            From {detail.pullTarget.registry}, no account needed
          {/if}
        </p>
      </div>
    </div>

    <RegistryAccessBanner target={detail.pullTarget} auth={$authStatus} />

    {#if foreignPlatform && image}
      <p class="m-0 text-sm text-[var(--pd-content-card-text)]" role="note">
        Pulls the <strong>linux/{image.architecture}</strong> image picked in the header; this machine is linux/{$hostArchitecture},
        so running it requires emulation.
      </p>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3">
      <label class="flex flex-col gap-y-1 text-sm text-[var(--pd-content-card-text)]">
        Tag
        <Select
          label="Tag"
          name="tag"
          items={tagItems}
          value={tagItems.find(item => item.value === reference)}
          clearable={false}
          onchange={(item): void => {
            if (item) reference = item.value;
          }} />
      </label>
      <label class="flex flex-col gap-y-1 text-sm text-[var(--pd-content-card-text)]">
        Container engine
        <ContainerProviderConnectionSelect
          clearable={false}
          value={connection}
          onChange={(value): void => selectedConnection.select(value)}
          containerProviderConnections={$providerConnectionsInfo} />
      </label>
      <Button
        icon={faDownload}
        inProgress={pulling}
        disabled={connection?.status !== 'started' || pulling}
        title={connection?.status === 'started' ? `Pull ${spec}` : 'Start a container engine to pull'}
        aria-label="Pull image"
        onclick={pull}>{pulling ? 'Pulling' : 'Pull'}</Button>
    </div>

    {#if pullStatus?.status === 'failed'}
      <div class="flex items-start gap-x-2 text-sm text-[var(--pd-state-error)]" role="alert">
        <Fa icon={faCircleExclamation} class="mt-0.5" />
        <span class="grow break-words">{pullStatus.error}</span>
        <button
          class="cursor-pointer opacity-70 hover:opacity-100"
          aria-label="Dismiss the pull error"
          onclick={dismissError}>
          <Fa icon={faXmark} />
        </button>
      </div>
    {/if}

    {#if localImagesOfRepository.length}
      <div class="flex flex-col gap-y-2 border-t border-[var(--pd-content-divider)] pt-3" aria-label="Local images">
        <span class="text-sm text-[var(--pd-content-card-text)]">Available locally</span>
        <ul class="list-none p-0 m-0 flex flex-col gap-y-2">
          {#each localImagesOfRepository as image (image.id + image.name)}
            <li class="flex flex-row items-center gap-x-3 text-sm text-[var(--pd-content-card-text)]">
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
      </div>
    {/if}
  </section>

  <section class="flex flex-col gap-y-3 rounded-md bg-[var(--pd-content-card-bg)] p-4" aria-label="Command line">
    <h2 class="m-0 text-base font-semibold text-[var(--pd-content-card-header-text)]">Command line</h2>
    <CodeBlock code={commands} label="Pull command" />
  </section>

  {#if detail.getThisImageOverride}
    <section
      class="flex flex-col gap-y-3 rounded-md bg-[var(--pd-content-card-bg)] p-4"
      aria-label="Publisher instructions">
      <h2 class="m-0 text-base font-semibold text-[var(--pd-content-card-header-text)]">Publisher instructions</h2>
      <ExternalContent content={detail.getThisImageOverride} format="markdown" />
    </section>
  {/if}
</div>
