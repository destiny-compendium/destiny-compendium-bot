const fs = require("fs");
const { createLog } = require("../../Handlers/logHandler");

module.exports = {
    name: "messageCreate",
    async execute(message, client) {
        let date_time = new Date();
        // adjust 0 before single digit date
        let date = ("0" + date_time.getDate()).slice(-2);

        // get current month
        let month = ("0" + (date_time.getMonth() + 1)).slice(-2);

        // get current year
        let year = date_time.getFullYear();

        if (message != null) {

        } else {
            createLog(`${message.member.id}. tried to send null message, ignoring!\n`, "INFO", false, message.guild.id);
        }
    },
};