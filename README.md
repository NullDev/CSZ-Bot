# CSZ-Bot

[![CSZ Discord](https://img.shields.io/discord/618781839338897443?color=%237289DA&label=CSZ%20Discord&logo=discord&logoColor=white)](https://discord.gg/csz)

<p align="center">
<img height="150" width="auto" src="hiergüligenlinkeinfügen" /><br>
Official Coding Shitpost Central Discord Bot
</p>

## :information_source: OwO wats dis?

Please ignore this repo. This is just a management bot I made for my stupid german coding discord server...

German description of the Discord Server:

> Deutscher Server für diverse programmier- und nerd Themen. <br>
> Language-Bashing, shitposting und Autismus stehen an der Tagesordnung. <br>
> Jeder ist willkommen da jede Programmiersprache gleichermaßen diskreditiert wird!

<sub>I'm sorry</sub>

---

## I want to make this stupid bot even worse

Read: [CONTRIBUTING.md](./CONTRIBUTING.md)

## :wrench: Installation

Du hast 2 Optionen: [Lokale installation](#lokale-installation) und [GitHub Codespaces](#github-codespaces). Ersteres ist aufwändiger. Bei letzterem musst du deine Config am besten abspeichern, weil sie bei Codespaces irgendwan zusammen mit dem Codespace gelöscht wird.

### Lokale Installation

<sub>node Version: >=24</sub>

1. Terminal aufmachen und dorthin navigieren, wo man es downloaden möchte
2. Sichergehen, dass [bun](https://bun.sh) installiert ist. Teste mit: `bun --version`. Wenn es eine Versionsnummer zurückgibt, ist bun installiert.
 **Wenn nicht**, bun [hier](https://bun.sh) runterladen.
3. Repository klonen und hinein navigieren. Wenn Git installiert ist:
```sh
git clone https://github.com/NullDev/CSZ-Bot.git && cd $_
```
Wenn nicht, [hier](https://github.com/NullDev/CSZ-Bot/archive/master.zip) herunterladen und die ZIP extrahieren (Gott stehe dir bei) und dann in den Ordner navigieren.

4. Dependencies installieren: <br>
```sh
bun i
```

5. Weiter machen mit den [gemeinsamen Schritten](#gemeinsame-schritte) (siehe unten)

### GitHub Codespaces
1. Klicke auf den grünen "Code"-Button
2. Wähle den Tab "Codespaces"
3. Klicke auf das "+" für einen neuen Codespace
4. Warte
5. Weiter machen mit den [gemeinsamen Schritten](#gemeinsame-schritte) (siehe unten)

### Gemeinsame Schritte
1. Das Config-Template [config.template.json](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json) kopieren und als `config.json` einfügen und bearbeiten:
```sh
cp config.template.json config.json
$EDITOR config.json
```
> [!TIP]
> Die Datei kann Kommentare und Trailing-Commas (JSONC). Wenn du nicht VSCode verwendest, musst du das ggf. noch einstellen.

2. Das Template ist für die [Coding-Test-Zentrale](https://discord.gg/ekJA6GA3BJ) vorausgefüllt. Es fehlen noch:
    - Um einen Bot zum Testen anzulegen, einfach den Instruktionen im [Discord Developer Portal](https://discord.com/developers/applications) folgen.
        - Die Applikation muss als "Bot" gesetzt werden.
        - Es müssen beide [Gateway Intents](https://discordjs.guide/popular-topics/intents.html#gateway-intents) eingeschalten werden.
        - Ersetze `<DISCORD_CLIENT_ID>` durch die Application-ID
        - Ersetze `<DISCORD_TOKEN>` durch das Bot-Token
    - Um IDs kopieren zu können, den "Developer Mode" in den Discord Einstellungen aktivieren. Mit Rechtsklick kann man dann die IDs kopieren.
3. Das Script starten.

Mit Hot-Reload:
```sh
bun watch
```

Ohne Hot-Reload:
```sh
bun start
```

### Housekeeping
Formatieren und Linten passiert durch lefthook automatisch beim Committen/Pushen. Manuell kannst du das machen:
- Formatieren: `bun format`
- Linten: `bun lint`
- Fixbare Linter-Fehler automatisch fixen: `bun lint:fix`
  - Fixbare, aber möglicherweise falsche Fixes anwenden: `bun lint:fix:unsafe`
- CI-Checks lokal laufen lassen: `bun ci`
- Unit-Tests ausführen: `bun test`
    - Nur Tests, die auf ein Pattern matchen: `bun test <pattern>` (z. B. `bun test smoke`)

## ❄ Nix
Entweder via `nix-shell` oder `nix develop` letzteres benötigt Nix-Flake support.
Nix-Flakes nutzen ohne diese eingeschaltet zu haben geht via:
`nix --extra-experimental-features "flakes nix-command" develop`

Wer auch immer einen Plan von Nix hat, kann das hier gerne weiter ausführen.

<img height=auto width=100% src="https://repository-images.githubusercontent.com/231836048/9d94c400-2f6b-11ea-95d8-f9e72ddf020f">
