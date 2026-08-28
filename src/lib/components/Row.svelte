<script lang="ts">
  let { label, val = '-', mono = false }: { label: string; val?: string; mono?: boolean } = $props();
</script>

<div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
  <span class="text-[var(--text-muted)] shrink-0">{label}</span>
  <span class="font-mono text-xs break-all text-right">{val}</span>
</div>