const axios = require("axios");
const cheerio = require("cheerio");
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

// Normalize text for reliable matching
const normalize = (s) =>
  s?.toString()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase() ?? "";

async function findLinkedH1Href(url, needle, opts = {}) {
  const {
    timeout = 15000,
    strictParentOnly = false, // if true, only accepts <a><h1>...</h1></a>
    debug = false
  } = opts;

  // Try to look like a real browser; helps avoid consent/bot variants
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9"
  };

  let html;
  try {
    const res = await axios.get(url, { headers, timeout, responseType: "text", maxRedirects: 5 });
    html = res.data;
  } catch (e) {
    if (debug) console.error("Request failed:", e.message);
    return null;
  }

  const $ = cheerio.load(html);
  const normNeedle = normalize(needle);

  // Grab all H1s and show what we saw if debugging
  const h1s = $("h1").toArray();
  if (debug) {
    console.log(`Found ${h1s.length} <h1> elements`);
    h1s.slice(0, 5).forEach((el, i) => {
      console.log(`[h1 #${i}]`, normalize($(el).text()).slice(0, 140));
    });
  }

  // Find first H1 whose normalized text contains the needle
  const h1 = h1s.find((el) => normalize($(el).text()).includes(normNeedle));
  if (!h1) {
    if (debug) console.warn("No <h1> matched the needle.");
    return null;
  }

  const $h1 = $(h1);

  // Try: link inside H1
  let $link = $h1.find("a[href]").first();
  // Try: direct parent <a> (i.e., <a><h1>...</h1></a>)
  if (!$link.length) $link = $h1.parent("a[href]").first();
  // Try: any ancestor <a> (sometimes wrappers are higher up)
  if (!$link.length && !strictParentOnly) $link = $h1.parents("a[href]").first();

  if (debug) {
    console.log("Matched H1 text:", normalize($h1.text()).slice(0, 200));
    console.log("Link found?", $link.length > 0);
  }

  if (!$link.length) return null;

  const rawHref = $link.attr("href");
  if (!rawHref) return null;

  // Resolve to absolute URL relative to the page URL
  try {
    return new URL(rawHref, url).href;
  } catch {
    return rawHref; // fallback: return as-is if URL constructor balks
  }
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
              (async () => {
  const href = await findLinkedH1Href(
    "https://example.com",
    "Your Title",
    { debug: true, strictParentOnly: false }
  );
  console.log("Resolved href:", href);
})();

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