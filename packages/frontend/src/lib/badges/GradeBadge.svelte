<script lang="ts">
interface Props {
  grade: string | undefined;
}

let { grade }: Props = $props();

/**
 * Container health index: A (no known vulnerabilities older than...) to F.
 * See https://access.redhat.com/articles/2803031
 */
const COLORS: Record<string, string> = {
  A: 'bg-green-700 text-white',
  B: 'bg-green-600 text-white',
  C: 'bg-yellow-600 text-white',
  D: 'bg-orange-600 text-white',
  E: 'bg-red-600 text-white',
  F: 'bg-red-800 text-white',
};

let color = $derived(grade ? (COLORS[grade.toUpperCase()] ?? 'bg-gray-700 text-white') : '');
</script>

{#if grade}
  <span
    class={['inline-flex items-center justify-center rounded-sm px-1.5 py-0.5 text-xs font-semibold', color]}
    title="Health index {grade}"
    aria-label="Health index {grade}">
    {grade}
  </span>
{/if}
