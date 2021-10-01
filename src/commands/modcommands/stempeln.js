"use strict";

const Stempel = require("../../storage/model/Stempel");
/**
 * Moderader können User stempeln, die andere User eingeladen haben
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Promise<Function>} callback
 */
exports.run = async (client, message, args, callback) => {
   if (args.length < 2) return callback("Du musst schon User angeben!");
   if (message.mentions.users.size !== 2) return callback("Du hast entweder zu viele oder zu wenige User angegeben Bruder");

   let inviter = message.mentions.users.first();
   let invited = message.mentions.users.last();
   
   if (!inviter || !invited) return callback("Irgendwas stimmt mit deinen Usern nicht, check das mal ab!");
   
   let date = new Date();
   date = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

   let newInvite = await Stempel.insertStempel(inviter.id, invited.id, date);
   if(newInvite === "true") {
      return callback(`Der Bruder ${inviter.username} hat den neuen Bruder ${invited.username} eingeladen und du hast dies so eben bestätigt!`);
   } else if(newInvite === "false") {
      return callback(`Der Bruder ${invited.username} wurde bereits gestempelt!`)
   }

   return callback();
};

exports.description = "TODO!";
