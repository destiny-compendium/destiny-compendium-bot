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

async function findLinkedH1Href(url, needle) {
  const { data: html } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const $ = cheerio.load(html);

  // First <h1> whose text contains `needle` (case-insensitive)
  const $h1 = $("h1")
    .filter((_, el) => $(el).text().toLowerCase().includes(needle.toLowerCase()))
    .first();

  if (!$h1.length) return null;

  // Prefer a link inside the <h1>, otherwise any ancestor <a>
  let href =
    $h1.find('a[href]').attr('href') ||            // <h1><a ...>
    $h1.parent('a[href]').attr('href') ||          // <a><h1>...</h1></a>
    $h1.parents('a[href]').first().attr('href') || // any ancestor <a>
    null;

  return href ? new URL(href, url).href : null;    // normalize to absolute
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
              findLinkedH1Href("https://www.bungie.net/7/en/News", "This Week in Destiny")
                .then((data) => {
                  console.log(data);

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
                }).catch(async (error) => {
                  if (!replied) {
                    await interaction.editReply({ embeds: [errorEmbed()], ephemeral: true });
                    replied = true;
                  }
                  clearTimeout();
                  console.error(error);
                })

                
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