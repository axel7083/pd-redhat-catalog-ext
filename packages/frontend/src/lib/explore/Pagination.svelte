<script lang="ts">
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';

interface Props {
  /**
   * 0-based current page.
   */
  page: number;
  pageSize: number;
  total: number;
  onpage: (page: number) => void;
}

let { page, pageSize, total, onpage }: Props = $props();

let pages = $derived(Math.max(1, Math.ceil(total / pageSize)));
let first = $derived(total === 0 ? 0 : page * pageSize + 1);
let last = $derived(Math.min(total, (page + 1) * pageSize));
</script>

<nav class="flex items-center justify-between gap-x-2 text-sm text-(--pd-content-text)" aria-label="Pagination">
  <span>{first}–{last} of {total.toLocaleString()}</span>
  <div class="flex items-center gap-x-2">
    <Button
      type="secondary"
      icon={faChevronLeft}
      aria-label="Previous page"
      disabled={page <= 0}
      onclick={(): void => onpage(page - 1)}>Previous</Button>
    <span>Page {page + 1} of {pages.toLocaleString()}</span>
    <Button
      type="secondary"
      icon={faChevronRight}
      aria-label="Next page"
      disabled={page + 1 >= pages}
      onclick={(): void => onpage(page + 1)}>Next</Button>
  </div>
</nav>
