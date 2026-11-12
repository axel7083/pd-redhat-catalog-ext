<script lang="ts">
import type { CatalogImage } from '@podman-desktop/extension-redhat-catalog-core-api';
import { pickPrimaryTag } from '@podman-desktop/extension-redhat-catalog-core-api';

import { formatDate } from '/@/utils/format';

interface Props {
  image: CatalogImage;
}

let { image }: Props = $props();

let tag = $derived(pickPrimaryTag(image.tags));
</script>

<!-- which image the tab describes (the platform is picked in the page header) -->
<p class="m-0 text-sm text-(--pd-content-text) opacity-70">
  linux/{image.architecture} image{tag ? ` of ${tag}` : ''}{image.pushDate
    ? `, pushed ${formatDate(image.pushDate)}`
    : ''}
</p>
