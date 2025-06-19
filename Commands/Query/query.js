const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Pong!")
        .setDefaultMemberPermissions(PermissionFlagsBits.Everyone)
        .addStringOption(option => option.setName("category").setDescription("Query category").setRequired(true))
        .addStringOption(option => option.setName("query").setDescription("Query string").setRequired(true)),

        execute(interaction) {
            interaction.reply({ content: "Unimplemented", ephermal: false });
        },
};