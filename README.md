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

<sub>bun Version: >=1.irgendwas</sub>

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
npm ci
```

5. Das Config-Template [config.template.json](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json) kopieren und als `config.json` einfügen und bearbeiten:
```sh
cp config.template.json config.json
$EDITOR config.json
```
6. Die frisch kopierte Config-Datei ausfüllen:
    - Um einen Bot zum Testen anzulegen, einfach den Instruktionen im [Discord Developer Portal](https://discord.com/developers/applications) folgen.
        - Die Applikation muss als "Bot" gesetzt werden.
        - Es müssen beide [Gateway Intents](https://discordjs.guide/popular-topics/intents.html#gateway-intents) eingeschalten werden.
        - Den Bot Token (**nicht** die Application-ID oder den Public-Key) [in die Config](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L3) unter `bot_token` kopieren.
        - Okay, die Application-ID muss doch mit [in die Config beim Feld `client_id`](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L4) rein.
    - Um IDs kopieren zu können, den "Developer Mode" in den Discord Einstellungen aktivieren. Mit Rechtsklick kann man dann die IDs kopieren.
    - Es müssen folgende Rollen am Server angelegt werden:
        - Moderator-Rolle - CSZ-Default: Moderader
        - Default Rolle - CSZ-Default: Nerd
        - Banned-Rolle - CSZ-Default: B&
        - Geburtstags-Rolle - CSZ-Default: Geburtstagskind
        - Gründerväter-Rolle - CSZ-Default: Gründerväter
        - Trusted-Rolle - CSZ-Default: Trusted
        - Rejoiner / Shame-Rolle - CSZ-Default: Rejoiner
        - Gründerväter-Gebannt-Rolle - CSZ-Default: B&-Gründerväter
        - Trusted-Gebannt-Rolle - CSZ-Default: B&-Trusted
        - Woisgang-Rolle - CSZ-Default: woisgang
        - ...und vielleicht noch ein paar Weitere, die du der Config entnehmen kannst.
7. Das Script starten.

Mit Hot-Reload:
```sh
bun watch
```

Ohne Hot-Reload:
```sh
bun start
```

## ❄ Nix
Entweder via `nix-shell` oder `nix develop` letzteres benötigt Nix-Flake support.
Nix-Flakes nutzen ohne diese eingeschaltet zu haben geht via:
`nix --extra-experimental-features "flakes nix-command" develop`

Wer auch immer einen Plan von Nix hat, kann das hier gerne weiter ausführen.

<img height=auto width=100% src="https://repository-images.githubusercontent.com/231836048/9d94c400-2f6b-11ea-95d8-f9e72ddf020f">
