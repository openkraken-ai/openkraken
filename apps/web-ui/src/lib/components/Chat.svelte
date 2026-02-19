<script lang="ts">
  // Chat component placeholder
  export let messages: Array<{ role: string; content: string }> = [];
  export let onSend: (message: string) => void = () => {};
</script>

<div class="chat-container">
  <div class="messages">
    {#if messages.length === 0}
      <p class="empty">No messages yet. Start a conversation!</p>
    {:else}
      {#each messages as message}
        <div class="message" class:user={message.role === "user"}>
          <span class="role">{message.role}</span>
          <p class="content">{message.content}</p>
        </div>
      {/each}
    {/if}
  </div>

  <div class="input-area">
    <input type="text" placeholder="Type your message..." on:keydown={(e) => {
      if (e.key === "Enter") {
        onSend(e.currentTarget.value);
        e.currentTarget.value = "";
      }
    }} />
    <button on:click={(e) => {
      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
      onSend(input.value);
      input.value = "";
    }}>Send</button>
  </div>
</div>

<style>
  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .empty {
    color: #666;
    text-align: center;
    padding: 2rem;
  }

  .message {
    margin-bottom: 1rem;
    padding: 0.75rem;
    border-radius: 8px;
    background: #f5f5f5;
  }

  .message.user {
    background: #e3f2fd;
    margin-left: 2rem;
  }

  .role {
    font-size: 0.75rem;
    color: #666;
    text-transform: uppercase;
  }

  .content {
    margin: 0.5rem 0 0;
  }

  .input-area {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    border-top: 1px solid #ddd;
  }

  input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  button {
    padding: 0.5rem 1rem;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background: #1565c0;
  }
</style>
