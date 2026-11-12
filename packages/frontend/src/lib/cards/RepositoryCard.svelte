<script lang="ts">
import { faCircleExclamation, faDownload, faPlay, faXmark } from '@fortawesome/free-solid-svg-icons';
import type {
  ProviderContainerConnectionDetailedInfo,
  RepositorySummary,
  SimpleImageInfo,
} from '@podman-desktop/extension-redhat-catalog-core-api';
import { findLocalImage, quickPullTag, toPullSpec } from '@podman-desktop/extension-redhat-catalog-core-api';
import { Button, TableDurationColumn } from '@podman-desktop/ui-svelte';
import Fa from 'svelte-fa';

import { resolve } from '$app/paths';
import GradeBadge from '$lib/badges/GradeBadge.svelte';
import HardenedBadge from '$lib/badges/HardenedBadge.svelte';
import Label from '$lib/badges/Label.svelte';
import { catalogAPI, imageAPI } from '/@/api/client';
import { localImages } from '/@/stores/local-images';
import { findPull, pulls } from '/@/stores/pulls';
import type { LogoKind } from '/@/utils/logo';
import { isCorsLogoHost, readLogo } from '/@/utils/logo';
import { repositoryPrefixes } from '/@/utils/repository';

interface Props {
  object: RepositorySummary;
  /**
   * The container engine to pull to.
   */
  connection?: ProviderContainerConnectionDetailedInfo;
}

let { object: repository, connection }: Props = $props();

let logoFailed = $state(false);
let hardened = $derived(repository.buildCategories.includes('Hardened'));
let deprecated = $derived(repository.releaseCategories.includes('Deprecated'));
let updated = $derived(repository.pushDate ?? repository.lastModified);
/**
 * Hardened image titles are "Red Hat Hardened Images <streams>" (e.g. "loki-3-6, loki-3-7"):
 * the repository name (hi/loki → loki) reads better, the badge says it is hardened.
 */
let title = $derived(hardened ? repository.repository.replace(/^hi\//, '') : repository.title);

let initial = $derived((repository.publisher ?? repository.repository).trim().charAt(0).toUpperCase());

let logoKind: LogoKind | undefined = $state(undefined);
let corsLogo = $derived(!!repository.logoUrl && isCorsLogoHost(repository.logoUrl));

/**
 * Classify the logo once loaded: wide wordmarks fall back to the publisher initial, white artwork gets a dark tile.
 * Also handles images already loaded (cached) when the element is attached.
 */
function classifyOnLoad(image: HTMLImageElement): () => void {
  const classify = (): void => {
    if (image.naturalWidth) logoKind = readLogo(image);
  };
  if (image.complete) classify();
  image.addEventListener('load', classify);
  return (): void => image.removeEventListener('load', classify);
}

let prefetched = false;
/**
 * Warm the backend cache: the detail is needed to open the repository, and to pull from the card.
 */
function prefetch(): void {
  if (prefetched) return;
  prefetched = true;
  catalogAPI.prefetchRepository(repository.registry, repository.repository).catch(() => {
    prefetched = false;
  });
}

/**
 * The pull itself is tracked by the backend (see stores/pulls): leaving and coming back keeps "Pulling…" and the
 * error. Only resolving the pull target is local.
 */
let resolving = $state(false);
let resolveError = $state<string | undefined>(undefined);
let pullStatus = $derived(findPull($pulls, repositoryPrefixes(repository)));
let pulling = $derived(resolving || pullStatus?.status === 'pulling');
let pullError = $derived(resolveError ?? (pullStatus?.status === 'failed' ? pullStatus.error : undefined));

/**
 * The local image of this repository on the selected engine, from the published snapshot: known instantly.
 */
let localImage: SimpleImageInfo | undefined = $derived(
  connection?.status === 'started'
    ? findLocalImage($localImages, connection, repositoryPrefixes(repository))
    : undefined,
);

/**
 * The search index does not tell where to pull from (registry.redhat.io for images with terms): the pull target
 * comes from the repository detail, usually already cached by the hover prefetch.
 */
async function pull(): Promise<void> {
  if (!connection) return;
  resolving = true;
  resolveError = undefined;
  let image: string;
  try {
    const detail = await catalogAPI.getRepository(repository.registry, repository.repository);
    image = toPullSpec(detail.pullTarget, { tag: quickPullTag(detail) });
  } catch (err: unknown) {
    resolveError = err instanceof Error ? err.message : String(err);
    return;
  } finally {
    resolving = false;
  }
  try {
    await imageAPI.pull({
      image,
      connection: { providerId: connection.providerId, name: connection.name },
    });
  } catch {
    // reported by the pull tracker (pullStatus)
  }
}

function dismissError(): void {
  resolveError = undefined;
  if (pullStatus?.status === 'failed') imageAPI.dismissPull(pullStatus.image).catch(console.error);
}
</script>

<div
  class="relative rounded-lg border border-[var(--pd-content-bg)] flex flex-col bg-[var(--pd-content-card-bg)] hover:border-[var(--pd-content-card-border-selected)] min-h-36"
  role="group"
  aria-label={repository.title}>
  <div class="flex flex-row grow gap-x-3 p-3 min-w-0">
    <div class="w-10 h-10 min-w-10 flex items-center justify-center">
      {#if repository.logoUrl && logoKind !== 'wide' && !logoFailed}
        <!-- the tile contrasts with the artwork: white logos on a dark tile, the others on a light one -->
        <div
          class={[
            'w-10 h-10 flex items-center justify-center rounded-md p-1',
            logoKind === 'light' ? 'bg-[var(--pd-content-bg)]' : 'bg-white',
          ]}>
          <img
            src={repository.logoUrl}
            alt=""
            crossorigin={corsLogo ? 'anonymous' : undefined}
            class="max-w-full max-h-full object-contain"
            {@attach classifyOnLoad}
            onerror={(): boolean => (logoFailed = true)} />
        </div>
      {:else}
        <div
          class="w-10 h-10 flex items-center justify-center rounded-md bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] text-lg font-semibold"
          aria-hidden="true">
          {initial}
        </div>
      {/if}
    </div>
    <div class="flex flex-col grow min-w-0 gap-y-1">
      <div class="flex flex-row items-start gap-x-2">
        <!-- the link covers the whole card (after:inset-0); the buttons are layered above it -->
        <a
          href={resolve('/repository/[registry]/[...repository]', {
            registry: repository.registry,
            repository: repository.repository,
          })}
          onmouseenter={prefetch}
          onfocus={prefetch}
          class="line-clamp-2 leading-5 text-[var(--pd-content-header)] no-underline after:absolute after:inset-0 after:rounded-lg after:content-['']"
          title={repository.title}
          aria-label={repository.title}>{title}</a>
        {#if hardened}<HardenedBadge />{/if}
      </div>
      <div
        class="truncate text-sm text-[var(--pd-content-text)] opacity-80"
        title="{repository.registry}/{repository.repository}">
        {repository.repository}
      </div>
      {#if repository.description}
        <p class="line-clamp-2 m-0 text-sm text-[var(--pd-content-text)]">{repository.description}</p>
      {/if}
    </div>
  </div>

  <div class="flex flex-row items-center gap-x-2 px-3 pb-3 text-sm text-[var(--pd-content-text)]">
    <span class="truncate" title="Publisher">{repository.publisher ?? 'Unknown publisher'}</span>
    {#if updated}
      <span aria-hidden="true">·</span>
      <span class="flex gap-x-1 whitespace-nowrap" title="Last updated">
        <TableDurationColumn object={new Date(updated)} /> ago
      </span>
    {/if}
    <GradeBadge grade={repository.freshnessGrade} />
    {#if deprecated}<Label tone="warning">Deprecated</Label>{/if}

    <div class="relative z-[1] ml-auto flex flex-row items-center gap-x-2">
      {#if localImage}
        {@const image = localImage}
        <Button
          type="secondary"
          aria-label="Open {image.name}"
          onclick={(): Promise<void> => imageAPI.navigateToImageDetails(image)}>Open</Button>
        <Button
          icon={faPlay}
          aria-label="Run {image.name}"
          onclick={(): Promise<void> => imageAPI.navigateToImageRun(image)}>Run</Button>
      {:else}
        <Button
          type="secondary"
          icon={faDownload}
          inProgress={pulling}
          disabled={connection?.status !== 'started'}
          title={connection?.status === 'started' ? 'Pull this image' : 'Start a container engine to pull'}
          aria-label="Pull {repository.repository}"
          onclick={pull}>Pull</Button>
      {/if}
    </div>
  </div>

  {#if pullError}
    <div
      class="relative z-[1] flex items-start gap-x-1 px-3 pb-3 text-xs text-[var(--pd-state-error)]"
      role="alert"
      title={pullError}>
      <Fa icon={faCircleExclamation} class="mt-0.5" />
      <span class="line-clamp-2 grow">{pullError}</span>
      <button
        class="cursor-pointer opacity-70 hover:opacity-100"
        aria-label="Dismiss the pull error"
        onclick={dismissError}>
        <Fa icon={faXmark} />
      </button>
    </div>
  {/if}
</div>
