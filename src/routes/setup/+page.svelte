<script lang="ts">
  import { auth } from '$lib/auth.svelte';
  import { goto } from '$app/navigation';
  import Setup from '$lib/components/Setup.svelte';

  $effect(() => {
    if (auth.ready && auth.authed) goto('/dashboard');
  });
</script>

{#if auth.ready && !auth.authed}
  <Setup />
{/if}
