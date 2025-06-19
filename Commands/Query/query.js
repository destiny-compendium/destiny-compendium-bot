const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, range } = require("discord.js");
const { querySheet } = require("../../Util/querySheet");
const { content } = require("googleapis/build/src/apis/content");

function formatRowFromArray(row) {
    const label = row[0] || row[1] || '';      // Column A or B
    const body = row.slice(2).join('\n').trim(); // Columns C onward
    return `${label}\n\n${body}`;
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
            const regex = new RegExp(query, 'i');  // case-insensitive partial match
                    
            const columnIndexes = [0, 1];
            const skipIndexes = new Set([0, 1]);
                    
            const final = rows
              .filter(row => columnIndexes.some(i => regex.test(row[i] || '')))
              .map(row => {
                const label = row[0] || row[1] || ''; // First non-empty A or B
                const content = headers.reduce((obj, h, i) => {
                  if (!skipIndexes.has(i)) {
                    obj[h] = row[i] || '';
                  }
                  return obj;
                }, {});
            
                const contentStr = Object.values(content).join('\n').trim();
                return `${label}\n\n${contentStr}`;
              });
          
            const output = final.join('\n\n---\n\n'); // Separator between entries
            
            console.log(output);
            interaction.reply({
              content: output || 'No matching data found.',
              ephemeral: false
            });

            return;
        },
};