<script lang="ts">
  import { auth } from '$lib/auth.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Login from '$lib/components/Login.svelte';
  import Maintenance from '$lib/components/Maintenance.svelte';

  const oauthError = $derived(page.url.searchParams.get('oauth_error') ?? '');

  // Login page — kalau sudah authed, langsung ke dashboard.
  $effect(() => {
    if (auth.ready && auth.authed) goto('/dashboard');
  });
</script>

{#if auth.ready}
  {#if auth.maintenance}
    <Maintenance />
  {:else if !auth.authed}
    <Login oauthError={oauthError} />
  {/if}
{/if}