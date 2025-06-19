const { Client, ModalBuilder } = require("discord.js");
const { createLog } = require("../../Handlers/logHandler.js");
const config = require("../../config.json");

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        createLog(`Bot came online with username "${client.user.username}"`, "INFO", false, "GLOBAL");
        console.log(`${client.user.username} is now online!`);
    }
};