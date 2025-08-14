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

function failEmbed() {
  return new EmbedBuilder()
	  .setColor(0xFF0000)
	  .setTitle("TWID Not Found")
	  .setAuthor({ name: "Destiny Compendium" })
    .setDescription("Sorry, but the latest TWID could not be found. Try checking the news page yourself [here](https://www.bungie.net/7/en/News).")
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

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return "th"; // 11th, 12th, 13th...
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function formatPubDate(pubDateStr) {
  const date = new Date(pubDateStr);

  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);
  const monthName = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}${suffix} of ${monthName} ${year} at ${hours}:${minutes}`;
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

              let final = null;

              if (!latestTWID) {
                console.log("No TWID found.");
              } else {
                final = {
                  Link: "https://www.bungie.net" + latestTWID.Link,
                  PubDate: latestTWID.PubDate,
                  ImagePath: latestTWID.ImagePath,
                  Description: latestTWID.Description
                };
                console.log(final);
              }
              
              if (!final) {
                interaction.editReply({
                  embeds: [failEmbed()],
                  ephemeral: false
                });
                clearTimeout();
                replied = true;
              }

              const embed = new EmbedBuilder()
                .setColor(0x0000FF)
                .setTitle("Latest TWID")
                .setAuthor({ name: "Destiny Compendium" })
                .setDescription(
                    `The latest Bungie TWID can be found [here](${final.Link})`
                )
                .addFields(
                  { name: "Post Description", value: final.Description },
                  { name: "Publication Date", value: formatPubDate(final.PubDate) }
                )
                .setThumbnail("https://i.imgur.com/F9KcQzL.png")
                .setImage(final.ImagePath)
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