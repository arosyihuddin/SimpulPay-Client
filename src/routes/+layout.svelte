<script lang="ts">
  import '../app.css';
  import { themeInit } from '$lib/theme.svelte';
  let { children } = $props();

  themeInit();
  // Tanpa checkAuth global — tiap rute panggil sendiri.
  // Landing `/` sengaja tanpa /me: render langsung, kebal maintenance.
</script>

{@render children()}
