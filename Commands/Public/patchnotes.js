const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");

function failEmbed() {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("Query Failed")
    .setAuthor({ name: "Destiny Compendium" })
    .setDescription("Sorry, but your query matched no results.")
    .setThumbnail("https://i.imgur.com/MNab4aw.png")
    .setTimestamp();
}

function errorEmbed() {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("An Error Occurred")
    .setAuthor({ name: "Destiny Compendium" })
    .setDescription("Sorry, but an internal error occurred during your query.")
    .setThumbnail("https://i.imgur.com/MNab4aw.png")
    .setTimestamp();
}

function timeoutEmbed() {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("Timed Out")
    .setAuthor({ name: "Destiny Compendium" })
    .setDescription("Sorry, but your query timed out during processing.")
    .setThumbnail("https://i.imgur.com/MNab4aw.png")
    .setTimestamp();
}

// Patch data
const patchData = {
  "1.3.2": {
    date: "28/07/2025",
    description:
      "Added **The Desert Perpetual** raid to the **/loottable** command."
  },
  "1.3.1": {
    date: "08/07/2025",
    description:
      "Fixed a bug where the **/query** command would return the incorrect entry image. If the image is not found or not embeddable, it will still fallback to the 'joeCool' emoji as the image.",
  },
  "1.3.0": {
    date: "01/07/2025",
    description:
      "This version adds a new command, **/loottable**.\nThis command returns the per-encounter loot table for the specified activity (in text or graphical mode - credits to nietcool for the graphics).\n\nFor info on how to use it, you can do **/help** for the description, or just simply use it via **/loottable**.",
  },
  "1.2.0": {
    date: "29/06/2025",
    description:
      "This version adds a new command, **/rotation**.\nThis command allows you to get the **current featured activites** (the current *rotation*) in Destiny 2, for your specified category.\n\nFor info on how to use it, you can do **/help** for the description, or just simply use it via **/rotation**.",
  },
  "1.1.1": {
    date: "26/06/2025",
    description:
      "This version fixes a bug **where some cached entries would error out or display bugged data**.\n\nIt also adds a new command **/support** which displays how you can **contact us about any bugs, suggestions, etc.**",
  },
  "1.1.0": {
    date: "25/06/2025",
    description:
      "This version adds multiple features.\nIt now shows the **icon of the entry** from the spreadsheet, and will **fallback to the previous one** if not found or valid.\n\nAs an addition, any mentions of **elemental names are now accompanied by their respective icons**.",
  },
  "1.0.3": {
    date: "21/06/2025",
    description:
      "This version fixes aspects that modify grenades. Previously it would show the first modification, but it now correctly shows the actual entry.",
  },
  "1.0.2": {
    date: "21/06/2025",
    description:
      "This version makes queries looser. It ignores characters like apostrophes, spaces and dashes, so you can be less specific and still get matches.",
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("patchnotes")
    .setDescription("Display patch notes")
    .setDefaultMemberPermissions(PermissionFlagsBits.Everyone),

  async execute(interaction) {
    await interaction.deferReply();
    let replied = false;

    const timeout = setTimeout(async () => {
      if (!replied) {
        await interaction.editReply({ embeds: [timeoutEmbed()] });
        replied = true;
      }
    }, 10000);

    try {
      // Sort patch versions (semver-aware)
      const versions = Object.keys(patchData).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
      );
      const latestVersion = versions[versions.length - 1];
      const latestPatch = patchData[latestVersion];

      const embed = new EmbedBuilder()
        .setColor(0x0000ff)
        .setTitle(`Patch Notes - Version ${latestVersion}`)
        .setAuthor({ name: "Destiny Compendium" })
        .setDescription(`**${latestPatch.date}**\n\n${latestPatch.description}`)
        .setThumbnail("https://i.imgur.com/F9KcQzL.png")
        .setTimestamp();

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_patch_version")
        .setPlaceholder("Choose a patch version")
        .addOptions(
          versions.map((ver) => ({
            label: `Version ${ver}`,
            description: `Released on ${patchData[ver].date}`,
            value: ver,
            default: ver === latestVersion, // Highlight latest
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.editReply({
        embeds: [embed],
        components: [row],
        ephemeral: false,
      });

      const collector = interaction.channel.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60_000,
        filter: (i) => i.user.id === interaction.user.id,
      });

      collector.on("collect", async (selectInt) => {
        const selected = selectInt.values[0];
        const patch = patchData[selected];

        const selectedEmbed = new EmbedBuilder()
          .setColor(0x0000ff)
          .setTitle(`Patch Notes - Version ${selected}`)
          .setAuthor({ name: "Destiny Compendium" })
          .setDescription(`**${patch.date}**\n\n${patch.description}`)
          .setThumbnail("https://i.imgur.com/F9KcQzL.png")
          .setTimestamp();

          const updatedMenu = new StringSelectMenuBuilder()
          .setCustomId("select_patch_version")
          .setPlaceholder("Choose a patch version")
          .addOptions(
            versions.map((ver) => ({
              label: `Version ${ver}`,
              description: `Released on ${patchData[ver].date}`,
              value: ver,
              default: ver === selected, // <-- highlight the selected version
            }))
          );
        
        const updatedRow = new ActionRowBuilder().addComponents(updatedMenu);
        
        await selectInt.update({
          embeds: [selectedEmbed],
          components: [updatedRow],
        });        
      });

      collector.on("end", async () => {
        if (!replied) {
          replied = true;
          const disabledRow = new ActionRowBuilder().addComponents(
            selectMenu.setDisabled(true)
          );
          await interaction.editReply({ components: [disabledRow] });
        }
      });

      clearTimeout(timeout);
    } catch (error) {
      if (!replied) {
        await interaction.editReply({ embeds: [errorEmbed()] });
        replied = true;
      }
      clearTimeout(timeout);
      console.error(error);
    }
  },
};