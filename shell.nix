with import <nixpkgs> {};

stdenv.mkDerivation {
  name = "csz-bot";
  buildInputs = [
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
}
