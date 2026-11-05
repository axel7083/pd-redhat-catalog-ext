<script lang="ts">
interface Props {
  rows?: number;
}

let { rows = 6 }: Props = $props();
</script>

<div class="flex flex-col gap-y-3 animate-pulse" role="status" aria-label="Loading">
  {#each Array.from({ length: rows }, (_, index) => index) as row (row)}
    <div class="grid grid-cols-4 gap-4">
      <div class="col-span-1 h-2 rounded bg-gray-900"></div>
      <div class="col-span-2 h-2 rounded bg-gray-900"></div>
      <div class="col-span-1 h-2 rounded bg-gray-900"></div>
    </div>
  {/each}
</div>
