{ pkgs ? import <nixpkgs> { }
, go ? pkgs.go_1_25
}:

pkgs.stdenv.mkDerivation {
  pname = "openkraken-gateway";
  version = "0.1.0";

  src = pkgs.lib.cleanSource ../.;

  nativeBuildInputs = [ go ];

  buildPhase = ''
    runHook preBuild

    export GOCACHE=$TMPDIR/go-cache
    export GOPATH=$TMPDIR/go
    go build -o $out/bin/egress-gateway packages/egress-gateway/src/main.go

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin

    runHook postInstall
  '';

  meta = with pkgs.lib; {
    description = "OpenKraken Egress Gateway";
    platforms = platforms.all;
  };
}
