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
                    .setDescription(
                        `**/query <category> <query>**\nQueries the Destiny Compendium spreadsheet for your desired **query** in the selected **category**.\n
                        **/rotation <category>**\nQueries the Destiny 2 API to get the current rotation for the specified category.\n
                        **/help**\nDisplay this menu.\n
                        **/info**\nDisplay bot info\n
                        **/patchnotes**\nBot patch notes\n
                        **/support**\nGet support contact info`
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