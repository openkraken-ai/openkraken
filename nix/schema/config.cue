package config

import "net"

// OpenKraken Configuration Schema v1.0
// This schema validates config.yaml against the configuration specification
// defined in TechSpec Section 6.3.
//
// Usage:
//   cue vet -c nix/schema/config.cue config.yaml
//
// The schema enforces:
// - Required fields and their types
// - Value constraints (ranges, enums)
// - Structural validation

#Config: {
	// Configuration version - must be "1.0"
	version: "1.0"

	// Orchestrator server configuration
	orchestrator: #OrchestratorConfig

	// Sandbox runtime configuration
	sandbox: #SandboxConfig

	// Egress gateway configuration
	egressGateway: #EgressGatewayConfig

	// Credential vault configuration
	credentials: #CredentialsConfig

	// Communication channels configuration
	channels: #ChannelsConfig

	// Middleware configuration
	middleware: #MiddlewareConfig

	// Skills configuration
	skills: #SkillsConfig

	// Observability configuration
	observability: #ObservabilityConfig

	// Storage configuration
	storage: #StorageConfig

	// Alerting configuration
	alerting: #AlertingConfig
}

// Orchestrator configuration
// Defines the main orchestrator server settings
#OrchestratorConfig: {
	// Server host address (must be valid IPv4)
	host: string & net.IPv4

	// Server port (1024-65535, unprivileged ports)
	port: int & >=1024 & <=65535

	// Session management settings
	session: {
		// Maximum concurrent sessions (1-10)
		maxConcurrent: int & >0 & <=10

		// Idle session timeout in minutes
		idleTimeoutMinutes: int & >=1

		// Enable day boundary for session tracking
		dayBoundaryEnabled: bool
	}

	// Context management settings
	context: {
		// Maximum tokens for context window
		maxTokens: int & >=1000 & <=200000

		// Token threshold for summarization trigger
		summarizationThreshold: int

		// Optional custom prompt for summarization
		summarizationPrompt?: string
	}
}

// Sandbox configuration
// Defines the isolation environment settings
#SandboxConfig: {
	// Enable sandbox isolation
	enabled: bool

	// Sandbox timeout in seconds (minimum 60s)
	timeoutSeconds: int & >=60

	// Memory limit in megabytes (minimum 512MB)
	memoryLimitMb: int & >=512

	// CPU limit as percentage (10-100%)
	cpuLimitPercent: int & >=10 & <=100

	// Sandbox zone directories
	zones: {
		// Directory for skills
		skills: string

		// Directory for inputs
		inputs: string

		// Directory for work files
		work: string

		// Directory for outputs
		outputs: string
	}
}

// Egress gateway configuration
// Defines the proxy and allowlist settings
#EgressGatewayConfig: {
	// HTTP proxy settings
	http: {
		// Enable HTTP proxy
		enabled: bool

		// HTTP proxy port (1024-65535)
		port: int & >=1024 & <=65535
	}

	// SOCKS5 proxy settings
	socks5: {
		// Enable SOCKS5 proxy
		enabled: bool

		// SOCKS5 proxy port (1024-65535)
		port: int & >=1024 & <=65535
	}

	// Domain allowlist settings
	allowlist: {
		// System-defined allowed domains
		system: [...string]

		// Owner-defined allowed domains
		owner: [...string]

		// TTL for allowlist entries in seconds (minimum 60s)
		ttlSeconds: int & >=60
	}
}

// Credentials configuration
// Defines credential vault settings
#CredentialsConfig: {
	// Vault backend type
	backend: string

	// Keychain service name (for macOS Keychain)
	keychainService?: string

	// Secret service collection (for Linux)
	secretServiceCollection?: string
}

// Channels configuration
// Defines external communication channels
#ChannelsConfig: {
	// Telegram integration (optional)
	telegram?: {
		// Enable Telegram bot
		enabled: bool

		// Bot operation mode
		mode: "webhook" | "polling"

		// Webhook URL (required when mode is "webhook")
		if mode == "webhook" {
			webhookUrl!: string
		}

		// Secret token for webhook verification
		secretToken?: string
	}

	// MCP server integration (optional)
	mcp?: {
		// Enable MCP servers
		enabled: bool

		// MCP server configurations
		servers: [...#McpServerConfig]

		// Connection timeout in seconds
		connectionTimeoutSeconds: int
	}
}

// MCP server configuration
#McpServerConfig: {
	// Server name
	name: string

	// Server command
	command: string

	// Server arguments
	args?: [...string]

	// Server environment variables
	env?: {[string]: string}
}

// Middleware configuration
// Defines enabled middleware components
#MiddlewareConfig: {
	// Enable human-in-the-loop middleware
	humanInTheLoop: bool

	// Enable memory middleware
	memory: bool

	// Enable skill loader middleware
	skillLoader: bool
}

// Skills configuration
// Defines skill management settings
#SkillsConfig: {
	// Auto-update skills
	autoUpdate: bool

	// Update check interval in hours
	updateCheckIntervalHours: int

	// Skill directory
	directory: string

	// Maximum skill execution time in seconds
	executionTimeoutSeconds: int
}

// Observability configuration
// Defines telemetry and logging settings
#ObservabilityConfig: {
	// Enable Langfuse tracing
	langfuse: bool

	// Langfuse public key
	langfusePublicKey?: string

	// Langfuse secret key
	langfuseSecretKey?: string

	// OpenTelemetry endpoint
	otelEndpoint?: string

	// Log level
	logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR"
}

// Storage configuration
// Defines data persistence settings
#StorageConfig: {
	// Database settings
	database: {
		// Database path
		path: string

		// WAL mode enabled
		walMode: bool

		// Cache size in pages
		cacheSize: int
	}

	// Backup settings
	backup: {
		// Enable automatic backups
		enabled: bool

		// Backup directory
		directory: string

		// Backup retention in days (1-365)
		retentionDays: int & >=1 & <=365

		// Backup interval in hours
		intervalHours: int
	}
}

// Alerting configuration
// Defines notification and alerting settings
#AlertingConfig: {
	// Enable alerting
	enabled: bool

	// Evaluation interval in seconds (minimum 10s)
	evaluationIntervalSeconds: int & >=10

	// Suppression period in minutes after alert
	suppressionMinutes: int & >=0

	// Alert notification channels
	channels: {
		// Telegram channel configuration
		telegram: #TelegramChannelConfig

		// Email channel configuration (optional)
		email?: #EmailChannelConfig
	}
}

// Telegram alerting channel configuration
#TelegramChannelConfig: {
	// Enable Telegram alerts
	enabled: bool

	// Alert severity levels (must include all: CRITICAL, ERROR, WARN, INFO)
	severity: ["CRITICAL", "ERROR", "WARN", "INFO"]

	// Send immediate notifications
	immediate: bool
}

// Email alerting channel configuration
#EmailChannelConfig: {
	// Enable email alerts
	enabled: bool

	// Alert severity levels (must include all: CRITICAL, ERROR, WARN, INFO)
	severity: ["CRITICAL", "ERROR", "WARN", "INFO"]

	// Enable digest emails
	digest: bool

	// Digest interval in minutes
	digestIntervalMinutes: int
}
