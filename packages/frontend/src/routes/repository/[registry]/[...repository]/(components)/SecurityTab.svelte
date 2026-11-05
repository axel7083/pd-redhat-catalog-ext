<script lang="ts">
import { faShieldHalved, faWarning } from '@fortawesome/free-solid-svg-icons';
import type { CatalogImage, Severity, Vulnerability } from '@podman-desktop/extension-redhat-catalog-core-api';
import { EmptyScreen } from '@podman-desktop/ui-svelte';

import GradeBadge from '$lib/badges/GradeBadge.svelte';
import SeverityBadge from '$lib/badges/SeverityBadge.svelte';
import ListSkeleton from '$lib/skeleton/ListSkeleton.svelte';
import { catalogAPI, dialogAPI } from '/@/api/client';
import { formatDate } from '/@/utils/format';

interface Props {
  image: CatalogImage;
}

let { image }: Props = $props();

const SEVERITIES: Severity[] = ['critical', 'important', 'moderate', 'low', 'unknown'];

let vulnerabilities: Promise<Vulnerability[]> = $derived(catalogAPI.getVulnerabilities(image.id));

function count(items: Vulnerability[], severity: Severity): number {
  return items.filter(item => item.severity === severity).length;
}
</script>

<div class="flex flex-row items-center gap-x-2 text-sm text-(--pd-content-text)">
  <span>Health index</span>
  <GradeBadge grade={image.freshnessGrade} />
  <button
    class="text-(--pd-link) hover:underline cursor-pointer"
    onclick={(): Promise<boolean> => dialogAPI.openExternal('https://access.redhat.com/articles/2803031')}
    >What is this?</button>
</div>

{#await vulnerabilities}
  <ListSkeleton />
{:then items}
  {#if items.length === 0}
    <EmptyScreen
      icon={faShieldHalved}
      title="No known vulnerabilities"
      aria-label="No known vulnerabilities"
      message="No unapplied security advisory affects this image." />
  {:else}
    <div class="flex flex-row gap-x-3 text-sm text-(--pd-content-text)" aria-label="Vulnerability summary">
      {#each SEVERITIES as severity (severity)}
        {@const value = count(items, severity)}
        {#if value}<span class="flex items-center gap-x-1"><SeverityBadge severity={severity} /> {value}</span>{/if}
      {/each}
    </div>
    <table class="w-full text-sm text-(--pd-content-text) border-collapse" aria-label="Vulnerabilities">
      <thead>
        <tr class="text-left text-(--pd-table-header-text) border-b border-[var(--pd-content-divider)]">
          <th class="py-2 pr-3 font-normal">CVE</th>
          <th class="py-2 pr-3 font-normal">Severity</th>
          <th class="py-2 pr-3 font-normal">Advisory</th>
          <th class="py-2 pr-3 font-normal">Public date</th>
          <th class="py-2 font-normal">Affected packages</th>
        </tr>
      </thead>
      <tbody>
        {#each items as vulnerability (vulnerability.cveId)}
          <tr class="border-b border-[var(--pd-content-divider)] align-top">
            <td class="py-2 pr-3 whitespace-nowrap">
              <button
                class="text-(--pd-link) hover:underline cursor-pointer"
                onclick={(): Promise<boolean> => dialogAPI.openExternal(vulnerability.cveUrl)}
                >{vulnerability.cveId}</button>
            </td>
            <td class="py-2 pr-3"><SeverityBadge severity={vulnerability.severity} /></td>
            <td class="py-2 pr-3 whitespace-nowrap">
              {#if vulnerability.advisoryUrl}
                {@const url = vulnerability.advisoryUrl}
                <button
                  class="text-(--pd-link) hover:underline cursor-pointer"
                  onclick={(): Promise<boolean> => dialogAPI.openExternal(url)}>{vulnerability.advisoryId}</button>
              {:else}—{/if}
            </td>
            <td class="py-2 pr-3 whitespace-nowrap">{formatDate(vulnerability.publicDate) ?? '—'}</td>
            <td class="py-2 break-all">{vulnerability.affectedPackages.join(', ')}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
{:catch err}
  <EmptyScreen
    icon={faWarning}
    title="Unable to fetch the vulnerabilities"
    aria-label="Error while fetching the vulnerabilities"
    message={err instanceof Error ? err.message : String(err)} />
{/await}
