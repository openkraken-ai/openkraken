{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.services.openkraken;
in

{
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
        default = "/run/openkraken/egress.sock";
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

    # Create log directory
    environment.extraOutputsToInstall = [ "out" ] ++ optionals (cfg.orchestrator.enable || cfg.gateway.enable) [ ];

    system.paths = {
      createdDirectories = [ "/var/log/openkraken" ];
    };
  };
}
