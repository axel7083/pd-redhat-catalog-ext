<script lang="ts">
import { faCircleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';

interface Props {
  message: string;
  /**
   * Lines shown before the message is clamped (the full message is in the tooltip). All of it when undefined.
   */
  lines?: number;
  ondismiss?: () => void;
  'aria-label'?: string;
}

let { message, lines, ondismiss, 'aria-label': ariaLabel }: Props = $props();
</script>

<!-- same box as the registry access banner (RegistryAccessBanner), in the error colour -->
<div
  class="flex flex-row items-start gap-x-2 rounded-md border border-[color-mix(in_srgb,var(--pd-state-error)_45%,transparent)] bg-[color-mix(in_srgb,var(--pd-state-error)_10%,transparent)] px-3 py-2 text-xs text-[var(--pd-content-card-text)]"
  role="alert"
  aria-label={ariaLabel}>
  <Fa icon={faCircleExclamation} class="mt-0.5 shrink-0 text-[var(--pd-state-error)]" />
  <span
    class="grow min-w-0 wrap-anywhere"
    style:-webkit-line-clamp={lines}
    style:display={lines ? '-webkit-box' : undefined}
    style:-webkit-box-orient={lines ? 'vertical' : undefined}
    style:overflow={lines ? 'hidden' : undefined}
    title={lines ? message : undefined}>{message}</span>
  {#if ondismiss}
    <button
      type="button"
      class="shrink-0 cursor-pointer opacity-70 hover:opacity-100"
      aria-label="Dismiss the pull error"
      onclick={ondismiss}>
      <Fa icon={faXmark} />
    </button>
  {/if}
</div>
