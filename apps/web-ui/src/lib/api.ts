/**
 * Web UI API Client
 *
 * HTTP client for communicating with the orchestrator.
 */

const DEFAULT_ORCHESTRATOR_URL = "http://localhost:3000";

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseUrl: string;
  token?: string;
}

/**
 * API response type
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create an API client
 */
export function createApiClient(config?: Partial<ApiClientConfig>) {
  const baseUrl = config?.baseUrl ?? DEFAULT_ORCHESTRATOR_URL;
  let token = config?.token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  function getHeaders(): Record<string, string> {
    const result = { ...headers };
    if (token) {
      result["Authorization"] = `Bearer ${token}`;
    }
    return result;
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  return {
    baseUrl,

    setToken(newToken: string) {
      token = newToken;
    },

    clearToken() {
      token = undefined;
    },

    getToken() {
      return token;
    },

    async health() {
      return request<{ status: string }>("GET", "/health");
    },

    async status() {
      return request<{ status: string; uptime: number }>("GET", "/status");
    },

    async chat(message: string, sessionId?: string) {
      return request<{ response: string }>("POST", "/chat", { message, sessionId });
    },

    async getConfig() {
      return request<Record<string, unknown>>("GET", "/config");
    },

    async setConfig(key: string, value: unknown) {
      return request<void>("PUT", `/config/${key}`, { value });
    },

    async getCredentials() {
      return request<string[]>("GET", "/credentials");
    },

    async getLogs(options?: { limit?: number; level?: string }) {
      const params = new URLSearchParams();
      if (options?.limit) params.set("limit", String(options.limit));
      if (options?.level) params.set("level", options.level);
      return request<Array<{ timestamp: string; level: string; message: string }>>(
        "GET",
        `/logs?${params}`,
      );
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
