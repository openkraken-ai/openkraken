{ pkgs, lib, config, ... }:

let
  processComposeFile = ./process-compose.yml;
in
{
  # Local development processes configuration
  # This file defines development services for the local environment
  # In production, these would be managed by systemd (Linux) or launchd (macOS)

  # Reference the process-compose configuration file
  process.managers.process-compose.configFile = processComposeFile;

  # Process definitions would go here
  # Example:
  # processes.orchestrator.exec = "bun run src/main.ts";
  # processes.egress-gateway.exec = "go run cmd/server.go";

  # For now, no processes are defined - this satisfies the process-compose requirement
  # while allowing devenv to function without actual service definitions
}
