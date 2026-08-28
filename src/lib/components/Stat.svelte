<script lang="ts">
  let { icon, label, value }: { icon: string; label: string; value: string } = $props();
</script>

<div class="tactile-box p-4 space-y-2">
  <i class="{icon} text-[var(--accent)] text-lg"></i>
  <div>
    <p class="text-[11px] text-[var(--text-muted)] font-medium">{label}</p>
    <p class="text-lg font-bold truncate">{value}</p>
  </div>
</div>