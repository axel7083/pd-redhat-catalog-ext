<script lang="ts">
import type { AuthStatus, PullTarget } from '@podman-desktop/extension-redhat-catalog-core-api';
import { Button } from '@podman-desktop/ui-svelte';

import { authAPI } from '/@/api/client';

interface Props {
  target: PullTarget;
  auth: AuthStatus;
}

let { target, auth }: Props = $props();

let signingIn = $state(false);
let error: string | undefined = $state(undefined);

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
    class="flex flex-col gap-y-2 py-3 px-4 bg-(--pd-button-primary-bg)/8 border-l-3 border-l-(--pd-link) rounded-r text-(--pd-content-text)"
    role="note"
    aria-label="Registry access">
    {#if target.redHatLogin}
      {#if auth.signedIn}
        <p class="m-0">
          {target.registry} requires a Red Hat account. Signed in{auth.account ? ` as ${auth.account}` : ''}: the
          registry credentials are configured by the Red Hat Authentication extension.
        </p>
      {:else if auth.providerAvailable}
        <p class="m-0">
          {target.registry} requires a Red Hat account
          {target.reason === 'redhat-terms' ? ' (this image is subject to the Red Hat terms)' : ''}. Sign in to
          configure the registry credentials, a no-cost Red Hat Developer account is enough.
        </p>
        <div>
          <Button inProgress={signingIn} aria-label="Sign in with Red Hat" onclick={signIn}
            >Sign in with Red Hat</Button>
        </div>
      {:else}
        <p class="m-0">
          {target.registry} requires a Red Hat account. Install the Red Hat Authentication extension to sign in, or add the
          registry credentials in Settings &gt; Registries.
        </p>
        <div>
          <Button
            type="secondary"
            aria-label="Install Red Hat Authentication"
            onclick={(): Promise<void> => authAPI.installAuthenticationExtension()}
            >Install Red Hat Authentication</Button>
        </div>
      {/if}
    {:else}
      <p class="m-0">
        {target.registry} requires credentials. Add them in Settings &gt; Registries before pulling; some partner images are
        only available to their customers.
      </p>
    {/if}
    {#if error}<p class="m-0 text-(--pd-state-error)">{error}</p>{/if}
  </div>
{/if}
