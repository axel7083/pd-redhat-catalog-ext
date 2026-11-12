<script lang="ts">
import { LinearProgress } from '@podman-desktop/ui-svelte';

interface Props {
  /**
   * Shown when true; the bar takes no layout space either way (no content shift).
   */
  loading: boolean;
}

let { loading }: Props = $props();
</script>

<!-- pinned to the top of the nearest positioned container, i.e. right below the tabs -->
<div class="absolute top-0 left-0 right-0 z-10 h-0.5" aria-hidden={!loading} aria-label="Loading" role="status">
  {#if loading}<LinearProgress />{/if}
</div>
