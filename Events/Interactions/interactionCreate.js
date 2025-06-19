const { CommandInteraction, ButtonInteraction } = require("discord.js");
const { createLog } = require("../../Handlers/logHandler");

module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                interaction.reply({ content: "Outdated Command!" });
                createLog(`User "${interaction.user.id}" tried to run an outdated command!`, "WARNING", false, interaction.guild.id);
            }

            command.execute(interaction, client);
            createLog(`User "${interaction.user.id}" executed an interaction!`, "INFO", false, interaction.guild.id);
        } else if (interaction.isButton()) {
            if (!data) {
                return;
            } else {
                let interactionCustomId;
                let roleId;

                interactionCustomId = data.interactionCustomId;
                roleId = interaction.guild.roles.cache.get(data.role);

                //console.log(interaction.customId);
                //console.log(data.interactionCustomId);

                if (interaction.customId === data.interactionCustomId) {
                    return interaction.member.roles.add(roleId)
                        .then((member) => interaction.reply(
                            { content: `${roleId} has been assigned to you.`, ephemeral: true }
                    ));
                } else {
                    return interaction.reply({ content: "Undefined Interaction", ephemeral: true });
                }
            }
        }
    },
}