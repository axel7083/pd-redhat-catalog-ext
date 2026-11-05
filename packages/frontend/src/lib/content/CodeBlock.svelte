<script lang="ts">
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

interface Props {
  code: string;
  label: string;
}

let { code, label }: Props = $props();

let copied = $state(false);

async function copy(): Promise<void> {
  await navigator.clipboard.writeText(code);
  copied = true;
  setTimeout(() => (copied = false), 2000);
}
</script>

<div class="flex items-start gap-2 rounded-md bg-[var(--pd-content-bg)] p-2">
  <pre class="grow overflow-x-auto font-mono text-sm text-[var(--pd-content-text)]" aria-label={label}>{code}</pre>
  <Button type="link" icon={faCopy} aria-label="Copy {label}" title="Copy to clipboard" onclick={copy}>
    {copied ? 'Copied' : 'Copy'}
  </Button>
</div>
