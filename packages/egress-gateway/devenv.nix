{ pkgs, lib, config, ... }:
{
  # Import shared configuration for common packages, env vars, and scripts
  imports = [
    ../shared/devenv.nix
  ];

  # Go toolchain - Egress Gateway implementation
  languages.go = {
    enable = true;
    package = pkgs.go_1_25;
    version = "1.25.6";
  };

  # Environment variables specific to egress gateway
  env = {
    EGRESS_GATEWAY_PORT = "3001";
    EGRESS_SOCKET_PATH = "/tmp/openkraken-egress.sock";
  };

  # Development scripts - override shared defaults for Go-specific commands
  scripts = {
    build.exec = lib.mkForce "go build -o ../../bin/egress-gateway ./src";
    test.exec = lib.mkForce "go test ./...";
    run.exec = lib.mkForce "go run ./src";
  };

  # Egress gateway process definition
  processes.egress-gateway = {
    exec = "go run ./src";
    cwd = "packages/egress-gateway";
  };
}
