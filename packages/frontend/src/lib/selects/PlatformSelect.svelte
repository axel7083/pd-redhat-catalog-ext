<script lang="ts">
import type { CatalogImage } from '@podman-desktop/extension-redhat-catalog-core-api';

import Select from '$lib/selects/Select.svelte';

interface Props {
  images: CatalogImage[];
  selected: CatalogImage | undefined;
  host: string | undefined;
  onselect: (architecture: string) => void;
  disabled?: boolean;
}

let { images, selected, host, onselect, disabled = false }: Props = $props();

let items = $derived(
  images.map(({ architecture }) => ({
    value: architecture,
    label: architecture === host ? `linux/${architecture} (this machine)` : `linux/${architecture}`,
  })),
);
let value = $derived(items.find(item => item.value === selected?.architecture));
</script>

<div class="w-56" title={disabled ? 'The tags list every platform' : 'Platform of the image shown and pulled'}>
  <Select
    label="Platform"
    name="platform"
    items={items}
    value={value}
    disabled={disabled}
    clearable={false}
    searchable={false}
    onchange={(item): void => {
      if (item) onselect(item.value);
    }} />
</div>
