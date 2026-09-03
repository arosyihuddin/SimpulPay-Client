<script lang="ts">
  import { auth } from '$lib/auth.svelte';
  import Landing from '$lib/components/Landing.svelte';
  import Maintenance from '$lib/components/Maintenance.svelte';

  // Root `/` = public landing. Tetap tampil walau sudah login.
</script>

{#if auth.ready}
  {#if auth.maintenance}
    <Maintenance />
  {:else}
    <Landing />
  {/if}
{/if}