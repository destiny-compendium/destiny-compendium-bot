const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { querySheet } = require("../../Util/querySheet");
const { content } = require("googleapis/build/src/apis/content");

function formatRowFromArray(row) {
    const label = row[0] || row[1] || '';      // Column A or B
    const body = row.slice(2).join('\n').trim(); // Columns C onward
    return `${label}\n\n${body}`;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getMatchScore(row, query) {
  const regex = new RegExp(`\\b${escapeRegex(query)}`, 'i');

  for (let i = 0; i < row.length; i++) {
    const cell = row[i] || '';
    if (regex.test(cell)) {
      return cell.length; // lower = better
    }
  }

  return Infinity; // no match
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function findMatchAndDescription(row, query, maxLookahead = 2) {
  const regex = new RegExp(`\\b${escapeRegex(query)}`, 'i');

  for (let i = 0; i < row.length; i++) {
    const cell = row[i] || '';
    const match = cell.match(regex);

    if (match) {
      const matchedText = match[0]; // the actual text that matched

      // Try to find a description in the next few cells
      for (let j = 1; j <= maxLookahead; j++) {
        const next = row[i + j];
        if (next && next.trim()) {
          return {
            matchedText: row[i], 
            label: row[0] || row[1] || '',
            description: next,
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
  const regex = new RegExp(`\\b${escapeRegex(query)}`, 'i');

  for (let i = 1; i < row.length; i++) {
    const cell = row[i] || '';
    const match = cell.match(regex);

    if (nextRow.length === 0) {
      return null;
    }
  
    if (match) {
      const matchedText = match[0]; // the actual text that matched
      const desc = nextRow[i-1];

      return {
        matchedText: row[i], // exact text that matched
        label: row[0] || row[1] || '',
        description: desc,
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
                { name: "Class Abilities", value: "Class Abilities" },
                { name: "Exotic Weapons", value: "Exotic Weapons" },
                { name: "Exotic Armor", value: "Exotic Armors" },
                { name: "Game Mechanics", value: "Game Mechanics" },
                { name: "Seasonal Mechanics", value: "Seasonal Mechanics" },
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
                await interaction.editReply('⏳ Timed out.');
                replied = true;
              }
            }, 10000); // 60,000 ms = 60 seconds

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
            let match = []
            
            try {
              match = rows
                .map((row, i) =>
                  category === "Artifact Perks"
                  ? findMatchAndDescriptionArtifact(row, rows[i + 1], query)
                  : findMatchAndDescription(row, query, maxLookahead)
                )
                .find(entry => entry !== null);

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
                await interaction.editReply('❌ An error occurred.');
                replied = true;
              }
              clearTimeout();
              console.error(error);
            }

            return;
        },
};