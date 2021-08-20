# CSC-Bot

[![ESLint Codestyle](https://github.com/NullDev/CSC-Bot/actions/workflows/codestyle.yml/badge.svg)](https://github.com/NullDev/CSC-Bot/actions/workflows/codestyle.yml)

<p align="center">
<img height="150" width="auto" src="https://cdn.discordapp.com/icons/618781839338897443/a_82f94d024985d290862ef86ada2f2ef1.gif?size=128" /><br>
Official Coding Shitpost Central Discord Bot
</p>

## :information_source: OwO wats dis?

Please ignore this repo. This is just a management bot I made for my stupid [german coding discord server](https://discord.gg/FABdvae)...

German description of the Discord Server:

> Deutscher Server für diverse programmier- und nerd Themen. <br>
> Language-Bashing, shitposting und Autismus stehen an der Tagesordnung. <br>
> Jeder ist willkommen da jede Programmiersprache gleichermaßen diskreditiert wird!

<sub>I'm sorry</sub>

<hr>

## :wrench: Installation

<sub>NodeJS Version: >=14.3.0</sub>

0. Terminal aufmachen und dorthin navigieren, wo man es downloaden möchte <br><br>
1. Sichergehen, dass NodeJS installiert ist. Teste mit: <br>
$ `node -v` <br>
Wenn es eine Versionsnummer zurückgibt, ist NodeJS installiert.
 **Wenn nicht**, NodeJS <a href="https://nodejs.org/en/download/package-manager/">hier</a> downloaden. <br><br>
2. Repository clonen und hinein navigieren. Wenn Git installiert ist: <br>
$ `git clone https://github.com/NullDev/CSC-Bot.git && cd $_` <br>
Wenn nicht, <a href="https://github.com/NullDev/CSC-Bot/archive/master.zip">hier</a> herunterladen und die ZIP extrahieren. <br>
Dann in den Ordner navigieren.<br><br>
3. Dependencies installieren: <br>
$ `npm ci`<br><br>
4. Das Config-Template [config.template.json](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json) kopieren und als `config.json` einfügen. <br><br>
6. Die frisch kopierte Config-Datei ausfüllen: <br>
    - Um einen Bot zum Testen anzulegen, einfach den Instruktionen im [Discord Developer Portal](https://discord.com/developers/applications) folgen.
        - Die Applikation muss als "Bot" gesetzt werden.
        - Es müssen beide [Gateway Intents](https://discordjs.guide/popular-topics/intents.html#gateway-intents) eingeschalten werden.
        - Den Bot Token (NICHT die Application-ID oder den Public-Key) [in die Config](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L3) kopieren.
    - Um ID's kopieren zu können, den "Developer Mode" in den Discord Einstellungen aktivieren. Mit Rechts-Klick kann man dann die ID's kopieren:
        - Die ID [des Servers](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L18)
        - Die ID für [den Hauptchat](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L19)
        - Die ID für [den Banned-Channel](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L31)
        - Die ID für [den Umfrage-Channel](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L32)
    - Es müssen folgende Rollen am Server angelegt werden:
        - Moderator-Rolle ([Name der Rolle](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L12)) - CSZ Default: Moderader
        - Default Rolle ([ID der Rolle](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L21)) - CSZ Default: Nerd
        - Banned-Rolle ([ID der Rolle](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L21)) - CSZ Default: B&
        - Geburtstags-Rolle ([ID der Rolle](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L22)) - CSZ Default: Geburtstagskind
        - Gründerväter-Rolle ([ID der Rolle](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L25)) - CSZ Default: Gründerväter
        - Trusted-Rolle ([ID der Rolle](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L27)) - CSZ Default: Trusted
        - Rejoiner / Shame-Rolle ([ID der Rolle](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L29)) - CSZ Default: Rejoiner
        - Gründerväter-Gebannt-Rolle ([ID der Rolle](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L26)) - CSZ Default: B&-Gründerväter
        - Trusted-Gebannt-Rolle ([ID der Rolle](https://github.com/NullDev/CSC-Bot/blob/master/config.template.json#L28)) - CSZ Default: B&-Trusted<br><br>
8. Das Script starten <br>
$ `npm start` <br><br>

<img height=auto width=100% src="https://repository-images.githubusercontent.com/231836048/9d94c400-2f6b-11ea-95d8-f9e72ddf020f">
