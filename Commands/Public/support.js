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

module.exports = {
    data: new SlashCommandBuilder()
        .setName("support")
        .setDescription("Display bot support info")
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
                const embed = new EmbedBuilder()
                    .setColor(0x0000FF)
                    .setTitle("Bot support")
                    .setAuthor({ name: "Destiny Compendium" })
                    .setDescription(
                        `The **Destiny Compendium Bot support** can be contacted in several ways.\n
                        You can contact the developers via **Discord DMs** by sending a DM to **dcrubro** or **zshiso**.\n
                        You can also contact **dcrubro** by sending an email to **info@dcrubro.com**.\n
                        *Note: Contacting via DMs might not get seen due to Discord privacy settings. An email has a higher chance of being seen.*`
                    )
                    .setThumbnail("https://i.imgur.com/F9KcQzL.png")
                    .setTimestamp();
                
                interaction.editReply({
                  embeds: [embed],
                  ephemeral: true
                });
              clearTimeout();
              replied = true;
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