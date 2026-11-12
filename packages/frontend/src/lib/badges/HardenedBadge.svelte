<script lang="ts">
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
</script>

<!-- core badge style (e.g. the "Bundled extension" badge of the extensions list) -->
<span
  class="inline-flex items-center gap-x-1 whitespace-nowrap rounded-sm px-1 py-0.5 text-xs text-[var(--pd-badge-text)] bg-[var(--pd-badge-bundled-extension-bg)]"
  title="Red Hat Hardened Image: minimal, rebuilt daily, no known CVEs">
  <Fa icon={faShieldHalved} size="0.85x" />
  Hardened
</span>
