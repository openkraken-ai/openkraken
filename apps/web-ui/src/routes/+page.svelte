<script lang="ts">
  import { session } from "$lib/stores/session";
  import Chat from "$lib/components/Chat.svelte";

  let isLoggingIn = false;
  let username = "";
  let password = "";

  async function handleLogin() {
    isLoggingIn = true;
    // TODO: Implement actual login
    // For now, simulate login
    setTimeout(() => {
      session.login("mock-token", username);
      isLoggingIn = false;
    }, 500);
  }

  function handleLogout() {
    session.logout();
  }

  function handleSendMessage(message: string) {
    // TODO: Send to API
    console.log("Message:", message);
  }
</script>

<svelte:head>
  <title>OpenKraken - AI Assistant</title>
</svelte:head>

<div class="app-container">
  <header>
    <h1>OpenKraken</h1>
    {#if $session.authenticated}
      <button on:click={handleLogout}>Logout</button>
    {/if}
  </header>

  <main>
    {#if $session.authenticated}
      <Chat messages={[]} onSend={handleSendMessage} />
    {:else}
      <div class="login-form">
        <h2>Sign In</h2>
        <form on:submit|preventDefault={handleLogin}>
          <div class="form-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              bind:value={username}
              required
              placeholder="Enter username"
            />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              bind:value={password}
              required
              placeholder="Enter password"
            />
          </div>
          <button type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    {/if}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    background: #f5f5f5;
  }

  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  header {
    background: #1976d2;
    color: white;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  header h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  header button {
    background: transparent;
    border: 1px solid white;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }

  header button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  main {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
  }

  .login-form {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
  }

  .login-form h2 {
    margin: 0 0 1.5rem;
    text-align: center;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: #1976d2;
  }

  button[type="submit"] {
    width: 100%;
    padding: 0.75rem;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
  }

  button[type="submit"]:hover:not(:disabled) {
    background: #1565c0;
  }

  button[type="submit"]:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
</style>
