# OpenKraken Cross-Language Build Coordination
# Coordinates TypeScript/Bun orchestrator with Go egress-gateway

# Configuration variables
BIN_DIR := "bin"
ORCHESTRATOR_DIR := "packages/orchestrator"
EGRESS_GATEWAY_DIR := "packages/egress-gateway"
ORCHESTRATOR_BINARY := BIN_DIR / "openkraken"
EGRESS_GATEWAY_BINARY := BIN_DIR / "egress-gateway"

# Default recipe - show available tasks
default:
    @echo "OpenKraken Build System"
    @echo ""
    @echo "Available recipes:"
    @just --list

# Build all packages
build: build-orchestrator build-egress-gateway
    @echo "Build complete - binaries in /bin/"

# Build orchestrator (TypeScript/Bun)
build-orchestrator:
    @echo "Building orchestrator..."
    mkdir -p {{BIN_DIR}}
    cd {{ORCHESTRATOR_DIR}} && bun build --compile --outfile ../../bin/openkraken
    @echo "Orchestrator built: {{ORCHESTRATOR_BINARY}}"

# Build egress-gateway (Go)
build-egress-gateway:
    @echo "Building egress-gateway..."
    mkdir -p {{BIN_DIR}}
    cd {{EGRESS_GATEWAY_DIR}} && go build -o ../../bin/egress-gateway ./src
    @echo "Egress gateway built: {{EGRESS_GATEWAY_BINARY}}"

# Test all packages
test: test-orchestrator test-egress-gateway
    @echo "All tests passed"

# Test orchestrator
test-orchestrator:
    @echo "Running orchestrator tests..."
    cd {{ORCHESTRATOR_DIR}} && bun test

# Test egress-gateway
test-egress-gateway:
    @echo "Running egress-gateway tests..."
    cd {{EGRESS_GATEWAY_DIR}} && go test ./...

# Lint all packages
lint: lint-orchestrator lint-egress-gateway
    @echo "All linting passed"

# Lint orchestrator
lint-orchestrator:
    @echo "Linting orchestrator..."
    cd {{ORCHESTRATOR_DIR}} && biome lint src/

# Lint egress-gateway
lint-egress-gateway:
    @echo "Linting egress-gateway..."
    cd {{EGRESS_GATEWAY_DIR}} && go vet ./...

# Clean all build artifacts
clean:
    @echo "Cleaning build artifacts..."
    rm -rf {{BIN_DIR}}
    @echo "Clean complete"

# Build and verify binaries exist
build-verified: build
    @echo "Verifying build outputs..."
    if [ ! -f "{{ORCHESTRATOR_BINARY}}" ]; then \
        echo "Error: Orchestrator binary not found: {{ORCHESTRATOR_BINARY}}"; \
        exit 1; \
    fi
    if [ ! -f "{{EGRESS_GATEWAY_BINARY}}" ]; then \
        echo "Error: Egress gateway binary not found: {{EGRESS_GATEWAY_BINARY}}"; \
        exit 1; \
    fi
    @echo "Build verification passed"
    @echo "Binaries:"
    ls -lh {{ORCHESTRATOR_BINARY}} {{EGRESS_GATEWAY_BINARY}}

# Show build information
info:
    @echo "OpenKraken Build Configuration"
    @echo "=============================="
    @echo "Bin Directory: {{BIN_DIR}}"
    @echo "Orchestrator: {{ORCHESTRATOR_DIR}} -> {{ORCHESTRATOR_BINARY}}"
    @echo "Egress Gateway: {{EGRESS_GATEWAY_DIR}} -> {{EGRESS_GATEWAY_BINARY}}"