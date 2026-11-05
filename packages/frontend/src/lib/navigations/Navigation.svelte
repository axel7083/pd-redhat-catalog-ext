<script lang="ts">
import { faCompass, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { SettingsNavItem } from '@podman-desktop/ui-svelte';

import { asset, resolve } from '$app/paths';
import { page } from '$app/state';

const HARDENED_PRESET = '?hardened=1&f.build_categories_list=Hardened';

let hardened = $derived(page.url.searchParams.getAll('f.build_categories_list').includes('Hardened'));
let explore = $derived(page.url.pathname === '/' && !hardened);
</script>

<nav
  class="z-1 w-leftsidebar min-w-leftsidebar flex-col justify-between flex transition-all duration-500 ease-in-out bg-[var(--pd-secondary-nav-bg)] border-[var(--pd-global-nav-bg-border)] border-r-[1px]"
  aria-label="Navigation">
  <div class="flex items-center">
    <a href={resolve('/')} title="Navigate to the catalog" class="pt-4 px-3 mb-5 flex items-center gap-1">
      <img src={asset('icon.png')} alt="Red Hat Catalog" class="w-6 h-6" />
      <p
        class="text-xl font-semibold text-[color:var(--pd-secondary-nav-header-text)] border-l-[4px] border-transparent">
        Red Hat Catalog
      </p>
    </a>
  </div>
  <div class="h-full overflow-y-auto [&_svg]:w-[1.25em] [&_span[role=img]]:w-[1.25em]" style="margin-bottom:auto">
    <SettingsNavItem title="Explore" icon={faCompass} selected={explore} href={resolve('/')} />
    <SettingsNavItem
      title="Hardened images"
      icon={faShieldHalved}
      selected={hardened}
      href={`${resolve('/')}${HARDENED_PRESET}`} />
  </div>
</nav>
