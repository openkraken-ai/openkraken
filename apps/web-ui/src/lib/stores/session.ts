/**
 * Session Store
 *
 * Svelte stores for session state management.
 */

import { writable } from "svelte/store";

/**
 * Session state
 */
export interface SessionState {
  authenticated: boolean;
  token: string | null;
  userId: string | null;
}

/**
 * Create session store
 */
function createSessionStore() {
  const { subscribe, set, update } = writable<SessionState>({
    authenticated: false,
    token: null,
    userId: null,
  });

  return {
    subscribe,

    login(token: string, userId?: string) {
      set({
        authenticated: true,
        token,
        userId: userId ?? null,
      });
    },

    logout() {
      set({
        authenticated: false,
        token: null,
        userId: null,
      });
    },

    setToken(token: string) {
      update((state) => ({ ...state, token }));
    },
  };
}

/**
 * Session store
 */
export const session = createSessionStore();

/**
 * Messages store for chat
 */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

function createMessagesStore() {
  const { subscribe, set, update } = writable<Message[]>([]);

  return {
    subscribe,

    add(message: Omit<Message, "id" | "timestamp">) {
      update((messages) => [
        ...messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
      ]);
    },

    clear() {
      set([]);
    },
  };
}

export const messages = createMessagesStore();
