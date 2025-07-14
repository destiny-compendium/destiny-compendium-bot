const { CommandInteraction, ButtonInteraction, EmbedBuilder } = require("discord.js");
const { createLog } = require("../../Handlers/logHandler");
const globals = require("../../Util/globals");

function outdatedEmbed() {
  return new EmbedBuilder()
	  .setColor(0xFF0000)
	  .setTitle("Outdated Command")
	  .setAuthor({ name: "Destiny Compendium" })
      .setDescription("This command is outdated! Try refreshing your Discord by pressing *Ctrl+R*.")
	  .setThumbnail("https://i.imgur.com/MNab4aw.png")
	  .setTimestamp();
}

function blacklistEmbed() {
  return new EmbedBuilder()
	  .setColor(0xFF0000)
	  .setTitle("Blacklisted Command")
	  .setAuthor({ name: "Destiny Compendium" })
      .setDescription("Sorry, but this command has temporarily been placed on a blacklist. Please try again later.")
	  .setThumbnail("https://i.imgur.com/MNab4aw.png")
	  .setTimestamp();
}

module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                interaction.reply({ embeds: [outdatedEmbed()] });
                createLog(`User "${interaction.user.id}" tried to run an outdated command!`, "WARNING", false, interaction.guild.id);

                return;
            }

            console.log(interaction.commandName);
            console.log(globals.getCommandBlacklist());

            if (globals.getCommandBlacklist().includes(interaction.commandName)) {
                interaction.reply({ embeds: [blacklistEmbed()] });
                createLog(`User "${interaction.user.id}" tried to run a blacklisted command!`, "WARNING", false, interaction.guild.id);

                return;
            }

            await command.execute(interaction, client);
            createLog(`User "${interaction.user.id}" executed an interaction!`, "INFO", false, interaction.guild.id);
        } else if (interaction.isButton()) {
            if (!data) {
                return;
            } else {
                let interactionCustomId;
                let roleId;

                interactionCustomId = data.interactionCustomId;
                roleId = interaction.guild.roles.cache.get(data.role);
            }
        }
    },
}