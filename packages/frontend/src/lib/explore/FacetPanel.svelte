<script lang="ts">
import type { FacetValue } from '@podman-desktop/extension-redhat-catalog-core-api';
import { Checkbox } from '@podman-desktop/ui-svelte';

interface Props {
  label: string;
  values: FacetValue[];
  selected: string[];
  ontoggle: (value: string) => void;
  /**
   * Number of values shown before "Show more".
   */
  limit?: number;
}

let { label, values, selected, ontoggle, limit = 6 }: Props = $props();

let expanded = $state(false);
let filter = $state('');

/**
 * Selected values first (even when they have no result anymore), then by count.
 */
let ordered = $derived.by(() => {
  const missing = selected
    .filter(value => !values.some(item => item.value === value))
    .map(value => ({ value, count: 0 }));
  const selectedValues = [...values.filter(item => selected.includes(item.value)), ...missing];
  const others = values.filter(item => !selected.includes(item.value));
  return [...selectedValues, ...others];
});

let filtered = $derived(
  filter ? ordered.filter(item => item.value.toLowerCase().includes(filter.toLowerCase())) : ordered,
);
let visible = $derived(expanded || filter ? filtered : filtered.slice(0, Math.max(limit, selected.length)));
</script>

{#if ordered.length > 0}
  <section class="flex flex-col gap-y-1" aria-label={label}>
    <h2 class="text-(--pd-content-header) font-semibold text-sm m-0">{label}</h2>
    {#if ordered.length > 10}
      <input
        class="w-full rounded-sm border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-bg)] px-2 py-1 text-sm text-[var(--pd-input-field-focused-text)]"
        placeholder="Filter {label.toLowerCase()}"
        aria-label="Filter {label}"
        bind:value={filter} />
    {/if}
    <ul class="flex flex-col gap-y-0.5 list-none p-0 m-0">
      {#each visible as item (item.value)}
        <li class="flex items-center justify-between gap-x-2 text-sm text-(--pd-content-text)">
          <Checkbox
            checked={selected.includes(item.value)}
            title={item.value}
            onclick={(): void => ontoggle(item.value)}>
            <span class="truncate">{item.value}</span>
          </Checkbox>
          <span class="text-xs opacity-70">{item.count}</span>
        </li>
      {/each}
    </ul>
    {#if !filter && filtered.length > visible.length}
      <button class="text-left text-sm text-(--pd-link) cursor-pointer" onclick={(): boolean => (expanded = true)}>
        Show all ({filtered.length})
      </button>
    {:else if expanded && !filter}
      <button class="text-left text-sm text-(--pd-link) cursor-pointer" onclick={(): boolean => (expanded = false)}>
        Show less
      </button>
    {/if}
  </section>
{/if}
