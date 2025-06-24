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
        .setName("info")
        .setDescription("Display bot info")
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
                    .setTitle("About this Bot")
                    .setAuthor({ name: "Destiny Compendium" })
                    .setDescription(
                        `The **Destiny Compendium Bot** is a simple bot for querying the **Destiny Data Compendium**, a big spreadsheet of most Destiny 2 number tests.\nIts data is refreshed 2 days after every weekly reset (it doesn't actively track the spreadsheet).\n
                        Help for the bot is accessible via **/help**\n
                        Written by DcruBro and zShiso\n
                        This bot is not affiliated with the team behind the Destiny Compendium spreadsheet.\n
                        All info is sourced from [this spreadsheet](https://docs.google.com/spreadsheets/d/1WaxvbLx7UoSZaBqdFr1u32F2uWVLo-CJunJB4nlGUE4/edit?gid=1038486120#gid=1038486120).`
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