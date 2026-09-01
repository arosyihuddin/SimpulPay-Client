<script lang="ts">
  import { auth } from '$lib/auth.svelte';
  import { goto } from '$app/navigation';
  import Login from '$lib/components/Login.svelte';
  import Maintenance from '$lib/components/Maintenance.svelte';

  $effect(() => {
    if (!auth.ready) return;
    if (auth.authed) goto('/dashboard');
  });
</script>

{#if auth.ready}
  {#if auth.maintenance}
    <Maintenance />
  {:else if !auth.authed}
    <Login />
  {/if}
{/if}
