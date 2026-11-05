<script lang="ts">
import type { Severity } from '@podman-desktop/extension-redhat-catalog-core-api';

interface Props {
  severity: Severity;
}

let { severity }: Props = $props();

const COLORS: Record<Severity, string> = {
  critical: 'bg-red-800 text-white',
  important: 'bg-red-600 text-white',
  moderate: 'bg-amber-600 text-white',
  low: 'bg-gray-700 text-white',
  unknown: 'bg-gray-900 text-white',
};
</script>

<span class={['inline-flex rounded-sm px-1.5 py-0.5 text-xs font-semibold capitalize', COLORS[severity]]}>
  {severity}
</span>
