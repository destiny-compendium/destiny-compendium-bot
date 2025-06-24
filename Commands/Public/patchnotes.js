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

// Example patch notes
const patchData = {
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

  async execute(interaction, client) {
    await interaction.deferReply();

    let replied = false;

    const timeout = setTimeout(async () => {
      if (!replied) {
        await interaction.editReply({ embeds: [timeoutEmbed()] });
        replied = true;
      }
    }, 10000);

    try {
      const versionOptions = Object.keys(patchData).map((ver) => ({
        label: `Version ${ver}`,
        description: `Released on ${patchData[ver].date}`,
        value: ver,
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_patch_version")
        .setPlaceholder("Choose a patch version")
        .addOptions(versionOptions);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const initialEmbed = new EmbedBuilder()
        .setColor(0x0000ff)
        .setTitle("Patch Notes")
        .setAuthor({ name: "Destiny Compendium" })
        .setDescription("Select a patch version from the menu below.")
        .setThumbnail("https://i.imgur.com/F9KcQzL.png")
        .setTimestamp();

      await interaction.editReply({
        embeds: [initialEmbed],
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

        const embed = new EmbedBuilder()
          .setColor(0x0000ff)
          .setTitle(`Patch Notes - Version ${selected}`)
          .setAuthor({ name: "Destiny Compendium" })
          .setDescription(`**${patch.date}**\n\n${patch.description}`)
          .setThumbnail("https://i.imgur.com/F9KcQzL.png")
          .setTimestamp();

        await selectInt.update({ embeds: [embed] });
      });

      collector.on("end", async () => {
        if (!replied) {
          replied = true;
          // Disable dropdown after timeout
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