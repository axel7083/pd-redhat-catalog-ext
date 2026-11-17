<script lang="ts">
// app.css includes tailwind css dependencies that we use
import '/@/app.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { onMount } from 'svelte';
import { readRouterState, routingAPI, rpcBrowser, saveRouterState } from '/@/api/client';
import { afterNavigate, goto } from '$app/navigation';
import { page } from '$app/state';
import { Messages } from '@podman-desktop/extension-redhat-catalog-core-api';
import { selectedConnection } from '/@/states/connection.svelte';
import { appLocation } from '/@/utils/location';

let { children } = $props();

/**
 * Where the user is (path and query), and the last catalog page (search, filters) for the breadcrumb of the repository
 * pages. Taken from the navigations rather than page.url: while the data of the new page loads, async Svelte holds
 * page.url on the previous page, and the previous page would be saved.
 */
let url: string = $state(appLocation(page.url));
let explore: string | undefined = $state(readRouterState().explore);

afterNavigate(({ to }) => {
  if (!to) return;
  url = appLocation(to.url);
  if (to.route.id === '/catalog') explore = url;
});

/**
 * Podman Desktop destroys the webview when the user leaves it: save where they are (restored by hooks.client.ts).
 */
$effect(() => {
  saveRouterState({ url, explore, connection: selectedConnection.key });
});

onMount(() => {
  // a route requested by the extension (e.g. a command) while the webview was closed: wins over the restored page
  routingAPI
    .readRoute()
    .then(route => {
      // eslint-disable-next-line svelte/no-navigation-without-resolve
      if (route) return goto(route);
    })
    .catch(console.error);

  const unsubscribe = rpcBrowser.subscribe(Messages.ROUTE_UPDATE, location => {
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(location).catch(console.error);
  }).unsubscribe;

  return (): void => {
    unsubscribe();
  };
});
</script>

<!-- no extension sidebar: Podman Desktop already shows its navigation; the home page leads to the catalog page -->
<div class="flex flex-row w-full h-full">
  {@render children()}
</div>
