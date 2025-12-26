const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const { querySheet } = require("../../Util/querySheet");
const { content } = require("googleapis/build/src/apis/content");

const fs = require('fs');
const path = require('path');

const grenadeAspects = ["Touch of Flame", "Touch of Winter", "Touch of Thunder", "Mindspun Invocation", "Chaos Accelerant (Charged)", "Chaos Accelerant", "Chaos Accelerant\n(Charged)"];
const ignoreGrenadeList = ["grenade", "grapple", "axion", "void"];
const doubleLineEntries = ["AION Renewal", "AION Adapter", "Bushido", "Collective Psyche", "Last Discipline", "Lustrous", "Techsec", "Twofold Crown"];

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

function cleanTextForDropdown(str) {
  // Remove markdown formatting (**, __, ~~, *, _, etc.)
  let cleaned = str.replace(/\*\*|__|\*|_|~~|`/g, '');
  // Remove emoji embeds like <:name:id> and custom emoji patterns
  cleaned = cleaned.replace(/<:[^:]+:\d+>|<:[^>]+>/g, '');
  // Remove extra whitespace
  cleaned = cleaned.trim();
  return cleaned;
}

// Distance-based helpers for fuzzy matching
function normalizeForDistance(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '');
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cb = b.charCodeAt(j - 1);
      const cost = ca === cb ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

function similarityRatio(a, b) {
  if (!a && !b) return 1;
  const da = normalizeForDistance(a);
  const db = normalizeForDistance(b);
  if (da.length === 0 || db.length === 0) return 0;
  const dist = levenshtein(da, db);
  const denom = Math.max(da.length, db.length);
  return 1 - dist / denom; // 0..1, higher is better
}

// Collapse duplicated letters to improve tolerance to repeated keystrokes
function condenseRepeats(normalizedStr) {
  const s = (normalizedStr || '');
  // Reduce any run of the same alphanumeric to a single occurrence
  return s.replace(/([a-z0-9])\1+/gi, '$1');
}

// Similarity that also considers a condensed (duplicate-collapsed) comparison
function similarityRatioWithRepeatTolerance(a, b) {
  const da = normalizeForDistance(a);
  const db = normalizeForDistance(b);
  if (da.length === 0 || db.length === 0) return 0;

  const baseDist = levenshtein(da, db);
  const baseDenom = Math.max(da.length, db.length);
  const baseRatio = 1 - baseDist / baseDenom;

  const daC = condenseRepeats(da);
  const dbC = condenseRepeats(db);
  const condDist = levenshtein(daC, dbC);
  const condDenom = Math.max(daC.length, dbC.length);
  const condRatio = 1 - condDist / condDenom;

  return Math.max(baseRatio, condRatio);
}

function getDescriptionForCell(row, prevRow, nextRow, i, maxLookahead, isArtifact) {
  const normalize = str => (str || '').toLowerCase().replace(/['\s-]/g, '');

  // Find nearby image (simple left/right scan)
  let rawImageCell = null;
  for (let offset = 1; offset < row.length; offset++) {
    const leftIndex = i - offset;
    const rightIndex = i + offset;

    if (leftIndex >= 0) {
      const left = row[leftIndex];
      if (left && typeof left === 'string' && (left.includes('=IMAGE(') || left.startsWith('http'))) {
        rawImageCell = left;
        break;
      }
    }

    if (rightIndex < row.length) {
      const right = row[rightIndex];
      if (right && typeof right === 'string' && (right.includes('=IMAGE(') || right.startsWith('http'))) {
        rawImageCell = right;
        break;
      }
    }
  }

  let description = '';
  let validDesc = false;

  if (isArtifact) {
    if (!nextRow || nextRow.length === 0) return null;
    const potentialDesc = nextRow[i - 1];
    if (typeof potentialDesc === 'string' && potentialDesc.toUpperCase().includes('IMAGE')) {
      return null;
    }
    description = potentialDesc;
    validDesc = true;
  } else {
    for (let j = 1; j <= maxLookahead; j++) {
      const next = row[i + j];
      if (next && typeof next === 'string' && next.trim()) {
        if (next.toUpperCase().includes('IMAGE')) {
          continue;
        }

        if ((row[i] || '').length > 250) return null;

        if (grenadeAspects.includes(row[i]) || (row[i] || '').toLowerCase().includes('handheld')) {
          if (
            prevRow &&
            typeof prevRow[i] === 'string' &&
            ignoreGrenadeList.some(kw => normalize(prevRow[i]).includes(kw))
          ) {
            return null;
          }
        }

        description = next;
        validDesc = true;

        const additional = nextRow?.[i + j];
        const shouldAppend = typeof additional === 'string' && doubleLineEntries.some(kw => (row[i] || '').includes(kw));
        if (shouldAppend) {
          description += `\n\n${additional};`;
        }
        break;
      }
    }
  }

  if (!validDesc) return null;
  return { description, rawImageCell };
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
    
      const descObj = getDescriptionForCell(row, prevRow, nextRow, i, maxLookahead, isArtifact);
      if (!descObj) {
        console.log(`[DESC] No valid description found`);
        return null;
      }
      description = descObj.description;
      validDesc = true;
      const rawImageCell = descObj.rawImageCell;

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

function findBestFuzzyMatch(rows, query, maxLookahead, isArtifact) {
  const subclassKeywords = ['solar', 'arc', 'void', 'kinetic', 'strand', 'stasis'];
  const subclassIcons = require("../../Resources/resources.json").icons;

  const candidates = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (!cell || typeof cell !== 'string') continue;
      const ratio = similarityRatioWithRepeatTolerance(cell, query);
      if (!isFinite(ratio)) continue;
      // Collect all; we'll filter by threshold after sorting
      candidates.push({ r, c, cell, ratio });
    }
  }

  // Sort by highest similarity first
  candidates.sort((a, b) => b.ratio - a.ratio);

  const MIN_RATIO = 0.6; // tolerant for typos
  for (const cand of candidates.slice(0, 50)) { // try top 50 to keep it fast
    if (cand.ratio < MIN_RATIO) break;
    const row = rows[cand.r];
    const prev = cand.r > 0 ? rows[cand.r - 1] : null;
    const next = cand.r < rows.length - 1 ? rows[cand.r + 1] : null;

    const descObj = getDescriptionForCell(row, prev, next, cand.c, maxLookahead, isArtifact);
    if (!descObj || !descObj.description) continue;

    let formattedDescription = descObj.description.replace(
      /(\[?[x+~-]?\d+(?:\.\d+)?(?:[+x*/-]\d+)*(?:[%a-zA-Z]+)?\]?)/g,
      '**$1**'
    );

    for (const keyword of subclassKeywords) {
      const emoji = subclassIcons[keyword];
      if (!emoji) continue;
      const re = new RegExp(`\\b(${keyword})\\b`, 'gi');
      formattedDescription = formattedDescription.replace(re, `${emoji} $1`);
    }

    return {
      matchedText: row[cand.c],
      label: row[0] || row[1] || '',
      description: formattedDescription,
      sourceColumn: cand.c,
      foundIn: row,
      rawImageCell: descObj.rawImageCell,
      similarity: cand.ratio
    };
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
              interaction.editReply({ embeds: [errorEmbed(true)], ephemeral: false });
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

            const range = category + "!A1:Z"; // The whole sheet
            const id = client.sheetid;

            try {
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
                  await interaction.editReply({
                    embeds: [failEmbed(query, Date.now() - interaction.createdTimestamp)],
                    ephemeral: false
                  });
                  clearTimeout(timeout);
                  replied = true;
                  return;
              }
            
              const [headers, ...rows] = values;

              // Collect ALL matching results
              const maxLookahead = category === "Exotic Weapons" ? 3 : 2;
              const isArtifact = (category === "Artifact Perks" || category === "Old Episodic Artifact Perks");
              let matches = [];

              for (let i = 0; i < rows.length; i++) {
                let prev = null;
                let next = null;
                if (i !== 0) { prev = rows[i-1] }
                if (i < rows.length - 1) { next = rows[i+1] }
                const match = findMatchAndDescription(rows[i], prev, next, query, maxLookahead, isArtifact);
                if (match !== null) {
                  matches.push(match);
                }
              }

              if (matches.length === 0) {
                // Fuzzy fallback: find closest result for typos/misspellings
                const best = findBestFuzzyMatch(rows, query, maxLookahead, isArtifact);
                if (!best) {
                  await interaction.editReply({
                    embeds: [failEmbed(query, Date.now() - interaction.createdTimestamp)],
                    ephemeral: false
                  });
                  clearTimeout(timeout);
                  replied = true;
                  return;
                }

                const processTimeFuzzy = Date.now() - interaction.createdTimestamp;

                let imageBase64 = null;
                if (best.rawImageCell && typeof best.rawImageCell === 'string') {
                  const imageUrl = extractImageUrl(best.rawImageCell) || (
                    best.rawImageCell.startsWith("http") ? best.rawImageCell : null
                  );
                  if (imageUrl) {
                    try {
                      imageBase64 = imageUrl;
                      await client.redis.set(`image.${best.matchedText}`, imageUrl);
                    } catch (err) {
                      console.warn("Image store failed:", err.message);
                    }
                  }
                }

                const percent = Math.round((best.similarity || 0) * 100);
                const embed = new EmbedBuilder()
                  .setColor(0xF1C40F)
                  .setTitle(best.matchedText)
                  .setAuthor({ name: "Destiny Compendium" })
                  .setDescription(best.description)
                  .setTimestamp()
                  .setFooter({ text: `No exact match. Showing closest (${percent}%). Auto-corrected from '${query}'. Processed in ${processTimeFuzzy} ms` });

                if (imageBase64) embed.setThumbnail(imageBase64); else embed.setThumbnail("https://i.imgur.com/iR1JvU5.png");

                await interaction.editReply({
                  embeds: [embed],
                  ephemeral: false
                });

                await client.redis.set(best.matchedText, best.description);
                clearTimeout(timeout);
                replied = true;
                return;
              }

              const processTime = Date.now() - interaction.createdTimestamp;

              // If only one match, show it directly
              if (matches.length === 1) {
                const match = matches[0];
                let imageBase64 = null;
                
                if (match.rawImageCell && typeof match.rawImageCell === 'string') {
                  const imageUrl = extractImageUrl(match.rawImageCell) || (
                    match.rawImageCell.startsWith("http") ? match.rawImageCell : null
                  );
                
                  if (imageUrl) {
                    try {
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

                await interaction.editReply({
                  embeds: [embed],
                  ephemeral: false
                });

                await client.redis.set(match.matchedText, match.description);
              } else {
                // Multiple matches - show as select menu
                const selectMenu = new StringSelectMenuBuilder()
                  .setCustomId(`query_select_${interaction.id}`)
                  .setPlaceholder('Select a result...')
                  .setMaxValues(1);

                // Add options (limit to 25 as per Discord's restriction)
                matches.slice(0, 25).forEach((match, index) => {
                  selectMenu.addOptions({
                    label: match.matchedText.substring(0, 100),
                    value: index.toString(),
                    description: cleanTextForDropdown(match.description).substring(0, 100) || 'No description'
                  });
                });

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const embed = new EmbedBuilder()
                  .setColor(0x0099FF)
                  .setTitle("Multiple Results Found")
                  .setAuthor({ name: "Destiny Compendium" })
                  .setDescription(`Found ${matches.length} results for '${query}'. Select one below to view details.`)
                  .setTimestamp()
                  .setFooter({ text: `Processed in ${processTime} ms` });

                await interaction.editReply({
                  embeds: [embed],
                  components: [row],
                  ephemeral: false
                });

                // Store matches in a temporary cache for the selection handler
                // Use the message ID so select menu interactions can retrieve it
                const message = await interaction.fetchReply();
                await client.redis.set(`query_matches_${message.id}`, JSON.stringify(matches));
                await client.redis.expire(`query_matches_${message.id}`, 3600); // Expire after 1 hour
              }

              clearTimeout(timeout);
              replied = true;

            } catch (error) {
              if (!replied) {
                await interaction.editReply({ embeds: [errorEmbed()] });
                replied = true;
              }
              clearTimeout(timeout);
              console.error(error);
            }

            return;
        },
  findMatchAndDescription,
  escapeRegex,
  extractImageUrl,
  cleanTextForDropdown
};