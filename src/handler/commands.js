"use strict";

// Core Modules
let fs = require("fs");
let path = require("path");
let log = require("../utils/logger");

function loadCommands(srcDir) {
    const commandRoot = path.resolve(srcDir);

    const res = new Map();

    for(const commandFile of fs.readdirSync(commandRoot)) {
        const fullCommandFile = path.join(commandRoot, commandFile);

        if (fs.statSync(fullCommandFile).isDirectory() || path.extname(fullCommandFile).toLowerCase() !== ".js") {
            continue;
        }

        log.info(`Loading "${fullCommandFile}"`);
        res.set(commandFile.toLowerCase(), require(fullCommandFile));
    }

    return res;
}

module.exports = {
    modCommands: loadCommands("./src/commands/modcommands"),
    plebCommands: loadCommands("./src/commands"),
};
