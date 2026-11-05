<script lang="ts">
import type { RepositoryDetail } from '@podman-desktop/extension-redhat-catalog-core-api';
import { toPullSpec } from '@podman-desktop/extension-redhat-catalog-core-api';

import GradeBadge from '$lib/badges/GradeBadge.svelte';
import Label from '$lib/badges/Label.svelte';
import { formatDate, shortDigest } from '/@/utils/format';

interface Props {
  detail: RepositoryDetail;
}

let { detail }: Props = $props();

let copied: string | undefined = $state(undefined);

async function copy(spec: string): Promise<void> {
  await navigator.clipboard.writeText(spec);
  copied = spec;
}
</script>

<p class="m-0 text-sm text-(--pd-content-text) opacity-70">
  Recent builds of {detail.registry}/{detail.repository}. Each build is published for every architecture under one
  manifest list digest.
</p>

<table class="w-full text-sm text-(--pd-content-text) border-collapse" aria-label="Tags">
  <thead>
    <tr class="text-left text-(--pd-table-header-text) border-b border-[var(--pd-content-divider)]">
      <th class="py-2 pr-3 font-normal">Tags</th>
      <th class="py-2 pr-3 font-normal">Digest</th>
      <th class="py-2 pr-3 font-normal">Architectures</th>
      <th class="py-2 pr-3 font-normal">Pushed</th>
      <th class="py-2 pr-3 font-normal">Health</th>
      <th class="py-2 font-normal"><span class="sr-only">Actions</span></th>
    </tr>
  </thead>
  <tbody>
    {#each detail.tagGroups as group (group.digest ?? group.tags.join(','))}
      {@const spec = toPullSpec(detail.pullTarget, { digest: group.digest, tag: group.tags[0] })}
      <tr class="border-b border-[var(--pd-content-divider)] align-top" aria-label={group.tags.join(', ')}>
        <td class="py-2 pr-3">
          <div class="flex flex-wrap gap-1">
            {#each group.tags as tag (tag)}<Label>{tag}</Label>{/each}
          </div>
        </td>
        <td class="py-2 pr-3 font-mono" title={group.digest}>{shortDigest(group.digest) ?? '—'}</td>
        <td class="py-2 pr-3">{group.architectures.join(', ')}</td>
        <td class="py-2 pr-3 whitespace-nowrap">{formatDate(group.pushDate) ?? '—'}</td>
        <td class="py-2 pr-3"><GradeBadge grade={group.freshnessGrade} /></td>
        <td class="py-2 text-right">
          <button
            class="text-(--pd-link) hover:underline cursor-pointer whitespace-nowrap"
            title={spec}
            onclick={(): Promise<void> => copy(spec)}>{copied === spec ? 'Copied' : 'Copy pull spec'}</button>
        </td>
      </tr>
    {:else}
      <tr><td colspan="6" class="py-3 opacity-70">No tagged image.</td></tr>
    {/each}
  </tbody>
</table>
