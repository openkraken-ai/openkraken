/**
 * Configuration Loading Module
 * 
 * Loads and manages OpenKraken configuration using platform-appropriate paths.
 * Supports YAML configuration files with environment variable overrides.
 */

import { existsSync, readFileSync } from 'fs';
import { parse } from 'yaml';
import { getConfigPath, getPlatformPaths, type PlatformPaths } from './platform/index';
import { PLATFORM_ENV_VARS } from './platform/paths/types';

/**
 * OpenKraken configuration structure
 */
export interface OpenKrakenConfig {
  /** Application settings */
  app: {
    /** Application name */
    name: string;
    /** Application version */
    version: string;
    /** Environment (development, production) */
    environment: 'development' | 'production';
  };
  
  /** Sandbox configuration */
  sandbox: {
    /** Sandbox type (bubblewrap, sandbox-exec, none) */
    type: string;
    /** Allowed operations */
    allowedOperations: string[];
    /** Network isolation */
    networkIsolation: boolean;
  };
  
  /** Egress gateway configuration */
  egress: {
    /** Gateway host */
    host: string;
    /** Gateway port */
    port: number;
    /** Allowed domains */
    allowedDomains: string[];
  };
  
  /** Middleware configuration */
  middleware: {
    /** Enable human-in-the-loop */
    humanInTheLoop: boolean;
    /** Enable memory middleware */
    memory: boolean;
    /** Enable skill loader */
    skillLoader: boolean;
  };
  
  /** Observability configuration */
  observability: {
    /** Enable Langfuse */
    langfuse: boolean;
    /** Langfuse public key */
    langfusePublicKey?: string;
    /** Langfuse secret key */
    langfuseSecretKey?: string;
  };
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: OpenKrakenConfig = {
  app: {
    name: 'OpenKraken',
    version: '0.1.0',
    environment: 'development',
  },
  sandbox: {
    type: 'bubblewrap',
    allowedOperations: ['read', 'write', 'execute'],
    networkIsolation: true,
  },
  egress: {
    host: 'localhost',
    port: 8080,
    allowedDomains: [],
  },
  middleware: {
    humanInTheLoop: false,
    memory: true,
    skillLoader: true,
  },
  observability: {
    langfuse: false,
  },
};

/**
 * Configuration loader
 */
export class ConfigLoader {
  private config: OpenKrakenConfig | null = null;
  private configPath: string = '';

  /**
   * Loads configuration from platform-appropriate path
   * 
   * @returns Loaded configuration
   */
  load(): OpenKrakenConfig {
    if (this.config) {
      return this.config;
    }

    this.configPath = getConfigPath();
    console.log(`Loading configuration from: ${this.configPath}`);

    if (existsSync(this.configPath)) {
      try {
        const fileContent = readFileSync(this.configPath, 'utf-8');
        this.config = this.parseAndMerge(parse(fileContent));
        console.log('Configuration loaded successfully');
      } catch (error) {
        console.warn(`Failed to load configuration: ${error}`);
        console.warn('Using default configuration');
        this.config = { ...DEFAULT_CONFIG };
      }
    } else {
      console.log('Configuration file not found, using defaults');
      this.config = { ...DEFAULT_CONFIG };
    }

    // Apply environment variable overrides
    this.applyEnvOverrides();

    return this.config;
  }

  /**
   * Gets the current configuration (must call load first)
   * 
   * @returns Current configuration
   * @throws Error if configuration not loaded
   */
  get(): OpenKrakenConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Gets the path to the configuration file
   * 
   * @returns Configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Parses raw config and merges with defaults
   */
  private parseAndMerge(raw: Record<string, unknown>): OpenKrakenConfig {
    return {
      app: { ...DEFAULT_CONFIG.app, ...(raw.app as Record<string, unknown>) },
      sandbox: { ...DEFAULT_CONFIG.sandbox, ...(raw.sandbox as Record<string, unknown>) },
      egress: { ...DEFAULT_CONFIG.egress, ...(raw.egress as Record<string, unknown>) },
      middleware: { ...DEFAULT_CONFIG.middleware, ...(raw.middleware as Record<string, unknown>) },
      observability: { ...DEFAULT_CONFIG.observability, ...(raw.observability as Record<string, unknown>) },
    };
  }

  /**
   * Applies environment variable overrides
   */
  private applyEnvOverrides(): void {
    if (!this.config) return;

    // OPENKRAKEN_ENV overrides environment
    const env = process.env.OPENKRAKEN_ENV;
    if (env === 'development' || env === 'production') {
      this.config.app.environment = env;
    }

    // Sandbox type override
    const sandboxType = process.env.OPENKRAKEN_SANDBOX_TYPE;
    if (sandboxType) {
      this.config.sandbox.type = sandboxType;
    }

    // Egress host override
    const egressHost = process.env.OPENKRAKEN_EGRESS_HOST;
    if (egressHost) {
      this.config.egress.host = egressHost;
    }

    // Egress port override
    const egressPort = process.env.OPENKRAKEN_EGRESS_PORT;
    if (egressPort) {
      const port = parseInt(egressPort, 10);
      if (!isNaN(port)) {
        this.config.egress.port = port;
      }
    }

    // Langfuse overrides
    const langfuseEnabled = process.env.OPENKRAKEN_LANGFUSE_ENABLED;
    if (langfuseEnabled === 'true') {
      this.config.observability.langfuse = true;
    }

    const langfusePublicKey = process.env.OPENKRAKEN_LANGFUSE_PUBLIC_KEY;
    if (langfusePublicKey) {
      this.config.observability.langfusePublicKey = langfusePublicKey;
    }

    const langfuseSecretKey = process.env.OPENKRAKEN_LANGFUSE_SECRET_KEY;
    if (langfuseSecretKey) {
      this.config.observability.langfuseSecretKey = langfuseSecretKey;
    }
  }
}

/**
 * Global configuration loader instance
 */
let globalConfigLoader: ConfigLoader | null = null;

/**
 * Gets the global configuration loader instance
 */
export function getConfigLoader(): ConfigLoader {
  if (!globalConfigLoader) {
    globalConfigLoader = new ConfigLoader();
  }
  return globalConfigLoader;
}

/**
 * Convenience function to load configuration
 */
export function loadConfig(): OpenKrakenConfig {
  return getConfigLoader().load();
}

/**
 * Convenience function to get configuration
 */
export function getConfig(): OpenKrakenConfig {
  return getConfigLoader().get();
}

/**
 * Example configuration file content (config.yaml)
 */
export const EXAMPLE_CONFIG = `# OpenKraken Configuration
# This file is loaded from platform-appropriate locations

app:
  name: OpenKraken
  version: 0.1.0
  environment: development

sandbox:
  type: bubblewrap
  allowedOperations:
    - read
    - write
    - execute
  networkIsolation: true

egress:
  host: localhost
  port: 8080
  allowedDomains:
    - example.com
    - api.example.com

middleware:
  humanInTheLoop: false
  memory: true
  skillLoader: true

observability:
  langfuse: false
  # langfusePublicKey: your-public-key
  # langfuseSecretKey: your-secret-key
`;

/**
 * Creates an example configuration file
 */
export function createExampleConfig(path?: string): string {
  const configPath = path ?? getConfigPath();
  console.log(`Creating example configuration at: ${configPath}`);
  return EXAMPLE_CONFIG;
}
