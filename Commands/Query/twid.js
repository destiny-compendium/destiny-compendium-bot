const { fetch } = require("undici");
const { XMLParser } = require("fast-xml-parser");
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

function coerceItemsFromApiResponse(json) {
  // Bungie returns either a raw RSS XML string or an object with Items.
  const resp = json?.Response;
  if (!resp) return [];

  // Case 1: already parsed-style object with Items
  if (resp.Items && Array.isArray(resp.Items)) {
    return resp.Items.map(i => ({
      title: i.Title ?? i.title,
      link: i.Link ?? i.link,
      pubDate: i.PubDate ?? i.pubDate
    }));
  }

  // Case 2: Response is a string containing RSS XML
  if (typeof resp === "string") {
    const parser = new XMLParser({ ignoreAttributes: false });
    const xml = parser.parse(resp);
    const items = xml?.rss?.channel?.item || [];
    return items.map(i => ({
      title: i.title,
      link: i.link,
      pubDate: i.pubDate
    }));
  }

  return [];
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
              const RSS_URL = "https://www.bungie.net/Platform/Content/Rss/NewsArticles/0/?categoryfilter=Destiny2";
              const TITLE_MATCH = /this week in destiny/i;

              const r = await fetch(RSS_URL, {
                headers: { "X-API-Key": client.bungietoken }
              });
              if (!r.ok) {
                throw new Error(`Bungie API error: ${r.status} ${r.statusText}`);
              }
              const data = await r.json();
              const items = coerceItemsFromApiResponse(data);
            
              const twids = items.filter(i => TITLE_MATCH.test(i.title ?? ""));
              if (twids.length === 0) {
                console.log("No TWID found on the first RSS page.");
                process.exit(0);
              }
            
              // Pick the newest by pubDate
              twids.sort(
                (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
              );
              const latest = twids[0];
            
              console.log({
                title: latest.title,
                url: latest.link,
                published: latest.pubDate
              });

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