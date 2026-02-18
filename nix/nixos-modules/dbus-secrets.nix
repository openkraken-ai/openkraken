{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.services.openkraken;
in
{
  # INFRA-015: Credential Vault Access Configuration
  # Configures D-Bus access for the openkraken service user to access
  # the secret-service API (org.freedesktop.secrets) on Linux.
  #
  # Architecture Notes:
  # - This configures the SYSTEM bus policy for secret-service access
  # - secret-service (gnome-keyring) typically runs on the SESSION bus
  # - On headless servers without an active login session, the session bus
  #   doesn't exist, so Bun.secrets will fail and fall back to age-encrypted file
  # - The system bus policy is kept for completeness and for configurations
  #   where secret-service might be configured on the system bus
  #
  # This enables credential retrieval via:
  # - Bun.secrets (which uses libsecret internally) - requires session bus
  # - secret-tool CLI: sudo -u openkraken secret-tool lookup openkraken test
  #
  # For headless servers without secret-service, the CredentialVault
  # falls back to age-encrypted credentials.enc file.
  config = mkIf cfg.enable {
    # D-Bus system bus policy for secret-service access
    # Allows the openkraken user to communicate with the secret service daemon
    services.dbus.packages = [
      (pkgs.writeTextDir "etc/dbus-1/system.d/org.freedesktop.secrets.conf" ''
        <?xml version="1.0" encoding="UTF-8"?>
        <!--
          D-Bus policy for OpenKraken secret-service access (INFRA-015)
          Grants the openkraken service user access to the freedesktop secret service API.
          This enables credential retrieval via Bun.secrets and secret-tool.
        -->
        <!DOCTYPE busconfig PUBLIC "-//freedesktop//DTD D-BUS Bus Configuration 1.0//EN"
         "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">
        <busconfig>
          <!-- Grant openkraken user access to secret-service -->
          <policy user="openkraken">
            <allow send_destination="org.freedesktop.secrets"
                   send_interface="org.freedesktop.Secret.Service"/>
            <allow send_destination="org.freedesktop.secrets"
                   send_interface="org.freedesktop.Secret.Collection"/>
            <allow send_destination="org.freedesktop.secrets"
                   send_interface="org.freedesktop.Secret.Item"/>
            <allow send_destination="org.freedesktop.secrets"
                   send_interface="org.freedesktop.Secret.Prompt"/>
            <allow receive_sender="org.freedesktop.secrets"/>
          </policy>

          <!-- Default deny for others -->
          <policy at_console="false">
            <deny send_destination="org.freedesktop.secrets"/>
          </policy>
        </busconfig>
      '')
    ];

    # Ensure libsecret is available for Bun.secrets to use
    # libsecret provides both the runtime library and secret-tool CLI
    environment.systemPackages = mkIf (cfg.orchestrator.enable || cfg.gateway.enable) [
      pkgs.libsecret
    ];
  };
}
