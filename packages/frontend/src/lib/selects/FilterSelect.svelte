<script module lang="ts">
export interface FilterOption {
  value: string;
  /**
   * Number of results with this value, shown next to it.
   */
  count?: number;
}
</script>

<script lang="ts">
import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Checkbox } from '@podman-desktop/ui-svelte';
import Fa from 'svelte-fa';

interface Props {
  label: string;
  options: FilterOption[];
  /**
   * Selected values.
   */
  selected: string[];
  onchange: (values: string[]) => void;
  loading?: boolean;
}

let { label, options, selected, onchange, loading = false }: Props = $props();

/**
 * Multi-select with a one-line trigger: chips of a regular multi-select stack and grow the filter bar.
 */
let open = $state(false);
let filter = $state('');
let container: HTMLDivElement | undefined = $state(undefined);

// selected values stay listed (first) when the other filters leave them without results
let listed: FilterOption[] = $derived([
  ...selected.map(value => options.find(option => option.value === value) ?? { value, count: 0 }),
  ...options.filter(option => !selected.includes(option.value)),
]);
let visible = $derived(
  filter ? listed.filter(option => option.value.toLowerCase().includes(filter.trim().toLowerCase())) : listed,
);

let summary = $derived.by(() => {
  if (selected.length === 0) return label;
  if (selected.length === 1) return selected[0];
  return `${label} · ${selected.length}`;
});

function toggle(value: string): void {
  onchange(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);
}

function clear(event: MouseEvent): void {
  event.stopPropagation();
  onchange([]);
}

/**
 * Opening the list focuses its search input, so the user can type right away.
 */
function focusOnOpen(input: HTMLInputElement): void {
  input.focus();
}

function close(): void {
  open = false;
  filter = '';
}

function onwindowclick(event: MouseEvent): void {
  if (open && container && !container.contains(event.target as Node)) close();
}

function onkeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open) {
    event.stopPropagation();
    close();
  }
}
</script>

<svelte:window onclick={onwindowclick} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative w-full" bind:this={container} onkeydown={onkeydown}>
  <button
    type="button"
    class={[
      'flex w-full h-8 items-center gap-x-2 rounded-[4px] border px-2 text-left text-[12px] bg-[var(--pd-content-bg)] cursor-pointer',
      open
        ? 'border-[var(--pd-input-field-hover-stroke)]'
        : 'border-[var(--pd-input-field-stroke)] hover:border-[var(--pd-input-field-hover-stroke)]',
      selected.length ? 'text-[var(--pd-input-field-focused-text)]' : 'text-[var(--pd-input-field-placeholder-text)]',
    ]}
    aria-label={label}
    aria-haspopup="listbox"
    aria-expanded={open}
    title={selected.length ? `${label}: ${selected.join(', ')}` : label}
    onclick={(): boolean => (open = !open)}>
    <span class="grow truncate">{summary}</span>
    {#if selected.length}
      <span
        role="button"
        tabindex="0"
        class="p-0.5 text-[var(--pd-input-field-placeholder-text)] hover:text-[var(--pd-input-field-focused-text)]"
        aria-label="Clear {label}"
        onclick={clear}
        onkeydown={(event): void => {
          if (event.key === 'Enter' || event.key === ' ') onchange([]);
        }}>
        <Fa icon={faXmark} />
      </span>
    {/if}
    <Fa icon={faChevronDown} class="text-[var(--pd-input-field-placeholder-text)]" size="0.8x" />
  </button>

  {#if open}
    <div
      class="absolute z-50 mt-1 w-max min-w-full max-w-[22rem] max-h-80 flex flex-col rounded-[4px] border border-[var(--pd-input-field-stroke)] bg-[var(--pd-dropdown-bg)] shadow-lg"
      role="listbox"
      aria-multiselectable="true"
      aria-label="{label} values">
      {#if listed.length > 8}
        <input
          {@attach focusOnOpen}
          class="m-2 rounded-[4px] border border-[var(--pd-input-field-stroke)] bg-[var(--pd-input-field-bg)] px-2 py-1 text-[12px] text-[var(--pd-input-field-focused-text)] outline-none focus:border-[var(--pd-input-field-hover-stroke)]"
          placeholder="Search {label.toLowerCase()}"
          aria-label="Search {label}"
          bind:value={filter} />
      {/if}
      <ul class="list-none m-0 p-1 overflow-y-auto overflow-x-hidden">
        {#if loading && listed.length === 0}
          <li class="px-2 py-1 text-[12px] text-[var(--pd-dropdown-item-text)] opacity-70">Loading…</li>
        {/if}
        {#each visible as option (option.value)}
          <!-- long names are truncated, the full name is in the tooltip -->
          <li
            class="flex items-center justify-between gap-x-2 min-w-0 rounded-sm px-2 py-1 text-[12px] text-[var(--pd-dropdown-item-text)] hover:bg-[var(--pd-dropdown-item-hover-bg)]"
            role="option"
            aria-selected={selected.includes(option.value)}
            title={option.value}>
            <Checkbox
              class="min-w-0 grow"
              checked={selected.includes(option.value)}
              onclick={(): void => toggle(option.value)}>
              <span class="min-w-0 truncate">{option.value}</span>
            </Checkbox>
            {#if option.count !== undefined}
              <span class="shrink-0 text-[11px] opacity-60">{option.count.toLocaleString()}</span>
            {/if}
          </li>
        {:else}
          {#if !loading}
            <li class="px-2 py-1 text-[12px] text-[var(--pd-dropdown-item-text)] opacity-70">No match</li>
          {/if}
        {/each}
      </ul>
    </div>
  {/if}
</div>
