{
  description = "CSC-Bot";
  nixConfig.bash-prompt = "\[csc-bot\]$ ";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.flake-compat = {
    url = "github:edolstra/flake-compat";
    flake = false;
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in
      rec {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            nixpkgs-fmt
            nodejs-16_x
            pixman
            pkg-config
            cairo
            pango
          ] ++ lib.optionals stdenv.isDarwin (with darwin.apple_sdk.frameworks; [
            CoreText
          ]);
          shellHook = ''
            export PATH="$PWD/node_modules/.bin/:$PATH"
          '';
        };
      }
    );
}
