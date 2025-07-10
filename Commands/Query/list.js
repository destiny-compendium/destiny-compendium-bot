const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { querySheet } = require("../../Util/querySheet");
const { content } = require("googleapis/build/src/apis/content");

const fs = require('fs');
const path = require('path');

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

function extractImageUrl(cell) {
  const match = typeof cell === 'string' && cell.match(/=IMAGE\("([^"]+)"\)/i);
  return match ? match[1] : null;
}

function normalizeForFuzzyMatch(str) {
  return escapeRegex(str).replace(/[' -]/g, '');
}

function failEmbed(query, processTime) {
  return new EmbedBuilder()
	  .setColor(0xFF0000)
	  .setTitle("Query Failed")
	  .setAuthor({ name: "Destiny Compendium" })
    .setDescription("Sorry, but your query matched no results.")
	  .setThumbnail("https://i.imgur.com/MNab4aw.png")
	  .setTimestamp()
    .setFooter({ text: `Queried for '${query}' - Processed in ${processTime} ms` });
}

function errorEmbed(unspec = false) {
  return new EmbedBuilder()
	  .setColor(0xFF0000)
	  .setTitle("An Error Occurred")
	  .setAuthor({ name: "Destiny Compendium" })
    .setDescription(unspec ? "You need to specify a query." : "Sorry, but an internal error occurred during your query.")
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

function findMatchAndDescription(row, prevRow, nextRow, query, maxLookahead, isArtifact) {
  const cleanQuery = normalizeForFuzzyMatch(query);
  const regex = new RegExp(cleanQuery, 'i');

  const subclassKeywords = ['solar', 'arc', 'void', 'kinetic', 'strand', 'stasis'];
  const subclassIcons = require("../../Resources/resources.json").icons;

  for (let i = 0; i < row.length; i++) {
    const cell = row[i] || '';
    const normalizedCell = cell.replace(/[' -]/g, '');

    const match = normalizedCell.match(regex);

    if (match) {
      console.log(`[MATCH] Found match for '${query}' in cell [${i}]: '${row[i]}'`);
    
      const entryTitle = row[i];

      return entryTitle;
    }
  }

  return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("list")
        .setDescription("List all hits in your query (used before **/query** to better know what to look for)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Everyone)
        .addStringOption(option => option.setName("category").setDescription("List category").setRequired(true)
            .addChoices(
                { name: "Gear Perks", value: "Gear Perks" },
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

            await interaction.deferReply();

            let replied = false;

            // Set your timeout (e.g., 60 seconds)
            const timeout = setTimeout(async () => {
              if (!replied) {
                await interaction.editReply({ embeds: [timeoutEmbed()] });
                replied = true;
              }
            }, 10000); // 60,000 ms = 60 seconds
            
            if (query === "" || query === null || query === undefined) {
              interaction.editReply({ embeds: [errorEmbed(true)], ephermal: false });
              return;
            }

            const range = category + "!A1:Z"; // The whole sheet
            const id = client.sheetid;

            const res = await client.sheets.spreadsheets.get({
              spreadsheetId: id,
              ranges: [range],
              includeGridData: true,
              fields: 'sheets.data.rowData.values(userEnteredValue,effectiveValue,formattedValue)'
            });

            const grid = res.data.sheets?.[0]?.data?.[0]?.rowData || [];
              
            const values = grid.map(row =>
              (row.values || []).map(cell =>
                cell?.userEnteredValue?.formulaValue ??
                cell?.effectiveValue?.stringValue ??
                cell?.formattedValue ?? ''
              )
            );

            if (!Array.isArray(values) || values.length === 0) {
                return []; // no data or sheet is empty
            }
            
            const [headers, ...rows] = values;
            const regex = new RegExp(`^${escapeRegex(query)}`, 'i');  // case-insensitive partial match

            const columnIndexes = [0, 1];
            const skipIndexes = new Set([0, 1]);

            // Rank all matching rows by score (shortest matched cell)
            const maxLookahead = category === "Exotic Weapons" ? 3 : 2;
            const isArtifact = (category === "Artifact Perks" || category === "Old Episodic Artifact Perks");
            let match = [];

            try {
              let listings = [];

              for (let i = 0; i < rows.length; i++) {
                let prev = null;
                let next = null;
                if (i !== 0) { prev = rows[i-1] }
                if (i < rows.length - 1) { next = rows[i+1] }
                match = findMatchAndDescription(rows[i], prev, next, query, maxLookahead, isArtifact);
                if (match !== null) {
                  listings.push(match);
                }
              }

              if (match) {
                const processTime = Date.now() - interaction.createdTimestamp;

                let descFilled = "Your query returned the following listing of hits:\n";

                if (listings.length > 0) {
                  for (let i = 0; i < listings.length; i++) {
                    descFilled += ` - ${listings[i]}\n`;
                  }
                } else {
                  descFilled += " - NONE";
                }

                const embed = new EmbedBuilder()
                  .setColor(0x00FF00)
                  .setTitle(match.matchedText)
                  .setAuthor({ name: "Destiny Compendium" })
                  .setDescription(descFilled)
                  .setTimestamp()
                  .setThumbnail("https://i.imgur.com/iR1JvU5.png")
                  .setFooter({ text: `Queried for '${query}' - Processed in ${processTime} ms` });

                interaction.editReply({
                  embeds: [embed],
                  ephemeral: false
                });

              } else {
                interaction.editReply({
                  embeds: [failEmbed(query, Date.now() - interaction.createdTimestamp)],
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

            return;
        },
};