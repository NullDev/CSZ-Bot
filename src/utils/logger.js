"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * Formats the current time
 *
 * @returns {string} Time
 */
let getDate = function(){
    const date = new Date();
    let hourData = date.getHours();
    let minData = date.getMinutes();
    let secData = date.getSeconds();

    let hour = (hourData < 10 ? "0" : "") + hourData;
    let min = (minData  < 10 ? "0" : "") + minData;
    let sec = (secData  < 10 ? "0" : "") + secData;

    return "[" + hour + ":" + min + ":" + sec + "]";
};

module.exports = {
    error: function(input){
        console.log(" \x1b[41m\x1b[30m x \x1b[0m\x1b[31m [ERROR] " + getDate() + " - " + input + "\x1b[0m");
    },

    warn: function(input){
        console.log(" \x1b[43m\x1b[30m ! \x1b[0m\x1b[33m [WARN]  " + getDate() + " - " + input + "\x1b[0m");
    },

    info: function(input){
        console.log(" \x1b[44m\x1b[30m i \x1b[0m\x1b[36m [INFO]  " + getDate() + " - " + input + "\x1b[0m");
    },

    done: function(input){
        console.log(" \x1b[42m\x1b[30m ✓ \x1b[0m\x1b[32m [DONE]  " + getDate() + " - " + input + "\x1b[0m");
    }
};
