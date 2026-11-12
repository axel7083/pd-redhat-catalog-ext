<script lang="ts">
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import type { RepositoryDetail, TagGroup } from '@podman-desktop/extension-redhat-catalog-core-api';
import { isTimestampTag, sortTagsForDisplay, toPullSpec } from '@podman-desktop/extension-redhat-catalog-core-api';
import { TableDurationColumn } from '@podman-desktop/ui-svelte';
import Fa from 'svelte-fa';

import GradeBadge from '$lib/badges/GradeBadge.svelte';
import Label from '$lib/badges/Label.svelte';
import { catalogAPI } from '/@/api/client';
import { formatDate, shortDigest } from '/@/utils/format';

interface Props {
  detail: RepositoryDetail;
}

let { detail }: Props = $props();

/**
 * The tag history is a separate, heavier query (~1s): only fetched when the tab is opened.
 */
let groups: TagGroup[] = $derived(await catalogAPI.getTags(detail.registry, detail.repository));

/**
 * At most this many readable tags per build; the others (and the timestamp tags) are behind "+N".
 */
const VISIBLE_TAGS = 3;

function displayTags(group: TagGroup): { visible: string[]; hidden: string[] } {
  const sorted = sortTagsForDisplay(group.tags);
  const readable = sorted.filter(tag => !isTimestampTag(tag));
  const visible = readable.slice(0, VISIBLE_TAGS);
  return { visible, hidden: sorted.filter(tag => !visible.includes(tag)) };
}

let copied: string | undefined = $state(undefined);

async function copy(spec: string): Promise<void> {
  await navigator.clipboard.writeText(spec);
  copied = spec;
  setTimeout(() => {
    if (copied === spec) copied = undefined;
  }, 2000);
}
</script>

<p class="m-0 text-sm text-(--pd-content-text) opacity-70">
  Recent builds of {detail.registry}/{detail.repository}, newest first. A build is published for every architecture
  under one digest.
</p>

<table class="w-full text-sm text-(--pd-content-text) border-collapse" aria-label="Tags">
  <thead>
    <tr class="text-left text-(--pd-table-header-text) border-b border-[var(--pd-content-divider)]">
      <th class="py-2 px-2 font-normal">Tags</th>
      <th class="py-2 px-2 font-normal whitespace-nowrap">Pushed</th>
      <th class="py-2 px-2 font-normal">Architectures</th>
      <th class="py-2 px-2 font-normal">Health</th>
      <th class="py-2 px-2 font-normal">Digest</th>
      <th class="py-2 px-2 font-normal"><span class="sr-only">Copy</span></th>
    </tr>
  </thead>
  <tbody>
    {#each groups as group (group.digest ?? group.tags.join(','))}
      {@const tags = displayTags(group)}
      {@const spec = toPullSpec(detail.pullTarget, { digest: group.digest, tag: group.tags[0] })}
      <tr
        class="border-b border-[var(--pd-content-divider)] hover:bg-[var(--pd-content-card-hover-bg)]"
        aria-label={tags.visible[0] ?? group.tags[0]}>
        <td class="py-2 px-2">
          <div class="flex flex-wrap items-center gap-1">
            {#each tags.visible as tag, index (tag)}
              {#if index === 0}
                <span class="font-medium text-(--pd-content-header) mr-1">{tag}</span>
              {:else}
                <Label>{tag}</Label>
              {/if}
            {/each}
            {#if tags.hidden.length}
              <Label title={tags.hidden.join('\n')}>+{tags.hidden.length}</Label>
            {/if}
          </div>
        </td>
        <td class="py-2 px-2 whitespace-nowrap" title={formatDate(group.pushDate)}>
          {#if group.pushDate}
            <span class="flex gap-x-1"><TableDurationColumn object={new Date(group.pushDate)} /> ago</span>
          {:else}—{/if}
        </td>
        <td class="py-2 px-2">
          <div class="flex flex-wrap gap-1">
            {#each group.architectures as architecture (architecture)}<Label>{architecture}</Label>{/each}
          </div>
        </td>
        <td class="py-2 px-2"><GradeBadge grade={group.freshnessGrade} /></td>
        <td class="py-2 px-2 font-mono text-xs opacity-70" title={group.digest}>{shortDigest(group.digest) ?? '—'}</td>
        <td class="py-2 px-2 text-right">
          <button
            class="p-1 rounded-[4px] text-(--pd-link) hover:bg-[var(--pd-link-hover-bg)] cursor-pointer"
            title={copied === spec ? 'Copied' : `Copy ${spec}`}
            aria-label="Copy pull spec of {tags.visible[0] ?? group.tags[0]}"
            onclick={(): Promise<void> => copy(spec)}>
            <Fa icon={copied === spec ? faCheck : faCopy} />
          </button>
        </td>
      </tr>
    {:else}
      <tr><td colspan="6" class="py-3 opacity-70">No tagged image.</td></tr>
    {/each}
  </tbody>
</table>
