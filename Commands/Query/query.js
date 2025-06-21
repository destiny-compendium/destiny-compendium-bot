const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { querySheet } = require("../../Util/querySheet");
const { content } = require("googleapis/build/src/apis/content");

const grenadeAspects = ["Touch of Flame", "Touch of Winter", "Touch of Thunder", "Mindspun Invocation", "Chaos Accelerant (Charged)", "Chaos Accelerant", "Chaos Accelerant\n(Charged)"];
const ignoreGrenadeList = ["grenade", "grapple", "axion", "void"];

function formatRowFromArray(row) {
    const label = row[0] || row[1] || '';      // Column A or B
    const body = row.slice(2).join('\n').trim(); // Columns C onward
    return `${label}\n\n${body}`;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeForFuzzyMatch(str) {
  return escapeRegex(str).replace(/[' -]/g, '');
}

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
    .setDescription("Sorry, but an internal error occurred during your query. **Try being more specifc with your query.**")
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

function findMatchAndDescription(row, prevRow, query, maxLookahead = 2) {
  const cleanQuery = normalizeForFuzzyMatch(query);
  const regex = new RegExp(`\\b${cleanQuery}`, 'i');

  for (let i = 0; i < row.length; i++) {
    const cell = row[i] || '';
    const normalizedCell = cell.replace(/[' -]/g, '');

    const match = normalizedCell.match(regex);

    if (match) {
      const matchedText = match[0]; // the actual text that matched
      const normalize = str => str.toLowerCase().replace(/['\s-]/g, '');
      
      // Try to find a description in the next few cells
      for (let j = 1; j <= maxLookahead; j++) {
        const next = row[i + j];
        if (next && next.trim()) {
          if (row[i].length > 250) {
            return null;
          }

          if (grenadeAspects.includes(row[i])) {
            console.log(row[i]);
            if (row[i] === "Chaos Accelerant\n(Charged)") {
              return null;
            }

            if (
              prevRow !== null && 
              typeof prevRow[i] === 'string' && 
              ignoreGrenadeList.some(kw => normalize(prevRow[i]).includes(kw))
            ) {
              return null;
            }
          }

          const formattedDescription = next.replace(/(\[?[x+~-]?\d+(?:\.\d+)?(?:[+x*/-]\d+)*(?:[%a-zA-Z]+)?\]?)/g, '**$1**'); // Bold text

          return {
            matchedText: row[i], 
            label: row[0] || row[1] || '',
            description: formattedDescription,
            sourceColumn: i,
            foundIn: row
          };
        }
      }

      return null; // match but no valid description
    }
  }

  return null; // no match
}

function findMatchAndDescriptionArtifact(row, nextRow, query) {
  const cleanQuery = normalizeForFuzzyMatch(query);
  const regex = new RegExp(`\\b${cleanQuery}`, 'i');

  for (let i = 1; i < row.length; i++) {
    const cell = row[i] || '';
    const normalizedCell = cell.replace(/[' -]/g, '');

    if (nextRow.length === 0) {
      return null;
    }

    const match = normalizedCell.match(regex);

    if (match) {
      const matchedText = match[0]; // the actual text that matched
      const desc = nextRow[i-1];

      if (row[i].length > 250) {
        return null;
      }

      const formattedDescription = desc.replace(/(\[?[x+~-]?\d+(?:\.\d+)?(?:[+x*/-]\d+)*(?:[%a-zA-Z]+)?\]?)/g, '**$1**');

      return {
        matchedText: row[i], // exact text that matched
        label: row[0] || row[1] || '',
        description: formattedDescription,
        sourceColumn: i,
        foundIn: row
      };
    } 
  }
  return null; //no match
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName("query")
        .setDescription("Query the Compendium")
        .setDefaultMemberPermissions(PermissionFlagsBits.Everyone)
        .addStringOption(option => option.setName("category").setDescription("Query category").setRequired(true)
            .addChoices(
                { name: "Weapon/Armor Perks", value: "Weapon/Armor Perks" },
                { name: "Weapon Mods", value: "Weapon Mods" },
                { name: "Artifact Perks", value: "Artifact Perks" },
                { name: "Armor Mods", value: "Armor Mods" },
                { name: "Arc", value: "Arc" },
                { name: "Solar", value: "Solar" },
                { name: "Void", value: "Void" },
                { name: "Stasis", value: "Stasis" },
                { name: "Strand", value: "Strand" },
                { name: "Prismatic", value: "Prismatic" },
                { name: "Exotic Class", value: "Exotic Class" },
                { name: "Exotic Weapons", value: "Exotic Weapons" },
                { name: "Exotic Armor", value: "Exotic Armors" },
                { name: "Old Episodic Artifact Perks", value: "Old Episodic Artifact Perks" },
        ))
        .addStringOption(option => option.setName("query").setDescription("Query string").setRequired(true)),

        async execute(interaction, client) {
            const category = interaction.options.getString("category");
            const query = interaction.options.getString("query");

            if (query === "" || query === null || query === undefined) {
                interaction.reply({ content: "You need to specify a query.", ephermal: true });
                return;
            }

            await interaction.deferReply();

            let replied = false;

            // Set your timeout (e.g., 60 seconds)
            const timeout = setTimeout(async () => {
              if (!replied) {
                await interaction.editReply({ embeds: [timeoutEmbed()] });
                replied = true;
              }
            }, 10000); // 60,000 ms = 60 seconds

            // Attempt to first query the local cache
            let cursor = "0";
            const redisPattern = "*" + query + "*"; // Redis wildcard is "*"
            let firstMatch = null;

            do {
              const { cursor: nextCursor, keys } = await client.redis.scan(cursor, {
                MATCH: redisPattern,
                COUNT: 100
              });

              if (keys.length > 0) {
                firstMatch = keys[0];
                break;
              }

              cursor = nextCursor;

            } while (cursor !== "0");

            // Eh, it works or something
            if (firstMatch) {
              const value = await client.redis.get(firstMatch);

              try {
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle(firstMatch)
                    .setAuthor({ name: "Destiny Compendium" })
                    .setDescription(value)
                    .setThumbnail("https://i.imgur.com/iR1JvU5.png")
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
            } else {
              const range = category + "!A1:Z";
              const id = client.sheetid;

              const res = await client.sheets.spreadsheets.values.get({
                  spreadsheetId: id,
                  range,
                  majorDimension: "ROWS",
              });
            
              const values = res.data.values;
            
              if (!Array.isArray(values) || values.length === 0) {
                  return []; // no data or sheet is empty
              }
            
              const [headers, ...rows] = values;
              const regex = new RegExp(`^${escapeRegex(query)}`, 'i');  // case-insensitive partial match

              const columnIndexes = [0, 1];
              const skipIndexes = new Set([0, 1]);

              // Rank all matching rows by score (shortest matched cell)
              const maxLookahead = category === "Exotic Weapons" ? 3 : 2;
              let match = [];

              try {
                if (category === "Artifact Perks" || category === "Old Episodic Artifact Perks") {
                  for (let i = 0; i < rows.length - 1; i++) {
                    match = findMatchAndDescriptionArtifact(rows[i], rows[i+1], query);
                    if (match !== null) {
                      break;
                    }
                  }
                } else {
                  for (let i = 0; i < rows.length; i++) {
                    let prev = null;
                    if (i !== 0) { prev = rows[i-1] }
                    match = findMatchAndDescription(rows[i], prev, query, maxLookahead);
                    if (match !== null) {
                      break;
                    }
                  }
                  /*match = rows
                    .map(row => findMatchAndDescription(row, query, maxLookahead))
                    .find(entry => entry !== null);
                  */
                }
                //const output = match
                //  ? `**${match.matchedText}**\n\n${match.description}`
                //  : 'No matching entry with a description found.';

                //const splitData = output.split("\n"); // Pretty shit solution ngl

                if (match) {
                  const embed = new EmbedBuilder()
                      .setColor(0x00FF00)
                      .setTitle(match.matchedText)
                      .setAuthor({ name: "Destiny Compendium" })
                      .setDescription(match.description)
                      .setThumbnail("https://i.imgur.com/iR1JvU5.png")
                      .setTimestamp();

                  interaction.editReply({
                    embeds: [embed],
                    ephemeral: false
                  });
                  
                  // Store in Redis
                  await client.redis.set(match.matchedText, match.description); 
                } else {
                  interaction.editReply({
                    embeds: [failEmbed()],
                    ephemeral: false
                  });
                }
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
            }

            return;
        },
};