const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

function failEmbed() {
  return new EmbedBuilder()
	  .setColor(0xFF0000)
	  .setTitle("Query Failed")
	  .setAuthor({ name: "Destiny Compendium" })
    .setDescription("Sorry, but your query matched no results.")
	  .setThumbnail("https://i.imgur.com/MNab4aw.png")
	  .setTimestamp();
}

function errorEmbed() {
  return new EmbedBuilder()
	  .setColor(0xFF0000)
	  .setTitle("An Error Occurred")
	  .setAuthor({ name: "Destiny Compendium" })
    .setDescription("Sorry, but an internal error occurred during your query.")
	  .setThumbnail("https://i.imgur.com/MNab4aw.png")
	  .setTimestamp();
}

function timeoutEmbed() {
  return new EmbedBuilder()
	  .setColor(0xFF0000)
	  .setTitle("Timed Out")
	  .setAuthor({ name: "Destiny Compendium" })
    .setDescription("Sorry, but your query timed out during processing.")
	  .setThumbnail("https://i.imgur.com/MNab4aw.png")
	  .setTimestamp();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Bot help menu")
        .setDefaultMemberPermissions(PermissionFlagsBits.Everyone),

        async execute(interaction, client) {
            await interaction.deferReply();

            let replied = false;

            // Set your timeout (e.g., 60 seconds)
            const timeout = setTimeout(async () => {
              if (!replied) {
                await interaction.editReply({ embeds: [timeoutEmbed()] });
                replied = true;
              }
            }, 10000); // 60,000 ms = 60 seconds

            try {
                const embed = new EmbedBuilder()
                    .setColor(0x0000FF)
                    .setTitle("Help Menu")
                    .setAuthor({ name: "Destiny Compendium" })
                    .setDescription("Available commands for Destiny Compendium:")
                    .addFields(
                        { name: "/query <category> <query>", value: "Queries the Destiny Compendium spreadsheet for your desired **query** in the selected **category**.", inline: false },
                        { name: "/list <category> <query>", value: "Queries the Destiny Compendium spreadsheet for a listing of entries that match your desired **query** in the selected **category**.", inline: false },
                        { name: "/rotation <category>", value: "Returns the current featured activity rotation for the specified category.", inline: false },
                        { name: "/loottable <activity> [graphical]", value: "Returns the per-encounter loot table for the specified activity (can set 'graphical' to True for a graphical loot table instead).", inline: false },
                        { name: "/twid", value: "Returns the latest Bungie TWID.", inline: false },
                        { name: "/help", value: "Display this menu.", inline: false },
                        { name: "/info", value: "Display bot info.", inline: false },
                        { name: "/patchnotes", value: "Bot patch notes.", inline: false },
                        { name: "/support", value: "Get support contact info.", inline: false }
                    )
                    .setThumbnail("https://i.imgur.com/F9KcQzL.png")
                    .setTimestamp();
                
                interaction.editReply({
                  embeds: [embed],
                  ephemeral: false
                });
              clearTimeout();
              replied = true;
            } catch (error) {
              if (!replied) {
                await interaction.editReply({ embeds: [errorEmbed()] });
                replied = true;
              }
              clearTimeout();
              console.error(error);
            }

            return;
        },
};