# CSZ-Bot

[![ESLint Codestyle](https://github.com/NullDev/CSZ-Bot/actions/workflows/codestyle.yml/badge.svg)](https://github.com/NullDev/CSZ-Bot/actions/workflows/codestyle.yml)
[![CSZ Discord](https://img.shields.io/discord/618781839338897443?color=%237289DA&label=CSZ%20Discord&logo=discord&logoColor=white)](https://discord.gg/csz)

<p align="center">
<img height="150" width="auto" src="https://cdn.discordapp.com/icons/618781839338897443/a_a0f837d7d66b04363b814d2f80d807d4.gif?size=128" /><br>
Official Coding Shitpost Central Discord Bot
</p>

## :information_source: OwO wats dis?

Please ignore this repo. This is just a management bot I made for my stupid [german coding discord server](https://discord.gg/csz)...

German description of the Discord Server:

> Deutscher Server für diverse programmier- und nerd Themen. <br>
> Language-Bashing, shitposting und Autismus stehen an der Tagesordnung. <br>
> Jeder ist willkommen da jede Programmiersprache gleichermaßen diskreditiert wird!

<sub>I'm sorry</sub>

<hr>

## I want to make this stupid bot even worse

Read: [Contributing.md](./CONTRIBUTING.md)

## :wrench: Installation

<sub>NodeJS Version: >=16.6.0</sub>

0. Terminal aufmachen und dorthin navigieren, wo man es downloaden möchte <br><br>
1. Sichergehen, dass NodeJS installiert ist. Teste mit: <br>
$ `node -v` <br>
Wenn es eine Versionsnummer zurückgibt, ist NodeJS installiert.
 **Wenn nicht**, NodeJS <a href="https://nodejs.org/en/download/package-manager/">hier</a> downloaden. <br><br>
2. Repository clonen und hinein navigieren. Wenn Git installiert ist: <br>
$ `git clone https://github.com/NullDev/CSZ-Bot.git && cd $_` <br>
Wenn nicht, <a href="https://github.com/NullDev/CSZ-Bot/archive/master.zip">hier</a> herunterladen und die ZIP extrahieren. <br>
Dann in den Ordner navigieren.<br><br>
3. Dependencies installieren: <br>
$ `npm ci`<br><br>
4. Das Config-Template [config.template.json](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json) kopieren und als `config.json` einfügen. <br><br>
5. Die frisch kopierte Config-Datei ausfüllen: <br>
    - Um einen Bot zum Testen anzulegen, einfach den Instruktionen im [Discord Developer Portal](https://discord.com/developers/applications) folgen.
        - Die Applikation muss als "Bot" gesetzt werden.
        - Es müssen beide [Gateway Intents](https://discordjs.guide/popular-topics/intents.html#gateway-intents) eingeschalten werden.
        - Den Bot Token (**nicht** die Application-ID oder den Public-Key) [in die Config](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L3) unter `bot_token` kopieren.
        - Okay, die Application-ID muss doch mit [in die Config beim Feld `client_id`](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L4) rein.
    - Um IDs kopieren zu können, den "Developer Mode" in den Discord Einstellungen aktivieren. Mit Rechtsklick kann man dann die IDs kopieren:
        - Die ID [des Servers](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L31)
        - Die ID für [den Hauptchat](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L32)
        - Die ID für [den Banned-Channel](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L44)
        - Die ID für [den Umfrage-Channel](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L45)
    - Es müssen folgende Rollen am Server angelegt werden:
        - Moderator-Rolle ([Name der Rolle](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L12)) - CSZ Default: Moderader
        - Default Rolle ([ID der Rolle](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L33)) - CSZ Default: Nerd
        - Banned-Rolle ([ID der Rolle](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L22)) - CSZ Default: B&
        - Geburtstags-Rolle ([ID der Rolle](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L35)) - CSZ Default: Geburtstagskind
        - Gründerväter-Rolle ([ID der Rolle](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L38)) - CSZ Default: Gründerväter
        - Trusted-Rolle ([ID der Rolle](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L40)) - CSZ Default: Trusted
        - Rejoiner / Shame-Rolle ([ID der Rolle](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L42)) - CSZ Default: Rejoiner
        - Gründerväter-Gebannt-Rolle ([ID der Rolle](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L39)) - CSZ Default: B&-Gründerväter
        - Trusted-Gebannt-Rolle ([ID der Rolle](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L41)) - CSZ Default: B&-Trusted
        - Woisgang-Rolle ([ID der Rolle](https://github.com/NullDev/CSZ-Bot/blob/master/config.template.json#L36)) - CSZ Default: woisgang<br><br>
6. Das Script starten <br>
$ `npm run watch`<br>
<br><br>
## ❄ Nix
Entweder via `nix-shell` oder `nix develop` letzteres benötigt Nix-Flake support.
Nix-Flakes nutzen ohne diese eingeschaltet zu haben geht via:
`nix --extra-experimental-features "flakes nix-command" develop`

<img height=auto width=100% src="https://repository-images.githubusercontent.com/231836048/9d94c400-2f6b-11ea-95d8-f9e72ddf020f">
