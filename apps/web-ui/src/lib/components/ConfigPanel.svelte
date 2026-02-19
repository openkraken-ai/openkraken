<script lang="ts">
  // ConfigPanel component placeholder
  export let config: Record<string, unknown> = {};
  export let onSave: (key: string, value: unknown) => void = () => {};

  let editingKey = "";
  let editValue = "";

  function startEdit(key: string, value: unknown) {
    editingKey = key;
    editValue = JSON.stringify(value);
  }

  function saveEdit() {
    try {
      const value = JSON.parse(editValue);
      onSave(editingKey, value);
      editingKey = "";
    } catch {
      // Invalid JSON
    }
  }
</script>

<div class="config-panel">
  <h2>Configuration</h2>

  {#if Object.keys(config).length === 0}
    <p class="empty">No configuration available</p>
  {:else}
    <div class="config-list">
      {#each Object.entries(config) as [key, value]}
        <div class="config-item">
          <span class="key">{key}</span>
          <span class="value">{JSON.stringify(value)}</span>
          <button on:click={() => startEdit(key, value)}>Edit</button>
        </div>
      {/each}
    </div>
  {/if}

  {#if editingKey}
    <div class="edit-modal">
      <h3>Edit {editingKey}</h3>
      <textarea bind:value={editValue}></textarea>
      <div class="actions">
        <button on:click={saveEdit}>Save</button>
        <button on:click={() => editingKey = ""}>Cancel</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .config-panel {
    padding: 1rem;
  }

  h2 {
    margin-bottom: 1rem;
  }

  .empty {
    color: #666;
    text-align: center;
    padding: 2rem;
  }

  .config-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .config-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background: #f5f5f5;
    border-radius: 4px;
  }

  .key {
    font-weight: 600;
    min-width: 150px;
  }

  .value {
    flex: 1;
    font-family: monospace;
    color: #666;
  }

  button {
    padding: 0.25rem 0.75rem;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .edit-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  textarea {
    width: 100%;
    min-height: 100px;
    margin: 1rem 0;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
