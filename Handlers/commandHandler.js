const { createLog } = require("./logHandler.js");
const globals = require("../Util/globals");

function loadCommands(client) {
    const ascii = require("ascii-table");
    const fs = require("fs");
    const table = new ascii().setHeading("Commands", "Status");

    let commandsArray = [];

    const commandsFolder = fs.readdirSync('./Commands');
    for (const folder of commandsFolder) {
        const commandFiles = fs.readdirSync(`./Commands/${folder}`).filter((file) => file.endsWith('.js'));

        for (const file of commandFiles) {
            //if (globals.getCommandBlacklist().includes(file.replace(".js", ""))) { continue; }
            const commandFile = require(`../Commands/${folder}/${file}`);
            
            client.commands.set(commandFile.data.name, commandFile);

            commandsArray.push(commandFile.data.toJSON());

            table.addRow(file, "loaded");
            continue;
        }
    }

    client.application.commands.set(commandsArray);

    createLog("Client Loaded Commands!", "INFO", false, "GLOBAL");
    return console.log(table.toString(), "\nLoaded Commands");
}

module.exports = {loadCommands};