<script lang="ts">
  let { className = '' }: { className?: string } = $props();
</script>

<div class="animate-pulse rounded-xl bg-slate-300/40 dark:bg-slate-700/40 {className}"></div>