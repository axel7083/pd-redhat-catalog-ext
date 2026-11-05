<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  children: Snippet;
  tone?: 'default' | 'accent' | 'warning';
  title?: string;
}

let { children, tone = 'default', title }: Props = $props();
</script>

<span
  title={title}
  class={[
    'inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs whitespace-nowrap',
    tone === 'default' && 'bg-[var(--pd-label-bg)] text-[var(--pd-label-text)]',
    tone === 'accent' && 'bg-[var(--pd-label-primary-bg)] text-[var(--pd-label-primary-text)]',
    tone === 'warning' && 'bg-amber-600 text-white',
  ]}>
  {@render children()}
</span>
