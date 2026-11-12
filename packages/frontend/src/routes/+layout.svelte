<script lang="ts">
// app.css includes tailwind css dependencies that we use
import '/@/app.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { onMount } from 'svelte';
import { readRouterState, rpcBrowser, saveRouterState } from '/@/api/client';
import { afterNavigate, goto } from '$app/navigation';
import { page } from '$app/state';
import { Messages } from '@podman-desktop/extension-redhat-catalog-core-api';
import { selectedConnection } from '/@/states/connection.svelte';
import { appLocation } from '/@/utils/location';

let { children } = $props();

/**
 * The last explore page (search, scope, filters), saved for the breadcrumb of the repository pages.
 */
let explore: string | undefined = $state(readRouterState().explore);

afterNavigate(({ to }) => {
  if (to?.route.id === '/') explore = appLocation(to.url);
});

/**
 * Podman Desktop destroys the webview when the user leaves it: save where they are (restored by hooks.client.ts).
 */
$effect(() => {
  saveRouterState({ url: appLocation(page.url), explore, connection: selectedConnection.key });
});

onMount(() => {
  const unsubscribe = rpcBrowser.subscribe(Messages.ROUTE_UPDATE, location => {
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(location).catch(console.error);
  }).unsubscribe;

  return (): void => {
    unsubscribe();
  };
});
</script>

<!-- no extension sidebar: Podman Desktop already shows its navigation, scopes are tabs of the explore page -->
<div class="flex flex-row w-full h-full">
  {@render children()}
</div>
