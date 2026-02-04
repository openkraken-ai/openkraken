# Architecture.md: Logical System Blueprint for RealClaw

## 1. Architectural Strategy

### The Pattern: Layered Modular Monolith with Strict Boundary Enforcement

RealClaw adopts a **Layered Modular Monolith** architecture that enforces strict boundaries between concern domains while maintaining deployment simplicity appropriate for single-tenant operation. This pattern was selected over microservices or serverless alternatives for three compelling reasons rooted in the PRD's non-functional constraints.

**First**, the single-tenant deployment model eliminates the operational complexity that justifies microservices decomposition. The system serves exactly one Owner per instance with no user isolation requirements, meaning the throughput and scaling concerns that drive microservice adoption are irrelevant. A modular monolith provides the same separation of concerns without the distributed systems overhead of inter-service communication, distributed transactions, and independent deployment pipelines.

**Second**, the deterministic security requirement demands auditable data flow paths that are trivially traced in a monolith but become opaque across service boundaries. When the PRD mandates that "all credentials must be stored in OS-level vaults with no exceptions," the implementation verification is straightforward in a single process boundary. Distributed architectures introduce ambiguity about credential exposure during cross-service communication, requiring security theater that defeats the purpose.

**Third**, the cross-platform requirement (Linux and macOS) creates enough environmental variance without adding service distribution complexity. The architecture delegates platform abstraction to well-defined boundaries—the Platform Adapter and the Anthropic Sandbox Runtime—rather than distributing concerns across independently deployable services that must each handle platform differences.

### Justification: Why This Pattern Fits the PRD Constraints

The PRD explicitly rejects the "probabilistic safety" model prevalent in agent frameworks, demanding instead "architectural enforcement" that makes rule violations "physically impossible regardless of how the agent is prompted." This requirement maps directly to the Layered Modular Monolith's strength in providing clear, enforceable boundaries. The Gateway sits at the center of all data flows, acting as the mandatory intermediary through which every Agent action must pass. This creates a chokepoint where security policies can be enforced without relying on the Agent's compliance.

The availability requirement of "session continuity across Gateway restarts" is achieved through the Checkpointer's SQLite persistence with WAL mode, a pattern that requires shared filesystem access available in monolithic deployments but problematic across service boundaries. The checkpoint schema maintains conversation state and tool call sequences with rollback capability, enabling the Gateway to restore exact session state after any interruption.

The performance constraint of "sandbox invocation within 100ms" further favors monolithic deployment. Tool calls must traverse the Gateway-Sandbox RPC interface regardless of architecture, but adding service-to-service latency between Gateway components would violate the latency budget. The monolithic pattern keeps all Gateway components in the same process, eliminating network round-trips from the critical path.

---

## 2. System Containers (C4 Level 2)

The following containers constitute the deployable units of the RealClaw system. Each container has explicit responsibilities, well-defined boundaries, and documented communication protocols. Containers are organized by their architectural layer, with clear indication of which layer owns each component.

### Layer -1: Platform Manager

**Platform Manager**: Nix Flakes with NixOS and Nix Darwin modules — Generates platform-appropriate service definitions from unified configuration, manages atomic updates through generation switching, establishes credential boundaries between build-time and runtime, and orchestrates service lifecycle across Linux (systemd) and macOS (launchd). This layer operates below all application code, ensuring reproducibility and consistent deployment across platforms.

### Layer 0: The Host

**Credential Vault**: Platform-specific abstraction layer — Provides unified interface to OS-level credential storage, exposing `store(service, secret)`, `retrieve(service)`, and `rotate(service)` methods. On macOS, this layer integrates with Keychain Services API; on Linux, it interfaces with secret-service API (GNOME Keyring, KWallet, or pass). Credentials never leave runtime memory; the vault abstraction prevents any code path from writing secrets to filesystem, logs, or network connections.

**Egress Gateway**: Go or Rust binary implementing HTTP CONNECT proxy with domain allowlisting — Operates as independent system service bound to localhost only. Enforces strict allowlist-only network policy for all sandbox egress, logs every connection attempt with complete context (timestamp, destination, disposition, bytes transferred), and returns structured JSON errors for denied requests. Communicates with Orchestrator via HTTP over Unix domain socket.

### Layer 1: The Sandbox

**Sandbox Runtime**: Anthropic Sandbox Runtime (`@anthropic-ai/sandbox-runtime`) — Provides filesystem isolation through OS-native mechanisms (bubblewrap on Linux, sandbox-exec on macOS) and network isolation that routes all traffic through Egress Gateway. The Agent operates inside this boundary with no awareness of its existence. Sandbox configuration is platform-agnostic; the runtime handles translation to optimal native mechanisms.

### Layer 3: The Orchestrator

**Orchestrator**: Bun/TypeScript runtime managing LangChain/LangGraph execution — Central orchestration component owning session management, tool dispatch, prompt injection, and policy enforcement. Uses LangChain.js v1 `createAgent()` API as canonical entry point and LangGraph for stateful workflow management. Runs as Nix-managed service with independent lifecycle from Egress Gateway.

**Telegram Adapter**: grammY integration for Telegram Bot API — Primary interaction channel receiving Owner messages via webhook (cryptographically verified) and delivering Agent responses.

**MCP Adapter**: `@langchain/mcp-adapters` integration — Provides access to Model Context Protocol servers for Slack, Discord, email, calendar, and custom services.

**Checkpointer**: SQLite with WAL mode and LangGraph integration — Persists agent state across Orchestrator restarts using `SqliteCheckpointer`. Maintains checkpoint tables for conversation state and writes tables for metadata.

**Structured Logger**: SQLite-based logging subsystem with automatic rotation — Captures all Agent operations including tool invocations, model calls, and middleware execution.

**OpenTelemetry Handler**: Custom callback implementation for distributed tracing — Intercepts LLM calls, tool invocations, chain executions, and memory operations.

### Middleware Components

**Policy Middleware**: Foundational tier enforcing security boundaries — Validates terminal package requests against allowlist, gates delivery through content scanning, and enforces configured rate limits.

**Cron Middleware**: Detects scheduled task triggers and invokes Agent with scheduled context — Registers with host timer system and ensures at-least-once execution semantics.

**Web Search Middleware**: Provides web search tools through Gateway-mediated HTTP calls, routing requests through Egress Gateway for policy enforcement.

**Browser Middleware**: Provides browser automation tools, managing isolated browser profiles per session and routing traffic through Egress Gateway.

**Memory Middleware**: Manages three-tier recall system — Retrieves relevant memories before model calls using embedding-based retrieval and consolidates memories after agent completion.

**Skill Loader Middleware**: Injects skill manifests into Agent context based on task — Reads skill folders and loads SKILL.md content.

**Human-in-the-Loop Middleware**: Interrupts on configured operations for Owner approval via Telegram inline keyboards.

**Summarization Middleware**: Compresses older messages when context exceeds token thresholds to prevent context overflow.

---

## 3. Container Diagram (Mermaid C4Container)

```mermaid
C4Container
  title Container Diagram for RealClaw Runtime

  Person_Ext(Owner, "Owner", "Single human provisioning, configuring, and operating the instance")

  System_Boundary(realclaw_runtime, "RealClaw Runtime") {
    Container(orchestrator, "Orchestrator", "Bun/TypeScript", "Central orchestration: agent loop, tool dispatch, policy enforcement")
    ContainerDb(checkpointer, "Checkpointer", "SQLite + LangGraph", "State persistence: conversation, checkpoints, writes")
    ContainerDb(structured_log, "Structured Logger", "SQLite", "Audit trail: operations, errors, durations")
    Container(egress_gateway, "Egress Gateway", "Go/Rust Binary", "HTTP CONNECT proxy with domain allowlisting")
    Container(sandbox, "Sandbox Runtime", "Anthropic Sandbox Runtime", "Process isolation via bubblewrap/seatbelt")
    Container(credential_vault, "Credential Vault", "Platform Abstraction", "OS-level vaults: Keychain/secret-service")
    ContainerDb(memory_bank, "Memory Bank", "SQLite", "Semantic memories with embeddings")
    
    Container(telegram_adapter, "Telegram Adapter", "grammY", "Primary channel: webhook handling, response delivery")
    Container(mcp_adapter, "MCP Adapter", "@langchain/mcp-adapters", "Secondary channels: Slack, Discord, email, calendar")
  }

  System_Boundary(middleware_stack, "Middleware Stack") {
    Container(policy_mw, "Policy Middleware", "LangChain", "Security: package validation, content scanning, rate limits")
    Container(cron_mw, "Cron Middleware", "LangChain", "Scheduled task triggers")
    Container(web_mw, "Web Search Middleware", "LangChain", "Web search and fetch tools")
    Container(browser_mw, "Browser Middleware", "LangChain", "Browser automation with isolation")
    Container(memory_mw, "Memory Middleware", "LangChain", "Three-tier recall management")
    Container(skill_mw, "Skill Loader Middleware", "LangChain", "Skill manifest injection")
    Container(hitl_mw, "Human-in-the-Loop Middleware", "LangChain", "Owner approval interrupts")
    Container(summarize_mw, "Summarization Middleware", "LangChain", "Context compression")
  }

  System_Ext(telegram, "Telegram", "Primary interaction channel")
  System_Ext(mcp_servers, "MCP Servers", "Model Context Protocol services")
  System_Ext(llm_provider, "LLM Provider", "External language model")
  System_Ext(exa_api, "Exa API", "Web search service")
  System_Ext(otel_backend, "Observability Backend", "OTLP/LangSmith collector")

  Rel(Owner, CLI, "Configures, debugs, automates via")
  Rel(Owner, Web_UI, "Interacts, monitors via")
  Rel(Owner, Telegram, "Interacts via")

  Rel(Telegram, telegram_adapter, "Sends updates to (webhook)")
  Rel(telegram_adapter, orchestrator, "Routes messages to")

  Rel(orchestrator, policy_mw, "Chains through")
  Rel(policy_mw, cron_mw, "Middleware chain")
  Rel(cron_mw, web_mw, "Middleware chain")
  Rel(web_mw, browser_mw, "Middleware chain")
  Rel(browser_mw, memory_mw, "Middleware chain")
  Rel(memory_mw, skill_mw, "Middleware chain")
  Rel(skill_mw, hitl_mw, "Middleware chain")
  Rel(hitl_mw, summarize_mw, "Middleware chain")
  Rel(summarize_mw, orchestrator, "Completes middleware chain")

  Rel(orchestrator, checkpointer, "Persists state to")
  Rel(orchestrator, structured_log, "Emits audit records to")
  Rel(orchestrator, credential_vault, "Retrieves credentials from")
  Rel(orchestrator, egress_gateway, "Manages allowlist via RPC")
  Rel(orchestrator, sandbox, "Invokes command execution via")
  Rel(orchestrator, memory_bank, "Stores/retrieves memories via")

  Rel(sandbox, egress_gateway, "Routes all traffic through")
  Rel(sandbox, llm_provider, "Calls for intelligence")
  Rel(sandbox, exa_api, "Searches web via")

  Rel(orchestrator, mcp_adapter, "Connects to MCP servers")
  Rel(mcp_adapter, mcp_servers, "Integrates with external services")

  Rel(orchestrator, otel_backend, "Exports traces to")
```

---

## 4. Critical Execution Flows

### Flow 1: Interactive Conversation via Telegram

```mermaid
sequenceDiagram
  autonumber
  participant Owner as Owner
  participant Telegram as Telegram
  participant Adapter as Telegram Adapter
  participant Orchestrator as Orchestrator
  participant PolicyMW as Policy Middleware
  participant MemoryMW as Memory Middleware
  participant Agent as Agent
  participant Checkpointer as Checkpointer
  participant LLM as LLM Provider
  participant Scanner as Content Scanner
  participant Adapter2 as Telegram Adapter

  Note over Owner,LLM: Interactive conversation requires multiple round-trips
  
  Owner->>Telegram: Sends message "Check my calendar"
  Telegram->>Adapter: HTTP POST webhook (cryptographically signed)
  
  rect rgb(240, 248, 255)
    Note right of Adapter: Authentication Boundary
    Adapter->>Adapter: Verify Telegram signature
    Adapter->>Orchestrator: InvokeAgent(message, threadId)
  end
  
  Orchestrator->>PolicyMW: process(message)
  PolicyMW->>Checkpointer: Load session state (threadId)
  Checkpointer-->>PolicyMW: Session state
  
  PolicyMW->>MemoryMW: retrieveContext(message)
  MemoryMW->>Checkpointer: Query messages (threadId)
  Checkpointer-->>MemoryMW: Conversation history
  MemoryMW->>MemoryBank: Semantic search (embedding)
  MemoryBank-->>MemoryMW: Relevant memories
  MemoryMW-->>PolicyMW: Context bundle
  
  PolicyMW->>Orchestrator: Continue with context
  Orchestrator->>Agent: execute(systemPrompt, userMessage, context)
  
  Note over Agent: Agent reasoning occurs here
  Agent->>LLM: Claude API call (with injected SOUL.md)
  LLM-->>Agent: Reasoning + tool selection
  
  Agent->>Orchestrator: Tool call: get_calendar_events
  Orchestrator->>MCPAdapter: calendar.getEvents()
  MCPAdapter-->>LLM: Calendar data
  LLM-->>Agent: Analysis complete
  Agent->>Orchestrator: Final response
  Orchestrator->>Scanner: scan(response.content)
  
  rect rgb(255, 240, 245)
    Note right of Scanner: Content Security Boundary
    Scanner->>Scanner: Detect credentials, PII, violations
    Scanner-->>Orchestrator: Clean bill of health OR reject
  end
  
  Orchestrator->>Checkpointer: Save checkpoint (state, messages)
  Checkpointer-->>Orchestrator: Confirmed
  Orchestrator->>Adapter2: SendResponse(response)
  Adapter2->>Telegram: Delivers message to Owner
```

**Flow Analysis**: This sequence reveals several architectural commitments. The Policy Middleware sits at the entry point, meaning every conversation passes through security validation before Agent invocation. The Memory Middleware operates invisibly to the Agent—the Agent receives consolidated context but has no awareness of memory operations. The Content Scanner sits in the response path, ensuring no credential leak or policy violation reaches the Owner. Each checkpoint write blocks until confirmed, ensuring session continuity is not compromised by write failures.

### Flow 2: Terminal Command Execution in Sandbox

```mermaid
sequenceDiagram
  autonumber
  participant Agent as Agent
  participant Orchestrator as Orchestrator
  participant PolicyMW as Policy Middleware
  participant CredentialVault as Credential Vault
  participant EgressGW as Egress Gateway
  participant Sandbox as Sandbox Runtime
  participant Bash as Sandboxed Shell
  participant Checkpointer as Checkpointer

  Agent->>Orchestrator: Tool call: terminal.run("npm install")
  
  rect rgb(240, 248, 255)
    Note right of Orchestrator: Tool Dispatch Boundary
    Orchestrator->>PolicyMW: validateToolRequest("npm install")
    PolicyMW->>PolicyMW: Check package allowlist
    PolicyMW-->>Orchestrator: Approved OR Rejected
  end
  
  alt Package Allowed
    Orchestrator->>CredentialVault: retrieve("npm_token")
    CredentialVault-->>Orchestrator: Token (runtime memory only)
    
    rect rgb(255, 240, 245)
      Note right of Orchestrator: Egress Configuration Boundary
      Orchestrator->>EgressGW: POST /api/v1/allowlist/add ["registry.npmjs.org"]
      EgressGW-->>Orchestrator: Confirmed
    end
    
    Orchestrator->>Checkpointer: Log tool invocation (PRE)
    Checkpointer-->>Orchestrator: Recorded
    
    Orchestrator->>Sandbox: invoke(command="npm install", env={}, timeout=300s)
    
    rect rgb(240, 248, 255)
      Note right of Sandbox: Isolation Boundary
      Sandbox->>Sandbox: Configure bubblewrap/seatbelt
      Sandbox->>Sandbox: Mount zones: skills(ro), inputs(ro), work(rw), outputs(rw)
      Sandbox->>Sandbox: Route proxy: HTTP_PROXY, HTTPS_PROXY
      Sandbox->>Bash: exec("npm install")
    end
    
    Note over Bash,Registry: All network traffic routes through Egress Gateway
    Bash->>EgressGW: CONNECT registry.npmjs.org
    EgressGW->>EgressGW: Validate domain against allowlist
    EgressGW-->>Bash: Tunnel established
    
    Bashes-->>Sandbox: stdout/stderr streams
    Sandbox-->>Orchestrator: Exit code, output
    
    Orchestrator->>Checkpointer: Log tool completion (POST, exitCode)
    Checkpointer-->>Orchestrator: Recorded
    
    Orchestrator->>EgressGW: POST /api/v1/allowlist/remove ["registry.npmjs.org"]
    EgressGW-->>Orchestrator: Confirmed (reset to baseline)
    
    Orchestrator->>Agent: Tool result
    
  else Package Not Allowed
    Orchestrator->>Agent: Tool error: "Package not in allowlist"
  end
```

**Flow Analysis**: This flow exposes the defense-in-depth strategy. The package allowlist is checked before any resource allocation. The credential is retrieved from the vault and exists only in runtime memory—never written to environment variables. The Egress Gateway allowlist is explicitly modified to add the npm registry, used for the command duration, then removed. The Sandbox applies filesystem zones that prevent the command from accessing anything outside `/sandbox/work/`. Every action is logged before and after execution, enabling complete audit trails.

### Flow 3: Browser Automation with Network Enforcement

```mermaid
sequenceDiagram
  autonumber
  participant Agent as Agent
  participant Orchestrator as Orchestrator
  participant BrowserMW as Browser Middleware
  participant AgentBrowser as Vercel Agent Browser
  participant EgressGW as Egress Gateway
  participant Checkpointer as Checkpointer
  participant DomainAllowlist as Domain Allowlist

  Agent->>Orchestrator: Tool call: browser.navigate("https://docs.example.com")
  
  rect rgb(240, 248, 255)
    Note right of Orchestrator: Tool Validation Boundary
    Orchestrator->>BrowserMW: validateNavigation("docs.example.com")
    BrowserMW->>DomainAllowlist: Check if allowed
    DomainAllowlist-->>BrowserMW: ALLOWED or DENIED
  end
  
  alt Domain Allowed
    BrowserMW->>AgentBrowser: createSession(profile="thread-123")
    
    rect rgb(240, 248, 255)
      Note right of AgentBrowser: Browser Isolation Boundary
      AgentBrowser->>AgentBrowser: Create isolated profile
      AgentBrowser->>AgentBrowser: Configure proxy settings
      AgentBrowser->>EgressGW: CONNECT docs.example.com
    end
    
    EgressGW->>EgressGW: Validate domain against allowlist
    EgressGW-->>AgentBrowser: Tunnel established
    
    AgentBrowser-->>BrowserMW: Session created
    BrowserMW-->>Orchestrator: Confirmed
    
    Orchestrator->>Checkpointer: Log browser session start
    Checkpointer-->>Orchestrator: Recorded
    
    Orchestrator->>AgentBrowser: navigate("https://docs.example.com")
    
    Note over AgentBrowser,Target: All browser traffic routes through Egress Gateway
    AgentBrowser->>EgressGW: CONNECT docs.example.com
    EgressGW->>Target: Forward request
    Target-->>EgressGW: Response
    EgressGW-->>AgentBrowser: Tunneled response
    
    AgentBrowser-->>BrowserMW: Page snapshot
    BrowserMW->>Checkpointer: Log navigation completion
    Checkpointer-->>BrowserMW: Recorded
    
    BrowserMW-->>Orchestrator: Snapshot
    Orchestrator-->>Agent: Tool result
    
  else Domain Denied
    Orchestrator->>EgressGW: POST /api/v1/logs (blocked attempt)
    EgressGW-->>Orchestrator: Recorded
    Orchestrator->>Agent: Tool error: "Domain not in allowlist"
  end
  
  Note over AgentBrowser,Orchestrator: Session isolation ensures no cross-thread state leakage
  AgentBrowser->>Orchestrator: closeSession()
  Orchestrator->>Checkpointer: Log session closure
```

**Flow Analysis**: Browser automation presents unique risks because web content can contain malicious JavaScript attempting network connections, filesystem access, or credential theft. The architecture mitigates these risks through multiple layers. The domain allowlist is checked before navigation begins. The Agent Browser runs in an isolated profile per session, preventing state leakage between conversations. All browser traffic routes through the Egress Gateway, ensuring the same allowlist rules apply to browser-initiated connections as to command-line tools. Each navigation is logged for security audit.

---

## 5. Cross-Cutting Concerns

### 5.1 Authentication and Authorization

The RealClaw architecture implements a layered authentication and authorization model that reflects the single-tenant deployment context while maintaining strict security boundaries. Authentication establishes identity at system boundaries; authorization enforces capability boundaries at every layer.

**Telegram Webhook Authentication**: The Telegram Adapter receives updates via webhooks and cryptographically verifies each request using Telegram's secret token mechanism. Requests without valid signatures are rejected before any processing occurs. This prevents spoofing attacks where malicious actors attempt to inject messages into the conversation.

**Owner Authentication for CLI and Web UI**: Both interfaces require Owner authentication before granting access. The CLI uses token-based authentication where the Owner generates a token during initial setup and stores it in their shell environment. The Web UI uses session-based authentication with configurable token expiration.

**Agent Authorization Model**: The Agent operates under a capability-based authorization system where capabilities are granted by middleware rather than inherited from the Owner's identity. When the Agent attempts to invoke a tool, the Policy Middleware validates the request against configured policies. This separation means the Agent's effective permissions are a subset of the Owner's permissions, never a superset.

**Credential Access Authorization**: Credentials stored in the vault are accessed by the Orchestrator only when required for external service calls. The Agent has no direct credential access—any tool requiring credentials must be dispatched through the Orchestrator, which retrieves the credential from the vault, injects it into the appropriate context, and ensures the credential is never exposed to the Agent.

**Egress Gateway Authorization**: The Gateway communicates with the Egress Gateway over a Unix domain socket with restricted permissions (typically `gateway:gateway` ownership with `0600` permissions). The socket accepts only local connections from processes with appropriate credentials. Additionally, the Gateway's management API requires authenticated requests using an internal token.

### 5.2 Observability

The observability strategy in RealClaw addresses three distinct needs: operational visibility for system health monitoring, debugging support for troubleshooting Agent behavior, and security auditing for compliance and incident response.

**Structured Logging Architecture**: The Structured Logger captures all Agent operations with a canonical schema designed for queryability and retention management. Each log entry contains: timestamp in ISO8601 format with millisecond precision, requestId as a UUID that traces related operations, operationType from an enumerated set (tool_call, model_invoke, agent_turn, middleware_enter, middleware_exit), targetResource identifying the tool name or model identifier, arguments containing sanitized input (credentials and PII replaced with `[REDACTED]`), result containing output or error, durationMs for timing, and correlationId for tracing operations across middleware boundaries.

**Distributed Tracing Implementation**: The custom OpenTelemetry callback handler creates traces that follow operations from initial request through complete response delivery. Each trace consists of spans representing discrete operations: HTTP request handling, middleware processing, model invocations, tool calls, and response composition. The handler supports multiple export backends: OTLP collectors for enterprise environments, LangSmith for development debugging, and SQLite retention for audit purposes.

**Health and Metrics Endpoints**: The Gateway exposes standardized endpoints for operational monitoring. The `/health` endpoint returns HTTP 200 indicating the process is running. The `/ready` endpoint performs dependency checks (SQLite connectivity, MCP server availability, Egress Gateway responsiveness) and returns 200 only when all dependencies are healthy. The `/metrics` endpoint serves Prometheus-compatible metrics including HTTP request counts, tool invocation counts, and proxy dispositions.

### 5.3 Error Handling and Degradation

The architecture implements a comprehensive error handling strategy that ensures system safety under failure conditions while providing clear feedback.

**Graceful Degradation Patterns**: When external dependencies fail, the system degrades gracefully rather than catastrophically. If the LLM provider is unavailable, the Agent returns an error indicating the service is temporarily unavailable without crashing or corrupting state. If an MCP server fails, the system marks that integration as unavailable while continuing to serve other channels.

**Retry Policies with Exponential Backoff**: Transient failures in external services trigger automatic retries with exponential backoff. The retry policy applies to LLM API calls (up to 3 retries with 1s/2s/4s delays), MCP server connections (up to 2 retries with 500ms/1s delays), and Egress Gateway operations (up to 2 retries with 100ms/200ms delays).

**Circuit Breaker Integration**: The architecture implements circuit breakers for external services to prevent cascade failures during extended outages. When a service fails repeatedly (5 failures in a 60-second window), the circuit opens and subsequent requests fail immediately with a service-unavailable error.

---

## 6. Risks and Technical Debt

### High-Priority Risks

**Sandbox Runtime Maturity**: The Anthropic Sandbox Runtime (`@anthropic-ai/sandbox-runtime`) is currently version 0.0.35 and labeled "Beta Research Preview." While the project is actively maintained, the `0.x.y` versioning indicates potential breaking changes before 1.0.0. RealClaw pins to specific versions and monitors changelogs, but the dependency on an evolving runtime creates upgrade risk. A breaking change in the sandbox API could require significant Gateway adaptation.

**Egress Gateway Single Point of Failure**: The Egress Gateway is a mandatory chokepoint for all sandbox network traffic. If the Gateway crashes or becomes unresponsive, no sandboxed operation requiring network access can proceed. The current architecture does not include Gateway redundancy appropriate for high-availability requirements.

**Credential Vault Dependency**: The CredentialVault abstraction assumes OS-level vault availability. On Linux systems without a running secret-service daemon, credential retrieval will fail. The architecture does not currently include a fallback credential storage mechanism for environments without vault support.

### Medium-Priority Risks

**SQLite Concurrency Boundaries**: While the Checkpointer uses WAL mode for concurrent access, SQLite's single-writer model means heavy write loads (frequent checkpointing during rapid tool invocations) can create write starvation. The architecture does not currently implement write batching or prioritization.

**MCP Adapter State Management**: The MCP adapter maintains persistent connections to MCP servers. If an MCP server crashes, the adapter may hold stale connection state until connection timeout. The architecture does not implement proactive health checking of MCP connections.

**Cross-Platform Substrate Differences**: The architecture claims "identical Agent capability semantics" across Linux and macOS, but the underlying mechanisms differ significantly (bubblewrap bind mounts vs. Seatbelt profiles). Edge cases around symlink handling and violation detection differ between platforms.

### Technical Debt

**Manual Middleware Configuration**: The middleware stack is currently configured through code with explicit ordering. Adding new middleware requires code changes rather than configuration updates.

**Single-File Configuration Schema**: The unified configuration file is a single YAML document without schema validation. Configuration errors are discovered at runtime rather than at load time.

**Limited Integration Testing**: The current test coverage focuses on unit tests for individual components. Integration tests covering end-to-end flows are sparse, risking undetected component interaction failures.

**Documentation-Implementation Drift**: Without automated verification that implementation matches architecture, the document becomes a historical record rather than a specification.

---

## Appendix: Architectural Decision Log

| Decision | Rationale | Implications |
|----------|-----------|--------------|
| Modular Monolith over Microservices | Single-tenant deployment eliminates distributed systems benefits; monolithic deployment simplifies credential enforcement and tracing | No horizontal scaling capability; component boundaries must be maintained through discipline |
| SQLite for All Persistence | WAL mode provides durability and concurrency; single backend simplifies backup and recovery | Write-heavy workloads may require optimization; not appropriate for high-throughput scenarios |
| Egress Gateway as Separate Process | Separate trust boundary enables defense-in-depth; independent lifecycle prevents cascade failures | Adds latency to all network operations; requires process supervision |
| Unix Domain Socket for RPC | Provides authentication through filesystem permissions; avoids network exposure | Communication limited to same host; socket file must be protected |
| Callback-Based Observability | Minimal overhead on critical path; composable handlers | No automatic correlation—correlation IDs must be explicitly passed |