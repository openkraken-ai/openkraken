{ pkgs ? import <nixpkgs> { }
, bun ? pkgs.bun
}:

pkgs.stdenv.mkDerivation {
  pname = "openkraken-orchestrator";
  version = "0.1.0";

  src = pkgs.lib.cleanSource ../.;

  nativeBuildInputs = [ bun ];

  buildPhase = ''
    runHook preBuild

    # Build CLI binary from apps/cli/src/main.ts
    bun build --compile --outfile $out/bin/openkraken apps/cli/src/main.ts

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin

    runHook postInstall
  '';

  meta = with pkgs.lib; {
    description = "OpenKraken Agent Orchestrator";
    platforms = platforms.all;
  };
}
