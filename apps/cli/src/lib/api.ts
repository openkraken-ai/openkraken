/**
 * CLI API Client
 *
 * HTTP client for communicating with the OpenKraken orchestrator.
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
 * Create an API client for the orchestrator
 */
export function createApiClient(config?: Partial<ApiClientConfig>) {
  const baseUrl = config?.baseUrl ?? DEFAULT_ORCHESTRATOR_URL;
  const token = config?.token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
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
    token,

    setToken(newToken: string) {
      headers["Authorization"] = `Bearer ${newToken}`;
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
      return request<Array<{ timestamp: string; level: string; message: string }>>(
        "GET",
        `/logs?${new URLSearchParams(options as Record<string, string>)}`,
      );
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
