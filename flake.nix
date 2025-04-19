{
  description = "CSZ-Bot";
  nixConfig.bash-prompt = "\[csz-bot\]$ ";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.flake-compat = {
    url = "github:edolstra/flake-compat";
    flake = false;
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in
      {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            nixpkgs-fmt
            pixman
            pkg-config
            cairo
            pango
            biome
            nodejs_22
            typescript
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
