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
      const matchedText = match[0];
      const normalize = str => str.toLowerCase().replace(/['\s-]/g, '');
      let description = "";
      let validDesc = false;
    
      console.log(`[MATCH] Found match for '${query}' in cell [${i}]: '${row[i]}'`);
    
      // image scan
      let rawImageCell = null;
      for (let offset = 1; offset < row.length; offset++) {
        const leftIndex = i - 1;
        const rightIndex = i + 1;
      
        if (leftIndex >= 0) {
          const left = row[leftIndex];
          if (left && typeof left === 'string' && (left.includes('=IMAGE(') || left.startsWith('http'))) {
            rawImageCell = left;
            console.log(`[IMAGE] Found image to the LEFT at column ${leftIndex}: ${left}`);
            break;
          }
        }
      
        if (rightIndex < row.length) {
          const right = row[rightIndex];
          if (right && typeof right === 'string' && (right.includes('=IMAGE(') || right.startsWith('http'))) {
            rawImageCell = right;
            console.log(`[IMAGE] Found image to the RIGHT at column ${rightIndex}: ${right}`);
            break;
          }
        }
      }

      if (isArtifact) {
        if (!nextRow || nextRow.length === 0) return null;
      
        const potentialDesc = nextRow[i - 1];
        if (typeof potentialDesc === 'string' && potentialDesc.toUpperCase().includes('IMAGE')) {
          console.log(`[DESC] Skipped nextRow[${i - 1}] because it includes IMAGE`);
          return null;
        }
      
        description = potentialDesc;
        validDesc = true;
        console.log(`[DESC] Artifact mode: using nextRow[${i - 1}] as description`);
      } else {
        for (let j = 1; j <= maxLookahead; j++) {
          const next = row[i + j];
          if (next && next.trim()) {
            if (next.toUpperCase().includes('IMAGE')) {
              console.log(`[DESC] Skipped row[${i + j}] as it includes IMAGE`);
              continue;
            }
      
            if (row[i].length > 250) return null;
      
            if (grenadeAspects.includes(row[i]) || row[i].toLowerCase().includes("handheld")) {
              if (
                prevRow &&
                typeof prevRow[i] === 'string' &&
                ignoreGrenadeList.some(kw => normalize(prevRow[i]).includes(kw))
              ) {
                console.log(`[SKIP] Skipping grenade aspect due to blacklist`);
                return null;
              }
            }
      
            description = next;
            validDesc = true;
            console.log(`[DESC] Using row[${i + j}] as description`);
            break;
          }
        }
      }      

      if (!validDesc) {
        console.log(`[DESC] No valid description found`);
        return null;
      }

      const entryTitle = row[i];
      let formattedDescription = description.replace(
        /(\[?[x+~-]?\d+(?:\.\d+)?(?:[+x*/-]\d+)*(?:[%a-zA-Z]+)?\]?)/g,
        '**$1**'
      );

      for (const keyword of subclassKeywords) {
        const emoji = subclassIcons[keyword];
        if (!emoji) continue;

        const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
        formattedDescription = formattedDescription.replace(regex, `${emoji} $1`);
      }

      return {
        matchedText: entryTitle,
        label: row[0] || row[1] || '',
        description: formattedDescription,
        sourceColumn: i,
        foundIn: row,
        rawImageCell
      };
    }
  }

  return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("query")
        .setDescription("Query the Compendium")
        .setDefaultMemberPermissions(PermissionFlagsBits.Everyone)
        .addStringOption(option => option.setName("category").setDescription("Query category").setRequired(true)
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
            
            if (query === "dn") {
              const epicoembedico = new EmbedBuilder()
              	.setColor(0xFF0000)
              	.setTitle("haha funny")
              	.setAuthor({ name: "Destiny Compendium" })
                .setDescription("Deez Nuts or something")
              	.setThumbnail("https://i.imgur.com/wzVs8Xq.png")
              	.setTimestamp();

              interaction.editReply({ embeds: [epicoembedico], ephemeral: false });
              replied = true;
              return;
            }

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
              if (firstMatch.startsWith("image.")) {
                firstMatch = firstMatch.replace("image.", ""); // Dirty fix for the bug that happens when fetching a cached entry for "Willbreaker Munitions".
              }

              const value = await client.redis.get(firstMatch);
              const imageBase64 = await client.redis.get(`image.${firstMatch}`);
            
              try {
                const processTime = Date.now() - interaction.createdTimestamp;
            
                const embed = new EmbedBuilder()
                  .setColor(0x00FF00)
                  .setTitle(firstMatch)
                  .setAuthor({ name: "Destiny Compendium" })
                  .setDescription(value)
                  .setTimestamp()
                  .setFooter({ text: `Queried for '${query}' - Processed in ${processTime} ms` });
            
                if (imageBase64) {
                  // This is not actually base64, I'm just lazy and don't want to refactor
                  embed.setThumbnail(imageBase64);
                  console.log(`[REDIS] Using cached image for: image.${firstMatch}`);
                } else {
                  embed.setThumbnail("https://i.imgur.com/iR1JvU5.png");
                  console.log(`[REDIS] No image found for: image.${firstMatch}, using fallback.`);
                }
            
                await interaction.editReply({
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
                for (let i = 0; i < rows.length; i++) {
                  let prev = null;
                  let next = null;
                  if (i !== 0) { prev = rows[i-1] }
                  if (i < rows.length - 1) { next = rows[i+1] }
                  match = findMatchAndDescription(rows[i], prev, next, query, maxLookahead, isArtifact);
                  if (match !== null) {
                    break;
                  }
                }

                if (match) {
                  const processTime = Date.now() - interaction.createdTimestamp;

                  let imageBase64 = null;
                  
                  if (match.rawImageCell && typeof match.rawImageCell === 'string') {
                    const imageUrl = extractImageUrl(match.rawImageCell) || (
                      match.rawImageCell.startsWith("http") ? match.rawImageCell : null
                    );
                  
                    if (imageUrl) {
                      try {
                        //const axios = require('axios');
                        //const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                        //const mimeType = response.headers['content-type'];
                        //const base64 = Buffer.from(response.data, 'binary').toString('base64');
                        //imageBase64 = `data:${mimeType};base64,${base64}`;
                        
                        imageBase64 = imageUrl;
                        await client.redis.set(`image.${match.matchedText}`, imageUrl);
                      } catch (err) {
                        console.warn("Image store failed:", err.message);
                      }
                    }
                  }

                  const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle(match.matchedText)
                    .setAuthor({ name: "Destiny Compendium" })
                    .setDescription(match.description)
                    .setTimestamp()
                    .setFooter({ text: `Queried for '${query}' - Processed in ${processTime} ms` });

                  if (imageBase64) {
                    embed.setThumbnail(imageBase64);
                  } else {
                    embed.setThumbnail("https://i.imgur.com/iR1JvU5.png");
                  }

                  interaction.editReply({
                    embeds: [embed],
                    ephemeral: false
                  });

                  await client.redis.set(match.matchedText, match.description);
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
            }

            return;
        },
};