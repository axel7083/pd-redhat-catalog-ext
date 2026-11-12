<script lang="ts">
import type { LogoKind } from '/@/utils/logo';
import { isCorsLogoHost, readLogo } from '/@/utils/logo';

interface Props {
  /**
   * Logo of the publisher.
   */
  url?: string;
  /**
   * Publisher (or repository) name: its initial replaces a missing, failing or wide logo.
   */
  name: string;
  /**
   * Tile size, in pixels.
   */
  size?: number;
}

let { url, name, size = 40 }: Props = $props();

let failed = $state(false);
let kind: LogoKind | undefined = $state(undefined);
let cors = $derived(!!url && isCorsLogoHost(url));
let initial = $derived(name.trim().charAt(0).toUpperCase());

/**
 * Classify the logo once loaded: wide wordmarks fall back to the publisher initial, white artwork gets a dark tile.
 * Also handles images already loaded (cached) when the element is attached.
 */
function classifyOnLoad(image: HTMLImageElement): () => void {
  const classify = (): void => {
    if (image.naturalWidth) kind = readLogo(image);
  };
  if (image.complete) classify();
  image.addEventListener('load', classify);
  return (): void => image.removeEventListener('load', classify);
}
</script>

<div class="flex items-center justify-center shrink-0" style:width="{size}px" style:height="{size}px">
  {#if url && kind !== 'wide' && !failed}
    <!-- the tile contrasts with the artwork: white logos on a dark tile, the others on a light one -->
    <div
      class={[
        'w-full h-full flex items-center justify-center rounded-md p-1',
        kind === 'light' ? 'bg-[var(--pd-content-bg)]' : 'bg-white',
      ]}>
      <img
        src={url}
        alt=""
        crossorigin={cors ? 'anonymous' : undefined}
        class="max-w-full max-h-full object-contain"
        {@attach classifyOnLoad}
        onerror={(): boolean => (failed = true)} />
    </div>
  {:else}
    <div
      class="w-full h-full flex items-center justify-center rounded-md bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] text-lg font-semibold"
      aria-hidden="true">
      {initial}
    </div>
  {/if}
</div>
