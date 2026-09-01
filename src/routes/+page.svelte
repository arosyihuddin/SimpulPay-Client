<script lang="ts">
  import { auth } from '$lib/auth.svelte';
  import { goto } from '$app/navigation';
  import Login from '$lib/components/Login.svelte';

  $effect(() => {
    if (!auth.ready) return;
    if (auth.authed) goto('/dashboard');
  });
</script>

{#if auth.ready && !auth.authed}
  <Login />
{/if}
