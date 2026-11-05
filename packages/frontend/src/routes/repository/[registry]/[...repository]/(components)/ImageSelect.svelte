<script lang="ts">
import type { CatalogImage } from '@podman-desktop/extension-redhat-catalog-core-api';
import { Dropdown } from '@podman-desktop/ui-svelte';

import { formatDate } from '/@/utils/format';

interface Props {
  images: CatalogImage[];
  selected: CatalogImage | undefined;
  onselect: (architecture: string) => void;
}

let { images, selected, onselect }: Props = $props();
</script>

<div class="flex flex-row items-center gap-x-3 text-sm text-(--pd-content-text)">
  <span>Architecture</span>
  <div class="w-40">
    <Dropdown
      ariaLabel="Architecture"
      value={selected?.architecture}
      options={images.map(({ architecture }) => ({ value: architecture, label: architecture }))}
      onChange={onselect} />
  </div>
  {#if selected}
    <span class="opacity-70">
      Latest image{selected.tags.length ? ` (${selected.tags.join(', ')})` : ''}{selected.pushDate
        ? `, pushed ${formatDate(selected.pushDate)}`
        : ''}
    </span>
  {/if}
</div>
