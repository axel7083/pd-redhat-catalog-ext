<script lang="ts">
import { dialogAPI } from '/@/api/client';
import { renderDescription } from '/@/utils/markdown';

interface Props {
  content: string;
  format: 'markdown' | 'html';
}

let { content, format }: Props = $props();

let html = $derived(renderDescription(content, format));

/**
 * Links of publisher content must open in the system browser, not in the webview.
 */
function onclick(event: MouseEvent): void {
  const anchor = (event.target as HTMLElement | null)?.closest('a');
  const href = anchor?.getAttribute('href');
  if (!href) return;
  event.preventDefault();
  if (/^https?:\/\//.test(href)) {
    dialogAPI.openExternal(href).catch(console.error);
  }
}
</script>

<!-- the content is sanitized with DOMPurify, see renderDescription -->
<!-- link clicks bubble from the rendered anchors, which are keyboard accessible -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<article
  class="prose prose-sm max-w-none text-[var(--pd-content-text)] prose-headings:text-[var(--pd-content-header)] prose-a:text-[var(--pd-link)] prose-strong:text-[var(--pd-content-header)] prose-code:text-[var(--pd-content-header)] prose-pre:bg-[var(--pd-content-bg)]"
  onclick={onclick}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html html}
</article>
