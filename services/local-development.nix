{ pkgs, lib, config, ... }:

{
  # Local development processes configuration
  # This file defines development services for the local environment
  # In production, these would be managed by systemd (Linux) or launchd (macOS)

  # Define processes for devenv process management
  # Startup order is coordinated through task dependencies

  processes = {
    egress-gateway = {
      exec = "go run ./src";
      cwd = "packages/egress-gateway";
    };

    orchestrator = {
      exec = "bun run src/main.ts";
      cwd = "packages/orchestrator";
    };
  };

  # Coordination tasks to ensure proper startup order
  # egress-gateway must start before orchestrator

  # Task that starts egress-gateway first
  tasks."start:egress-gateway" = {
    exec = ''
      echo "Starting egress-gateway..."
    '';
  };

  # Wait for egress-gateway to be ready before starting orchestrator
  tasks."wait:egress-gateway" = {
    exec = ''
      echo "Waiting for egress-gateway to be ready..."
      wait_for_port 3001 || exit 1
      echo "Egress-gateway is ready on port 3001"
    '';
    after = [ "devenv:processes:egress-gateway" ];
  };

  # Orchestrator startup task - depends on egress-gateway being ready
  tasks."start:orchestrator" = {
    exec = ''
      echo "Starting orchestrator..."
    '';
    after = [ "wait:egress-gateway" ];
    before = [ "devenv:processes:orchestrator" ];
  };

  # Convenience script for starting development environment with proper order
  scripts.dev-server.exec = ''
    echo "Starting OpenKraken development environment..."
    echo "1. Starting egress-gateway (port 3001)..."
    devenv processes run egress-gateway &
    GATEWAY_PID=$!
    
    echo "Waiting for egress-gateway to be ready..."
    wait_for_port 3001 || { kill $GATEWAY_PID 2>/dev/null; exit 1; }
    echo "Egress-gateway is ready"
    
    echo "2. Starting orchestrator (port 3000)..."
    devenv processes run orchestrator
    
    # Cleanup on exit
    trap "kill $GATEWAY_PID 2>/dev/null" EXIT
    echo "Both services are running. Press Ctrl+C to stop."
  '';
}
