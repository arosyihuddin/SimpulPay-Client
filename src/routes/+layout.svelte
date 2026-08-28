<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { checkAuth } from '$lib/auth.svelte';
  import { themeInit } from '$lib/theme.svelte';
  let { children } = $props();

  themeInit();
  onMount(() => { checkAuth(); });
</script>

{@render children()}
