<script lang="ts">
  let { msg = '' }: { msg?: string } = $props();
</script>

{#if msg}
  <p class="text-xs font-semibold text-red-500 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-xl px-3 py-2">{msg}</p>
{/if}