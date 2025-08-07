const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { escapeRegex } = require("./query");
const { findMatchAndDescription } = require("./query");
const grenadeAspects = ["Touch of Flame", "Touch of Winter", "Touch of Thunder", "Mindspun Invocation", "Chaos Accelerant (Charged)", "Chaos Accelerant", "Chaos Accelerant\n(Charged)"];
const ignoreGrenadeList = ["grenade", "grapple", "axion", "void"];

function normalizeForFuzzyMatch(str) {
  return escapeRegex(str).replace(/[' -]/g, '');
}

function failEmbed(query, processTime) {
  return new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle("Query Failed")
    .setAuthor({ name: "Destiny Compendium" })
    .setDescription("No entries matched your query.")
    .setThumbnail("https://i.imgur.com/MNab4aw.png")
    .setFooter({ text: `Query: '${query}' • ${processTime} ms` })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("List all entries that match your query")
    .setDefaultMemberPermissions(PermissionFlagsBits.Everyone)
    .addStringOption(option => option.setName("category").setDescription("Compendium category").setRequired(true)
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
    .addStringOption(option => option.setName("query").setDescription("The search string").setRequired(true)),

  async execute(interaction, client) {
    const category = interaction.options.getString("category");
    const query = interaction.options.getString("query");

    await interaction.deferReply();

    try {
      const sheetId = client.sheetid;
      const range = category + "!A1:Z";

      const res = await client.sheets.spreadsheets.get({
        spreadsheetId: sheetId,
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
        await interaction.editReply({ content: "Sheet appears to be empty." });
        return;
      }

      const [headers, ...rows] = values;
      const maxLookahead = category === "Exotic Weapons" ? 3 : 2;
      const isArtifact = (category === "Artifact Perks" || category === "Old Episodic Artifact Perks");

      const matches = [];

      for (let i = 0; i < rows.length; i++) {
        const prev = i !== 0 ? rows[i - 1] : null;
        const next = i < rows.length - 1 ? rows[i + 1] : null;

        const result = findMatchAndDescription(rows[i], prev, next, query, maxLookahead, isArtifact);
        if (result !== null) {
          matches.push(result.matchedText);
        }
      }

      const processTime = Date.now() - interaction.createdTimestamp;

      if (matches.length > 0) {
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle(`Matches for "${query}" in ${category}`)
          .setAuthor({ name: "Destiny Compendium" })
          .setDescription(matches.slice(0, 20).map((match, i) => `${i + 1}. ${match}`).join("\n"))
          .setFooter({ text: `Found ${matches.length} result(s) • ${processTime} ms` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

      } else {
        await interaction.editReply({ embeds: [failEmbed(query, processTime)] });
      }

    } catch (error) {
      console.error("List command failed:", error);
      await interaction.editReply({ content: "An error occurred while processing your request." });
    }
  }
};
