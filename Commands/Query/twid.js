const { fetch } = require("undici");
const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder, EntryPointCommandHandlerType } = require("discord.js");

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
        .setName("twid")
        .setDescription("Get the latest Bungie TWID")
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
              const RSS_URL = "https://www.bungie.net/Platform/Content/Rss/NewsArticles/0/";
              const TITLE_MATCH = /this week in destiny/i;

              const r = await fetch(RSS_URL, {
                headers: { "X-API-Key": client.bungietoken }
              });
              if (!r.ok) {
                throw new Error(`Bungie API error: ${r.status} ${r.statusText}`);
              }
              const data = await r.json();

              const latestTWID = data.Response.NewsArticles.find(article =>
                TITLE_MATCH.test(article.Title)
              );

              if (!latestTWID) {
                console.log("No TWID found.");
              } else {
                console.log({
                  Link: latestTWID.Link,
                  PubDate: latestTWID.PubDate,
                  ImagePath: latestTWID.ImagePath,
                  Description: latestTWID.Description
                });
              }

              const embed = new EmbedBuilder()
                .setColor(0x0000FF)
                .setTitle("Latest TWID")
                .setAuthor({ name: "Destiny Compendium" })
                .setDescription(
                    `The latest Bungie TWID can be found [here](${"https://example.com"})`
                )
                .setThumbnail("https://i.imgur.com/F9KcQzL.png")
                .setTimestamp();
                
              interaction.editReply({
                embeds: [embed],
                ephemeral: true
              });

              clearTimeout();
              replied = true;
            } catch (error) {
              if (!replied) {
                await interaction.editReply({ embeds: [errorEmbed()], ephemeral: true });
                replied = true;
              }
              clearTimeout();
              console.error(error);
            }

            return;
        },
};