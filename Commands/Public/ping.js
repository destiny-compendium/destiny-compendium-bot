const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } = require("discord.js");

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
        .setName("ping")
        .setDescription("Ping the bot. Used as a status check.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Everyone),

        async execute(interaction) {
            await interaction.deferReply();
            let replied = false;
            
            // Set your timeout (e.g., 60 seconds)
            const timeout = setTimeout(async () => {
              if (!replied) {
                await interaction.editReply({ embeds: [timeoutEmbed()] });
                replied = true;
              }
            }, 10000); // 60,000 ms = 60 seconds

            const d1 = new Date();
            let t1 = d1.getTime();

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("Ping Test")
                .setAuthor({ name: "Destiny Compendium" })
                .setDescription(`Your ping processed in ${t1 - interaction.createdTimestamp} ms.`)
                .setThumbnail("https://i.imgur.com/iR1JvU5.png")
                .setTimestamp();

            interaction.editReply({ embeds: [embed], ephermal: true });
            clearTimeout();
            replied = true;
        },
};