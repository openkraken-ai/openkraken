{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.services.openkraken;
in

{
  # INFRA-016: Sandbox Runtime dependencies
  # Per TechSpec §8.3: macOS uses sandbox-exec (built-in) for process isolation
  # Additional deps: ripgrep (dangerous file scanning)
  environment.systemPackages = mkIf cfg.enable (with pkgs; [
    ripgrep
  ]);

  options.services.openkraken = {
    enable = mkOption {
      type = types.bool;
      default = false;
      description = "Enable OpenKraken services";
    };

    orchestrator = {
      enable = mkOption {
        type = types.bool;
        default = false;
        description = "Enable OpenKraken Orchestrator service";
      };

      package = mkOption {
        type = types.package;
        description = "OpenKraken orchestrator package";
      };

      port = mkOption {
        type = types.port;
        default = 3000;
        description = "Orchestrator port";
      };

      dataDir = mkOption {
        type = types.path;
        default = "%h/Library/Application Support/Openkraken";
        defaultText = ''"%h/Library/Application Support/Openkraken"'';
        description = "Data directory for OpenKraken";
      };

      configDir = mkOption {
        type = types.path;
        default = "%h/Library/Application Support/Openkraken";
        defaultText = ''"%h/Library/Application Support/Openkraken"'';
        description = "Configuration directory for OpenKraken";
      };
    };

    gateway = {
      enable = mkOption {
        type = types.bool;
        default = false;
        description = "Enable OpenKraken Egress Gateway service";
      };

      package = mkOption {
        type = types.package;
        description = "OpenKraken gateway package";
      };

      port = mkOption {
        type = types.port;
        default = 3001;
        description = "Gateway port";
      };

      socketPath = mkOption {
        type = types.str;
        default = "/tmp/openkraken-egress.sock";
        description = "Unix socket path for gateway";
      };
    };
  };

  config = mkIf cfg.enable {
    launchd.user.agents.openkraken-orchestrator = mkIf cfg.orchestrator.enable {
      description = "OpenKraken Agent Orchestrator";
      serviceConfig = {
        Label = "com.openkraken.orchestrator";
        ProgramArguments = [ "${cfg.orchestrator.package}/bin/openkraken" ];
        RunAtLoad = true;
        KeepAlive = true;
        StandardOutPath = "/var/log/openkraken/orchestrator.log";
        StandardErrorPath = "/var/log/openkraken/orchestrator.err";
        EnvironmentVariables = {
          OPENKRAKEN_HOME = cfg.orchestrator.dataDir;
          OPENKRAKEN_CONFIG = "${cfg.orchestrator.configDir}/config.yaml";
          ORCHESTRATOR_PORT = toString cfg.orchestrator.port;
        };
      };
    };

    launchd.user.agents.openkraken-egress-gateway = mkIf cfg.gateway.enable {
      description = "OpenKraken Egress Gateway";
      serviceConfig = {
        Label = "com.openkraken.egress-gateway";
        ProgramArguments = [ "${cfg.gateway.package}/bin/egress-gateway" ];
        RunAtLoad = true;
        KeepAlive = true;
        StandardOutPath = "/var/log/openkraken/gateway.log";
        StandardErrorPath = "/var/log/openkraken/gateway.err";
        EnvironmentVariables = {
          OPENKRAKEN_CONFIG = "${cfg.orchestrator.configDir}/config.yaml";
          EGRESS_GATEWAY_PORT = toString cfg.gateway.port;
          EGRESS_SOCKET_PATH = cfg.gateway.socketPath;
        };
      };
    };

    environment.extraOutputsToInstall = [ "out" ] ++ optionals (cfg.orchestrator.enable || cfg.gateway.enable) [ ];

    # Create directories with proper permissions using system.paths
    # Per INFRA-014: Directory Permissions & Security
    system.paths = {
      createdDirectories = [
        # Data directory: 700 (owner only) - ~/Library/Application Support/Openkraken
        "%h/Library/Application Support/Openkraken"
        # Logs directory: 755 - ~/Library/Logs/Openkraken
        "%h/Library/Logs/Openkraken"
        # Cache directory: 755 - ~/Library/Caches/OpenKraken
        "%h/Library/Caches/OpenKraken"
        # Socket directory in /tmp
        "/tmp/openkraken"
        # INFRA-016: Sandbox zones - skills (read-only)
        "%h/Library/Application Support/Openkraken/skills"
        # INFRA-016: Sandbox zones - inputs (read-only)
        "%h/Library/Application Support/Openkraken/inputs"
        # INFRA-016: Sandbox zones - work (read-write, ephemeral)
        "%h/Library/Application Support/Openkraken/work"
        # INFRA-016: Sandbox zones - outputs (read-write, ephemeral)
        "%h/Library/Application Support/Openkraken/outputs"
      ];
    };

    # Set up proper permissions on directories using launchd InitData
    # This runs after directory creation to set correct permissions
    # Note: launchd doesn't expand ~ or $HOME in ProgramArguments, so we use shell expansion
    launchd.user.launchAgents = {
      # Create a helper agent to set permissions on first run
      "com.openkraken.setup-permissions" = mkIf (cfg.orchestrator.enable || cfg.gateway.enable) {
        description = "OpenKraken permissions setup";
        serviceConfig = {
          Label = "com.openkraken.setup-permissions";
          ProgramArguments = [
            "/bin/sh"
            "-c"
            ''
              # Set proper permissions on directories using shell expansion
              # Application Support (data/config): 700 (owner only)
              chmod 700 "$HOME/Library/Application Support/Openkraken"
              # Logs: 755 (readable by all, writable by owner)
              chmod 755 "$HOME/Library/Logs/Openkraken"
              # Caches: 755 (readable by all, writable by owner)
              chmod 755 "$HOME/Library/Caches/OpenKraken"
              # Socket directory: 775 (group writable)
              mkdir -p /tmp/openkraken
              chmod 775 /tmp/openkraken
            '';
          ];
          RunAtLoad = true;
          KeepAlive = false;
        };
      };
    };
  };
}
