{ config
, lib
, pkgs
, ...
}:

with lib;

let
  cfg = config.services.openkraken;
in

{
  # INFRA-015: Import D-Bus secret-service configuration for credential vault access
  imports = [
    ./dbus-secrets.nix
  ];

  # INFRA-016: Sandbox Runtime dependencies
  # Per TechSpec §8.3: Linux uses bubblewrap for process isolation
  # Additional deps: socat (Unix socket bridging), ripgrep (dangerous file scanning)
  environment.systemPackages = mkIf cfg.enable (
    with pkgs;
    [
      bubblewrap
      socat
      ripgrep
    ]
  );

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

      configDir = mkOption {
        type = types.path;
        default = "/etc/openkraken";
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
    # Create users and groups
    users.users.openkraken = mkIf (cfg.orchestrator.enable || cfg.gateway.enable) {
      description = "OpenKraken service user";
      group = "openkraken";
      isSystemUser = true;
    };

    users.groups.openkraken = mkIf (cfg.orchestrator.enable || cfg.gateway.enable) { };

    # Create directories with proper permissions using systemd-tmpfiles
    # Per INFRA-014: Directory Permissions & Security
    #
    # Note: We use tmpfiles to create /tmp/openkraken for the Unix socket.
    # The RuntimeDirectory directive creates /run/openkraken (a different path)
    # which systemd manages separately. Both can coexist - tmpfiles handles the
    # socket path in /tmp while RuntimeDirectory is available for other runtime needs.
    systemd.tmpfiles.rules = mkIf (cfg.orchestrator.enable || cfg.gateway.enable) [
      # Data directory: 700 (owner only)
      "d /var/lib/openkraken 0700 openkraken openkraken - -"
      # Logs directory: 750 (owner full, group read/execute)
      "d /var/log/openkraken 0750 openkraken openkraken - -"
      # Cache directory: 755 (owner full, group/others read/execute)
      "d /var/cache/openkraken 0755 openkraken openkraken - -"
      # Config directory: 640 (owner read/write, group read)
      "d /etc/openkraken 0640 root openkraken - -"
      # Socket directory in /tmp: 775 (standard /tmp permissions, allows group access for socket)
      "d /tmp/openkraken 0775 openkraken openkraken - -"
      # INFRA-016: Sandbox zones - skills (read-only)
      "d /var/lib/openkraken/skills 0755 openkraken openkraken - -"
      # INFRA-016: Sandbox zones - inputs (read-only)
      "d /var/lib/openkraken/inputs 0755 openkraken openkraken - -"
      # INFRA-016: Sandbox zones - work (read-write, ephemeral)
      "d /var/lib/openkraken/work 0755 openkraken openkraken - -"
      # INFRA-016: Sandbox zones - outputs (read-write, ephemeral)
      "d /var/lib/openkraken/outputs 0755 openkraken openkraken - -"
    ];

    systemd.services.openkraken-orchestrator = mkIf cfg.orchestrator.enable {
      description = "OpenKraken Agent Orchestrator";
      wantedBy = [ "multi-user.target" ];
      after = [
        "network.target"
        "tmpfs.mount"
      ];
      requires = [ "tmpfiles.service" ];

      serviceConfig = {
        Type = "simple";
        User = "openkraken";
        Group = "openkraken";
        Restart = "always";
        RestartSec = 10;
        RuntimeDirectory = "openkraken";
        RuntimeDirectoryMode = "0750";
        Environment = [
          "OPENKRAKEN_HOME=${cfg.orchestrator.dataDir}"
          "OPENKRAKEN_CONFIG=${cfg.orchestrator.configDir}/config.yaml"
          "ORCHESTRATOR_PORT=${toString cfg.orchestrator.port}"
          # INFRA-015: D-Bus session bus for credential vault access
          # Note: On headless servers without a login session, this path won't exist,
          # causing Bun.secrets to fail and fall back to age-encrypted file (expected).
          # On desktop systems with gnome-keyring, this enables native vault access.
          "DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/%U/bus"
        ];
        ExecStart = "${cfg.orchestrator.package}/bin/openkraken";
        PrivateTmp = true;
        NoNewPrivileges = true;
      };
    };

    systemd.services.openkraken-egress-gateway = mkIf cfg.gateway.enable {
      description = "OpenKraken Egress Gateway";
      wantedBy = [ "multi-user.target" ];
      after = [
        "network.target"
        "tmpfs.mount"
      ];
      requires = [ "tmpfiles.service" ];

      serviceConfig = {
        Type = "simple";
        User = "openkraken";
        Group = "openkraken";
        Restart = "always";
        RestartSec = 10;
        RuntimeDirectory = "openkraken";
        RuntimeDirectoryMode = "0750";
        Environment = [
          "OPENKRAKEN_CONFIG=${cfg.orchestrator.configDir}/config.yaml"
          "EGRESS_GATEWAY_PORT=${toString cfg.gateway.port}"
          "EGRESS_SOCKET_PATH=${cfg.gateway.socketPath}"
        ];
        ExecStart = "${cfg.gateway.package}/bin/egress-gateway";
        PrivateTmp = true;
        NoNewPrivileges = true;
      };
    };
  };
}
