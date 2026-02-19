<script lang="ts">
  import Dashboard from "$lib/components/Dashboard.svelte";
</script>

<svelte:head>
  <title>Dashboard - OpenKraken</title>
</svelte:head>

<div class="dashboard-page">
  <h1>System Dashboard</h1>
  <Dashboard />
</div>

<style>
  .dashboard-page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  h1 {
    margin-bottom: 1.5rem;
    font-size: 1.75rem;
    font-weight: 600;
  }
</style>
