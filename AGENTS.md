# AGENTS.md: Project Context for AI Collaborators

You are working on a project called **OpenKraken**—a deterministic, security-first agentic runtime. This document provides context to help you understand what we're building, where we are in the process, and how to contribute effectively. Read this before making architectural decisions or writing code.

## Project Status: Planning Phase (Measure Thrice)

As of your current moment, this project is in the **architectural planning phase**. We are not building yet. We are designing, investigating, questioning, and documenting. The guiding principle is "measure thrice, cut once"—this project prioritizes precision over speed because we are building security-critical infrastructure that must not fail once deployed.

The architecture document (ARCHITECTURE.md) is a living document that evolves as we investigate technologies, clarify requirements, and refine our understanding. It is not a specification frozen in amber. It is a living record of our current best understanding, and it should be updated as you discover new information or identify gaps.

**What this means for you:**
- Do not write production code unless explicitly asked
- Do investigate technologies thoroughly before recommending them
- Do question assumptions and challenge claims
- Do update documentation when you learn something that contradicts or supplements it
- Do not assume previous decisions are immutable—bring concerns forward

## The Core Mission

OpenKraken is a personal AI agent runtime designed for single-tenant, owner-operated deployment. The fundamental goal is **deterministic safety**: preventing the agent from breaking rules through architectural enforcement, not through prompts that hope the agent will behave.

We reject the "probabilistic safety" model that pervades agent frameworks—trusting the AI to follow rules through clever prompting. We build systems where the agent physically cannot violate constraints, regardless of how it is prompted or what inputs it receives.

## Key Architectural Commitments

These commitments have been made after investigation and debate. They represent decisions that would require significant justification to change.

**First Commitment: Anthropic Sandbox Runtime for Isolation**

We delegate process isolation to Anthropic's production-tested Sandbox Runtime rather than building custom sandboxing. On Linux, this uses bubblewrap. On macOS, it uses sandbox-exec (Seatbelt). The runtime provides a unified configuration interface while handling platform-specific details internally.

**Second Commitment: Bun for the Orchestrator Runtime**

The Orchestrator runs on Bun, not Node.js. This decision was made after evaluating Bun's maturity, Node.js compatibility (~95% API coverage), and performance characteristics. If you encounter Bun compatibility issues with a required package, this is a significant finding worth documenting.

**Third Commitment: LangChain.js for Agent Orchestration**

The agent loop uses LangChain.js v1 and LangGraph.js for stateful workflow management. We use @langchain/mcp-adapters for Model Context Protocol integration. The ecosystem is active and production-ready—verify package versions before implementing, as the ecosystem evolves.

**Fourth Commitment: SQLite for All Persistent State**

State persistence uses SQLite with Write-Ahead Logging (WAL) mode. This includes LangGraph checkpoints, message logs, semantic memory, and observability logs. The architecture consolidates on SQLite for consistency and durability.

**Fifth Commitment: Custom OpenTelemetry Implementation**

LangChain.js does not have native OpenTelemetry integration—it uses LangSmith for tracing. We implement a custom OpenTelemetry callback handler that intercepts agent lifecycle events and emits telemetry in a canonical format. This can export to OTLP collectors, LangSmith, or SQLite.

## What We Are NOT Building

Understanding scope boundaries helps you recognize when a request is out of scope.

**We are not building multi-tenant infrastructure.** This is a single-user, single-instance system. No user isolation, no RBAC, no shared hosting considerations.

**We are not building a general-purpose agent framework.** This is a personal assistant, optimized for one person's workflow, one device, one set of credentials.

**We are not building a container orchestration platform.** We use lightweight OS-native sandboxing (bubblewrap, Seatbelt), not Docker, Kubernetes, or Firecracker.

**We are not building a new observability backend.** We emit telemetry in standard formats (OTLP, Prometheus) that integrate with existing backends.

**We are not building custom security infrastructure where battle-tested solutions exist.** We integrate with proven components (Anthropic Sandbox Runtime, grammY for Telegram, etc.) and only implement custom logic where necessary.

## The Three Roles

Understanding who does what helps you understand constraints.

**Project:** The framework authors (us). Defines platform skills, default policies, and security constraints. The Project defines the Constitution (SOUL.md, SAFETY.md)—development concerns that evolve continuously and define the Agent's identity and safety constraints. The Project is the authority on how the system works.

**Owner:** The person running an instance. Provisions credentials, configures integrations, uploads personal skills, interacts with the Agent. In a single-tenant system, the Owner is the only human in the loop.

**Agent:** The LLM-driven runtime operating inside the sandbox. A managed subsystem, not a peer. The Agent has no awareness of the underlying platform, no access to credentials, and no ability to modify its own constraints.

## Core Philosophies You Should Know

These philosophies shape every decision. When you are unsure whether a proposed change aligns with the project, reference these principles.

**Trust the Sandbox, Not the Model.** Safety is enforced by the sandbox and tool-level validation, not by the System Prompt.

**Build on Proven Foundations.** Integrate battle-tested solutions for security-critical infrastructure. Implement custom logic only for Orchestrator-specific concerns.

**Everything is Middleware.** Agent capabilities—scheduling, web search, sub-agent orchestration, memory, skills, MCP integration, observability—are implemented as composable LangChain extensions. No privileged internal mechanisms exist that custom extensions cannot replicate.

**Observable by Default.** Complete visibility into Agent behavior for debugging, audit, and optimization. The Owner must be able to understand everything the Agent did and why.

**Credential Isolation.** Credentials live in OS-level vaults (Keychain, secret-service), never exposed to the Agent or written to persistent storage beyond runtime memory.

## Important Distinctions for Your Work

**Callbacks versus Middleware**

LangChain.js distinguishes between callback handlers (passive observability) and middleware (active execution modification). This distinction matters for understanding where different concerns belong.

Callback handlers observe and record without modifying behavior. They intercept LLM calls, tool invocations, and chain executions, emitting telemetry. They can stack in any order since they don't interfere with each other. Examples include the Logger Callback Handler, OpenTelemetry Callback Handler, and Content Scanning Callback Handler.

Middleware provides active modification of the agent's execution flow. It can transform inputs, inject context, or interrupt execution. Later middleware operates on the outputs of earlier middleware, so order matters. Examples include Policy Middleware, Memory Middleware, and Human-in-the-Loop Middleware.

When you are adding new capabilities, consider whether they belong as callbacks (passive observation) or middleware (active modification).

**Platform Abstraction is the Orchestrator's Job**

The architecture claims the sandbox presents "identical filesystem semantics" across Linux and macOS. This is true from the Owner's perspective, but the mechanisms differ. Bubblewrap on Linux operates on literal paths without glob support. Seatbelt profiles on macOS support glob patterns.

The Orchestrator normalizes all paths to canonical format before sandbox configuration. It performs path validation against allowed zones and resolves paths to absolute, literal form. This ensures the sandbox receives consistent instructions regardless of platform.

If you are adding platform-specific behavior, consider whether it should be handled by the Orchestrator (platform abstraction layer) or whether it belongs in platform-specific configuration files.

**CredentialVault is an Abstraction, Not a Concrete Implementation**

The architecture describes a CredentialVault abstraction that provides a unified interface across platforms. On macOS, this uses the Keychain Services API. On Linux, this uses the secret-service API (compatible with GNOME Keyring, KWallet, or pass).

If you are implementing credential handling, you are implementing against an interface, not writing platform-specific code directly. The abstraction ensures the Orchestrator remains portable across platforms.

### Architectural Layers

OpenKraken's architecture is organized into layers. See ARCHITECTURE.md Section 2 for the authoritative layer definitions and C4 container diagram.

**Quick Reference:**
- **Layer -1:** Platform Manager — Nix-based provisioning and deployment automation
- **Layer 0:** Host — The host system (Linux or macOS)
- **Layer 1:** Sandbox — Anthropic Sandbox Runtime (Agent runs inside)
- **Layer 2:** Middleware Stack — LangChain middleware extensions
- **Layer 3:** Orchestrator — Bun/TypeScript orchestration layer

> **For details:** See Architecture.md Section "Architectural Entities" and "Container Components"

---

### Terminology Evolution: Gateway vs Orchestrator

Following architectural evolution in v0.13.0, terminology was updated to clarify component responsibilities across the codebase:

| Historical Name | Current Name | Scope | Context |
|----------------|--------------|-------|---------|
| Gateway | Orchestrator | Agent orchestration layer | Bun/TypeScript runtime managing LangChain/LangGraph agents. Renamed from "Gateway" in v0.13.0. |
| Gateway | Egress Gateway | Network proxy layer | Go binary enforcing domain allowlisting (independent process). Always refers to network proxy. |

**Migration Note:** Older documentation (pre-v0.13.0) may use "Gateway" ambiguously to refer to either the Orchestrator or Egress Gateway based on context. When reading older sections:

- References to "Gateway managing agent threads" → Orchestrator
- References to "Gateway network filtering" → Egress Gateway
- References to "Gateway HTTP server" → Usually Orchestrator, could be either

Newer documentation (v0.13.0+) uses precise terminology consistently. If you encounter ambiguous "Gateway" references in code comments or older sections, ask for clarification rather than assume.

## Key Files and Their Purposes

**Architecture.md** (this project's technical blueprint)

The authoritative source for architectural decisions. Read this before proposing changes. It describes what we are building, why we are building it that way, and what constraints shape our choices.

**CHANGELOG.md** (recent evolution of the architecture)

Records recent architectural changes with context. Useful for understanding why decisions were made and when. The version number (currently v0.13.0) indicates the architecture's maturity.

**SOUL.md** (development concern: Agent identity and values)

Defines the Agent's core identity, values, and behavioral guidelines. This file is injected directly into the Agent's system prompt at runtime. It is never materialized in the sandbox filesystem. SOUL.md evolves continuously as a development concern.

**SAFETY.md** (development concern: Safety constraints)

Defines the specific safety constraints that govern Agent behavior. Works in conjunction with SOUL.md to define what the Agent can and cannot do. SAFETY.md evolves continuously as a development concern.

**AGENTS.md** (this file: guidance for AI collaborators)

Your guide to understanding the project context, current state, and guiding principles. Read this when you arrive to understand what we are doing and how we work.

## How to Approach Your Work

When you are asked to work on this project, follow this approach.

**First, orient yourself.** Read AGENTS.md for context. Read the relevant sections of ARCHITECTURE.md to understand the component you are working on. Check CHANGELOG.md to see recent changes and current version.

**Second, investigate before implementing.** If you are evaluating a technology, verify its current status, maintenance, and compatibility with our stack. Use the Librarian CLI to explore official documentation. Do not assume your training data is current—the technology landscape evolves faster than my weights.

**Third, question assumptions.** If a requirement seems to conflict with our core philosophies, raise the concern. If a technology claim seems outdated, verify it. If a constraint seems arbitrary, ask about its origin.

**Fourth, update documentation.** If you discover something that contradicts the architecture, update it. If you clarify a vague section, make it precise. If you implement something new, document it. The architecture is a living document—treat it as such.

**Fifth, write prose, not code.** Architecture documentation describes what and why, not how at the code level. Implementation details belong in code, not in this document. When in doubt, describe the concept and its constraints rather than providing implementation.

## Communication Patterns

When you interact with this project, you may be asked to perform different types of work.

**Investigation:** You may be asked to research a technology, verify a claim, or understand how a component works. In these cases, your output should be a thorough analysis with clear conclusions and citations to sources.

**Architecture Review:** You may be asked to review proposed changes or evaluate alternatives. In these cases, your output should identify risks, clarify assumptions, and propose improvements while respecting the core mission.

**Implementation:** You may be asked to implement a feature. In this planning phase, this is rare—focus on investigation and documentation instead.

**Documentation:** You may be asked to clarify, expand, or correct documentation. In this case, your output should be precise, consistent with existing content, and grounded in the project's core philosophies.

## What to Do When You Are Uncertain

You will encounter situations where requirements are unclear, decisions seem inconsistent, or the right approach is not obvious. Here is how to handle uncertainty.

**If requirements are unclear, ask.** It is better to clarify upfront than to implement the wrong thing. Request specificity about what is needed and why.

**If decisions seem inconsistent, document the tension.** The architecture may contain intentional tradeoffs or historical decisions that no longer apply. Point out inconsistencies and recommend resolution.

**If the right approach is unclear, propose alternatives.** Present multiple options with tradeoffs, let stakeholders choose, and document the decision and its rationale.

**If you cannot verify a claim, flag it.** If the architecture makes a claim you cannot verify (e.g., "X technology supports Y feature"), note this uncertainty and recommend verification steps.

## A Note on This Document

AGENTS.md is itself a living document. As the project evolves, this guidance should evolve with it. When you discover patterns in how you work, when you identify common sources of confusion, or when you find yourself repeating explanations, consider updating this document to capture that learning.

The goal is that future instances of you arrive with enough context to be immediately productive, without needing to reverse-engineer decisions or rediscover conclusions that have already been reached.

---

This document was created during the v0.13.0 architecture revision to capture project context and guidance for AI collaborators. Read it, update it, and use it to ensure your work aligns with the project's mission and principles.

---

## PRD Boundaries: The No-Tech Rule

The Product Requirements Document (PRD.md) must remain technology-agnostic. It describes **what** the system does for the Owner, never **how** it is implemented. This section defines the boundary between PRD (business requirements), Architecture.md (design decisions), and TechSpec.md (implementation specifics).

### The Principle of Abstraction

Per Marty Cagan's "Inspired" framework, requirements must be timeless. Technology changes, but business intent endures. The PRD answers: *"What capability must the Owner have?"* not *"What technology will we use?"*

**Violations to Reject:**
- Specific programming languages ("Bun", "Node.js", "TypeScript", "Python")
- Framework names ("LangChain.js", "LangGraph.js", "React", " grammY")
- Protocol acronyms in requirements ("MCP", "OTLP", "HTTP CONNECT", "WebSocket")
- Database technologies ("SQLite", "PostgreSQL", "WAL mode")
- Infrastructure tools ("Nix", "Docker", "Kubernetes", "bubblewrap", "Seatbelt")
- OS-specific mechanisms ("Keychain", "secret-service", "macOS", "Linux")
- File paths ("/sandbox/", "~/.config/")
- Environment variables ("OPENKRAKEN_ENV")
- Technical implementation patterns ("middleware", "callbacks", "system prompt")

### Layer Responsibilities

| Document | Contains | Does NOT Contain |
|----------|----------|------------------|
| **PRD.md** | Business capabilities, user stories, constraints, success metrics | Technology names, implementation patterns, file paths |
| **Architecture.md** | Design patterns, component relationships, technology choices | Code-level details, version numbers, API signatures |
| **TechSpec.md** | Concrete versions, API contracts, configuration schemas | Business rationale, user personas, value propositions |

### Requirement Quality Standards

**Good (What-focused):**
> "The System shall provide integration adapters for external messaging services"

**Bad (How-focused):**
> "The System shall provide Model Context Protocol (MCP) adapters via @langchain/mcp-adapters"

**Good:**
> "The System shall isolate Agent execution within an isolation environment"

**Bad:**
> "The System shall isolate Agent execution using bubblewrap on Linux and Seatbelt on macOS"

**Good:**
> "The System shall store all credentials in platform-native secure credential stores"

**Bad:**
> "The System shall store all credentials in OS-level vaults (Keychain on macOS, secret-service on Linux)"

### Ubiquitous Language Constraints

Glossary definitions in the PRD must describe **business concepts**, not technical implementations:

- **Orchestrator:** "The orchestration layer that manages agent execution lifecycle" ✓  
  NOT "The Bun/TypeScript orchestration layer" ✗

- **Sandbox:** "The isolation environment where the Agent executes" ✓  
  NOT "The isolation environment rooted at /sandbox/ using bubblewrap/Seatbelt" ✗

- **Middleware:** "Extension points that intercept Agent operations" ✓  
  NOT "LangChain API extension points" ✗

### Diagram Constraints

**C4 Context Diagram:**
- Use business terminology for external systems ("Integration Services" not "MCP Servers")
- Avoid technology stereotypes (<<extension point>> not <<LangChain API>>)
- Declare all referenced systems (CLI, Web UI must be declared before use)

**Domain Model:**
- No type annotations on attributes (`+id` not `+string id`)
- Business method names only (`+interceptAgentCall()` not `+handleLLMCall()`)
- No implementation frameworks in stereotypes

### Appendix Is the Exception

Technology preferences belong **only** in the Appendix section labeled "User Context" or "Operator Preferences". These are noted for architectural reference but do not constrain the requirements.

### When in Doubt

Ask: *"Would this requirement still be valid if we changed the underlying technology?"*

- If yes → It belongs in the PRD
- If no → It belongs in Architecture.md or TechSpec.md

### Enforcement

Any edit to PRD.md must be validated against these boundaries. If you encounter technical terms in requirements:
1. Remove the technology reference
2. Elevate to business language
3. Move specific details to the appropriate technical document
4. Update the Appendix if this represents a new technology preference

**Remember:** The PRD is the contract between business intent and technical implementation. It must remain stable even as technologies evolve.

---

## Architecture Boundaries: The Category Rule

While the PRD must remain entirely technology-agnostic, Architecture.md occupies the **logical layer**—it bridges abstract requirements to concrete systems. This section defines what belongs at the architectural level versus implementation details that belong in TechSpec.md.

### The Principle of Logical Specificity

Per Eric Evans' *Domain-Driven Design*, the Solution Architect must define the **category** of mechanism required. The PRD says "Persistence"; Architecture.md says "Relational Database" or "Document Store"; TechSpec.md says "SQLite 3.45.1 with WAL mode enabled."

**This is the key distinction:** Architecture.md names technology **categories**, not **instances**.

| Level | Example | Belongs In |
|-------|---------|------------|
| **Category** | "JavaScript runtime", "Sandboxing runtime", "Relational database" | ✓ Architecture.md |
| **Instance** | "Bun 1.3.8", "Anthropic Sandbox Runtime 0.0.35", "SQLite" | ✗ TechSpec.md |
| **Configuration** | "WAL mode", "Write-ahead log", "Connection pooling" | ✗ TechSpec.md |

### What Architecture.md CAN Contain

**Appropriate technology declarations:**
- **Orchestrator:** "Implemented as a JavaScript runtime" ✓
- **Database:** "Relational database with write-ahead logging" ✓
- **Sandbox:** "Sandboxing runtime providing OS-native isolation" ✓
- **Egress Gateway:** "Compiled binary implementing HTTP CONNECT proxy" ✓

**Appropriate architectural patterns:**
- "Layered Modular Monolith with Eventual Consistency"
- "Unix domain socket for local IPC"
- "Circuit breaker pattern for external service calls"

### What Architecture.md MUST NOT Contain

**Implementation specifics to move to TechSpec.md:**
- Version numbers ("v1.2.3", "0.0.x")
- Specific library names ("@langchain/mcp-adapters", "grammY")
- OS-specific mechanisms ("bubblewrap", "Seatbelt", "Keychain", "secret-service")
- File paths ("/run/openkraken/egress.sock", "~/.config/")
- Environment variables ("OPENKRAKEN_ENV", "HTTP_PROXY")
- API signatures ("POST /api/v1/allowlist/add")
- Concrete protocol versions ("HTTP/2", "gRPC 1.50")

**Anti-pattern examples:**
- "Implemented as Bun 1.3.8 with TypeScript 5.9.3" ✗
- "Uses bubblewrap on Linux and Seatbelt on macOS" ✗
- "Socket created at /run/openkraken/egress.sock" ✗

### The Vendor Agnosticism Mandate

Architecture.md must remain **vendor agnostic** to preserve optionality. We specify:
- "Relational Database" not "PostgreSQL"
- "Message Queue" not "RabbitMQ"
- "Object Storage" not "AWS S3"
- "Sandboxing Runtime" not "Anthropic Sandbox Runtime"

This keeps the architecture document focused on **structural decisions** rather than **procurement decisions**. Vendor selection belongs in TechSpec.md or ADRs.

### The "Why" Behind Layer Separation

**Maintainability:** When SQLite 4.0 releases, TechSpec.md updates. When we decide to switch from SQLite to PostgreSQL, Architecture.md updates. The layer boundary localizes change.

**Vendor Independence:** Architecture.md describes the system as it could be built. TechSpec.md describes the system as it *is* built. This distinction preserves strategic flexibility.

**Verification:** An architecture document that names specific versions is unverifiable—it becomes a specification only valid at a single point in time. Categories are timeless; instances expire.

### When in Doubt (Architecture Edition)

Ask: *"Would this statement still be true if we swapped the underlying technology for an equivalent alternative?"*

- If yes ("We use a relational database") → It belongs in Architecture.md
- If no ("We use SQLite 3.45 with WAL mode") → It belongs in TechSpec.md

**The Test:** Could I replace "SQLite" with "PostgreSQL" without changing the architecture's validity? If the answer is yes, you are at the right level of abstraction.

### Cross-Reference Discipline

Architecture.md contains explicit references to TechSpec.md for implementation details:

> "See [TechSpec.md Section 1.1](TechSpec.md) for specific version specifications."

This pattern:
1. Keeps Architecture.md clean and stable
2. Guides readers to implementation specifics when needed
3. Creates traceability between design and implementation
4. Prevents drift—when versions change, only TechSpec.md updates

### Common Confusion: Architecture vs Implementation

**Scenario:** Documenting the Checkpointer

- **PRD:** "The system shall persist agent state across restarts" (business requirement)
- **Architecture.md:** "State persistence uses a relational database with write-ahead logging for durability" (design pattern + technology category)
- **TechSpec.md:** "SQLite 3.45.1 with WAL mode, bun-sqlite-checkpointer v2.1.0, checkpoint schema v4" (implementation specifics)

**Key Insight:** Architecture.md explains *why* we chose a relational model (ACID guarantees, checkpoint recovery) and *what kind* of database (relational). TechSpec.md explains *which* database (SQLite) and *how* it's configured (WAL mode, schema version).

### Enforcement (Architecture Edition)

When editing Architecture.md, validate against these boundaries:

1. **Scan for version numbers** (\d+\.\d+\.\d+) → Move to TechSpec.md
2. **Scan for @ symbols** (npm package names) → Move to TechSpec.md
3. **Scan for file paths** (/home/, /var/, /run/) → Move to TechSpec.md
4. **Scan for OS-specific terms** (bubblewrap, Seatbelt, Keychain) → Move to TechSpec.md or generalize
5. **Scan for protocol specifics** (HTTP/2, gRPC, WebSocket frames) → Move to TechSpec.md

**Remember:** Architecture.md is the structural blueprint. It answers *what kind of* system we are building, not *which* technologies we are using. Per Martin Fowler: *"Architecture is the set of decisions that are hard to change."* Vendor versions are easy to change; architectural patterns are not.

---

## TechSpec Boundaries: The Code Rule

TechSpec.md occupies the **physical layer**—it specifies concrete versions, API contracts, database schemas, and configuration schemas. However, it does not contain implementation code. This section defines the boundary between TechSpec.md (specification) and the actual codebase (implementation).

### The Principle of Specification Completeness

Per Robert C. Martin's *Clean Architecture*, specifications describe contracts that code must fulfill. TechSpec.md answers: *"What are the binding agreements?"* not *"How is the logic implemented?"*

**This is the key distinction:** TechSpec.md contains **contracts and constraints**, not **algorithms and business logic**.

| Level | Example | Belongs In |
|-------|---------|------------|
| **Contract** | "OpenAPI 3.0 YAML for `/v1/responses` endpoint" | ✓ TechSpec.md |
| **Schema** | "SQLite table `checkpoints` with columns (thread_id, checkpoint_id, checkpoint BLOB)" | ✓ TechSpec.md |
| **Configuration** | "Environment variable `OPENKRAKEN_ENV` accepts values: production, development" | ✓ TechSpec.md |
| **Algorithm** | "PII detection uses regex patterns for email, phone, credit card" | ✗ Code + Comments |
| **Business Logic** | "Skill approval workflow: analyze → approve → activate" | ✗ Code |
| **Implementation Pattern** | "Repository pattern with async/await" | ✗ Code Architecture |

### What TechSpec.md CAN Contain

**Appropriate specification elements:**
- **Version Specifications:** "Bun 1.3.8", "Go 1.25.6" ✓
- **API Contracts:** OpenAPI 3.0 YAML, request/response schemas ✓
- **Database Schemas:** ERDs, table definitions, type mappings ✓
- **Configuration Schemas:** YAML structure, environment variables, validation rules ✓
- **File Structures:** Project layout, directory conventions ✓
- **Interface Definitions:** Public API signatures (not implementation) ✓
- **Package Dependencies:** `package.json` dependencies with versions ✓

**Appropriate reference patterns:**
- "Uses `@langfuse/langchain` CallbackHandler (see Section 5.8)"
- "Database schema defined in Section 3.1"
- "Configuration file schema: `openkraken.yaml` (Section 6.2)"

### What TechSpec.md MUST NOT Contain

**Implementation code to keep in source files:**
- Actual function implementations (even "example" code)
- Algorithm details (regex patterns, parsing logic)
- Business rule implementations
- Internal helper functions
- Test implementations
- Build scripts and CI/CD pipelines
- Deployment manifests (these belong in `nix/` directory)

**Anti-pattern examples:**
- "The `validateEmail()` function uses `/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/`" ✗
- "Migration runner implementation:" followed by 50 lines of TypeScript ✗
- "Example usage:" followed by production-ready code ✗

### The "Why" Behind Specification Boundaries

**Maintainability:** When implementation details change (refactoring, optimization), TechSpec.md should remain stable. Only contracts and schemas should require updates.

**Single Source of Truth:** Code is the authoritative implementation. TechSpec describes what the code must do, but code describes how it does it. Duplication creates drift.

**Review Efficiency:** PR reviewers should verify TechSpec-to-code alignment. If TechSpec contains implementation, reviewers must check both specification and code—doubling cognitive load.

### The Deferred Implementation Pattern

When a specific implementation is not yet decided, use this pattern:

**❌ Wrong (vague placeholder):**
> "Implementation of the migration runner is deferred to development phase."

**✅ Correct (clear contract):**
> "Migration contract: Must support forward-only migrations with checksum verification. Implementation must use `bun:sqlite` transactions. See ADR-002 for durability requirements."

### When in Doubt (TechSpec Edition)

Ask: *"Would I need to update this if I refactored the implementation without changing behavior?"*

- If no (behavior changed) → It belongs in TechSpec.md
- If yes (implementation detail changed) → It belongs in code

**The Test:** Could I rewrite the implementation in a different programming style (functional vs OOP) without changing TechSpec.md? If yes, you're at the right level of abstraction.

### Cross-Reference Discipline

TechSpec.md contains explicit references to source code locations:

> "Implementation follows the pattern documented in `src/orchestrator/database/migrations/README.md`."

This pattern:
1. Keeps TechSpec.md focused on contracts
2. Guides implementers to detailed patterns
3. Prevents duplication between spec and code
4. Allows code to evolve independently

### Code-First Documentation

For complex algorithms, document in code:

```typescript
// In source file: src/orchestrator/pii/detector.ts
/**
 * PII Detection Algorithm
 * 
 * Detects and masks personally identifiable information in text.
 * 
 * Patterns detected:
 * - Email addresses (RFC 5322 compliant)
 * - Phone numbers (E.164 format)
 * - Credit card numbers (Luhn validation)
 * 
 * @see TechSpec.md Section 5.5 for middleware placement
 * @see ADR-005 for credential handling requirements
 */
export function detectPII(input: string): MaskedResult {
  // Implementation here...
}
```

**Remember:** TechSpec.md is the "Builder's Blueprint"—it describes the materials (versions), the interfaces (APIs), and the constraints (schemas), but the actual construction (code) happens in the source files. Per Robert C. Martin: *"The code is the truth, but the specification is the contract."*
