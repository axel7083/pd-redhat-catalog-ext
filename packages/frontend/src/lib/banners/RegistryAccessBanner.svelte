<script lang="ts">
import type { AuthStatus, PullTarget } from '@podman-desktop/extension-redhat-catalog-core-api';
import { faCircleCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@podman-desktop/ui-svelte';
import Fa from 'svelte-fa';

import { authAPI } from '/@/api/client';

interface Props {
  target: PullTarget;
  auth: AuthStatus;
}

let { target, auth }: Props = $props();

let signingIn = $state(false);
let error: string | undefined = $state(undefined);

/**
 * Signed in: informative. Otherwise the pull will fail: a warning that stands out.
 */
let ready = $derived(target.redHatLogin && auth.signedIn);

async function signIn(): Promise<void> {
  signingIn = true;
  error = undefined;
  try {
    await authAPI.signIn();
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : String(err);
  } finally {
    signingIn = false;
  }
}
</script>

{#if target.requiresLogin}
  <div
    class={[
      'flex flex-row items-start gap-x-3 rounded-md border-l-4 p-3 text-sm text-[var(--pd-content-card-text)]',
      ready
        ? 'border-[var(--pd-state-success)] bg-[var(--pd-content-bg)]'
        : 'border-[var(--pd-state-warning)] bg-[color-mix(in_srgb,var(--pd-state-warning)_12%,transparent)]',
    ]}
    role={ready ? 'note' : 'alert'}
    aria-label="Registry access">
    <Fa
      icon={ready ? faCircleCheck : faTriangleExclamation}
      class="mt-0.5 shrink-0 {ready ? 'text-[var(--pd-state-success)]' : 'text-[var(--pd-state-warning)]'}" />
    <div class="flex flex-col gap-y-2 grow">
      {#if target.redHatLogin}
        {#if auth.signedIn}
          <p class="m-0">
            Signed in{auth.account ? ` as ${auth.account}` : ''}: the {target.registry} credentials are configured by the
            Red Hat Authentication extension.
          </p>
        {:else if auth.providerAvailable}
          <p class="m-0">
            <strong class="text-[var(--pd-content-card-header-text)]">Sign in to pull this image.</strong>
            {target.registry} requires a Red Hat account{target.reason === 'redhat-terms'
              ? ' (this image is subject to the Red Hat terms)'
              : ''}; a no-cost Red Hat Developer account is enough.
          </p>
          <div>
            <Button inProgress={signingIn} aria-label="Sign in with Red Hat" onclick={signIn}
              >Sign in with Red Hat</Button>
          </div>
        {:else}
          <p class="m-0">
            <strong class="text-[var(--pd-content-card-header-text)]"
              >A Red Hat account is required to pull this image.</strong>
            Install the Red Hat Authentication extension to sign in to {target.registry}, or add the registry
            credentials in Settings &gt; Registries.
          </p>
          <div>
            <Button
              aria-label="Install Red Hat Authentication"
              onclick={(): Promise<void> => authAPI.installAuthenticationExtension()}
              >Install Red Hat Authentication</Button>
          </div>
        {/if}
      {:else}
        <p class="m-0">
          <strong class="text-[var(--pd-content-card-header-text)]"
            >Credentials are required to pull this image.</strong>
          Add the {target.registry} credentials in Settings &gt; Registries; some partner images are only available to their
          customers.
        </p>
      {/if}
      {#if error}<p class="m-0 text-(--pd-state-error)">{error}</p>{/if}
    </div>
  </div>
{/if}
