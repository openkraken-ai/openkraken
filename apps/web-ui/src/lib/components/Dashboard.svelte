<script lang="ts">
  // Dashboard component placeholder
  export let status: { healthy: boolean; uptime?: number } = { healthy: false };
</script>

<div class="dashboard">
  <div class="status-card">
    <h3>System Status</h3>
    <div class="status-indicator" class:healthy={status.healthy}>
      {status.healthy ? "Healthy" : "Unknown"}
    </div>
    {#if status.uptime}
      <p class="uptime">Uptime: {formatUptime(status.uptime)}</p>
    {/if}
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <h4>Messages</h4>
      <p class="stat-value">-</p>
    </div>
    <div class="stat-card">
      <h4>Active Sessions</h4>
      <p class="stat-value">-</p>
    </div>
    <div class="stat-card">
      <h4>Tools Used</h4>
      <p class="stat-value">-</p>
    </div>
    <div class="stat-card">
      <h4>Errors (24h)</h4>
      <p class="stat-value">-</p>
    </div>
  </div>
</div>

<script context="module" lang="ts">
  function formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
</script>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .status-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  h3 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
  }

  .status-indicator {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    background: #ff9800;
    color: white;
    font-weight: 600;
  }

  .status-indicator.healthy {
    background: #4caf50;
  }

  .uptime {
    margin: 1rem 0 0;
    color: #666;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    background: white;
    padding: 1.25rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  h4 {
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
    color: #666;
    text-transform: uppercase;
  }

  .stat-value {
    margin: 0;
    font-size: 2rem;
    font-weight: 600;
  }
</style>
