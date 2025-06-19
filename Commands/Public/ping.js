const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Pong!")
        .setDefaultMemberPermissions(PermissionFlagsBits.Everyone),

        execute(interaction) {
            interaction.reply({ content: "Pong!", ephermal: true });
        },
};