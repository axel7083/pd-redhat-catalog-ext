<script lang="ts">
import LoadingBar from '$lib/progress/LoadingBar.svelte';
</script>

<!-- the loading bar of the nearest async boundary (e.g. switching architecture in a tab) -->
<LoadingBar loading={$effect.pending() > 0} />
