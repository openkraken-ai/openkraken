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
        default = "/var/lib/openkraken";
        description = "Data directory for OpenKraken";
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
    systemd.services.openkraken-orchestrator = mkIf cfg.orchestrator.enable {
      description = "OpenKraken Agent Orchestrator";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];

      serviceConfig = {
        Type = "simple";
        User = "openkraken";
        Group = "openkraken";
        Restart = "always";
        RestartSec = 10;
        RuntimeDirectory = "openkraken";
        RuntimeDirectoryMode = "0755";
        Environment = [
          "OPENKRAKEN_HOME=${cfg.orchestrator.dataDir}"
          "ORCHESTRATOR_PORT=${toString cfg.orchestrator.port}"
        ];
        ExecStart = "${cfg.orchestrator.package}/bin/openkraken";
        PrivateTmp = true;
        NoNewPrivileges = true;
      };
    };

    systemd.services.openkraken-gateway = mkIf cfg.gateway.enable {
      description = "OpenKraken Egress Gateway";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];

      serviceConfig = {
        Type = "simple";
        User = "openkraken";
        Group = "openkraken";
        Restart = "always";
        RestartSec = 10;
        RuntimeDirectory = "openkraken";
        RuntimeDirectoryMode = "0755";
        Environment = [
          "EGRESS_GATEWAY_PORT=${toString cfg.gateway.port}"
          "EGRESS_SOCKET_PATH=${cfg.gateway.socketPath}"
        ];
        ExecStart = "${cfg.gateway.package}/bin/egress-gateway";
        PrivateTmp = true;
        NoNewPrivileges = true;
      };
    };

    users.users.openkraken = mkIf (cfg.orchestrator.enable || cfg.gateway.enable) {
      description = "OpenKraken service user";
      group = "openkraken";
      isSystemUser = true;
    };

    users.groups.openkraken = mkIf (cfg.orchestrator.enable || cfg.gateway.enable) { };
  };
}
