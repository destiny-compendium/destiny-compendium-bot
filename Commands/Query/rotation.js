const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const refetchBungie = require("../../Util/refetchBungie");
const globals = require("../../Util/globals");

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
        .setName("rotation")
        .setDescription("Get the current featured activity rotation and their rewards.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Everyone)
        .addStringOption(option => option.setName("category").setDescription("Query category").setRequired(true)
            .addChoices(
                { name: "Raids", value: "Raid" },
                { name: "Dungeons", value: "Dungeon" },
                { name: "Exotic", value: "Story" },
                { name: "Nightfall", value: "Nightfall" },
                { name: "Vanguard", value: "Vanguard Op" },
                { name: "Crucible", value: "The Crucible" },
                { name: "Trials of Osiris", value: "Trials of Osiris" },
                { name: "Seasonal Arena", value: "Seasonal Arena" },
                { name: "Gambit", value: "Gambit" },
        )),

        async execute(interaction, client) {
            const category = interaction.options.getString("category");

            await interaction.deferReply();

            let replied = false;

            // Set your timeout (e.g., 60 seconds)
            const timeout = setTimeout(async () => {
              if (!replied) {
                await interaction.editReply({ embeds: [timeoutEmbed()] });
                replied = true;
              }
            }, 10000); // 60,000 ms = 60 seconds

            if (globals.getBManifestLock()) {
              const waitEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
	              .setTitle("Data Refreshing")
	              .setAuthor({ name: "Destiny Compendium" })
                .setDescription("Sorry, but the rotation data is currently refreshing. Please try again in a couple seconds.")
	              .setThumbnail("https://i.imgur.com/MNab4aw.png")
	              .setTimestamp();
              
              interaction.editReply({ embeds: [waitEmbed], ephmeral: false });
              replied = true;

              return;
            }

            // Test for reset time
            // Calculate the most recent Tuesday 17:00 UTC reset time
            function getLastWeeklyReset() {
              const now = new Date();
              const reset = new Date(now);
            
              // Days since last Tuesday (0 = Sunday, 2 = Tuesday)
              const daysSinceTuesday = (now.getUTCDay() + 5) % 7;
              reset.setUTCDate(now.getUTCDate() - daysSinceTuesday);
              reset.setUTCHours(17, 0, 0, 0);
              reset.setUTCMinutes(0, 0, 0);
            
              // If it's still before this Tuesday 17:00 UTC, subtract 7 more days
              if (now < reset) {
                reset.setUTCDate(reset.getUTCDate() - 7);
              }
            
              return reset;
            }

            const now = new Date();
            const lastReset = getLastWeeklyReset();
            const lastFetch = globals.getLastBungieFetch() ? new Date(globals.getLastBungieFetch()) : null;

            // Re-fetch only if last fetch was before last weekly reset
            if ((!lastFetch || lastFetch < lastReset) && !globals.getBManifestLock()) {
              globals.setBManifestLock(true);
              refetchBungie(client.bungietoken).then(data => {
                globals.setLastBungieFetch(now.toISOString());
                globals.setBManifest(data);

                const waitEmbed = new EmbedBuilder()
                  .setColor(0xFF0000)
	                .setTitle("Data Refreshing")
	                .setAuthor({ name: "Destiny Compendium" })
                  .setDescription("Sorry, but the rotation data is currently refreshing. Please try again in a couple seconds.")
	                .setThumbnail("https://i.imgur.com/MNab4aw.png")
	                .setTimestamp();
              
                interaction.editReply({ embeds: [waitEmbed], ephmeral: false });
                replied = true;

                globals.setBManifestLock(false);
                return;
              });
            } else {
            try {
              const processTime = Date.now() - interaction.createdTimestamp;
              let embed;

              embed = new EmbedBuilder()
                .setColor(0x00FF00)
	              .setTitle(category)
	              .setAuthor({ name: "Destiny Compendium" })
	              .setThumbnail("https://i.imgur.com/iR1JvU5.png")
	              .setTimestamp()
                .setFooter({ text: `Processed in ${processTime} ms` });

              if (category === "Nightfall") {
                let desc = `Current Nightfall: **${globals.getBManifest().nightfallData.nightfallName}**\nCurrent Rewards: **`;
                for (let i = 0; i < globals.getBManifest().nightfallData.weapons.length; i++) {
                  let mod = globals.getBManifest().nightfallData.weapons[i];
                  if (!mod.includes("Unknown")) {
                    desc += mod;
                    if (j < (globals.getBManifest().nightfallData.weapons.length - 1)) {
                      desc += ", ";
                    }
                  }
                }
                embed.setDescription(desc + "**");
              }

              const d = globals.getBManifest()[category];
              if (d && d.length > 0) {
                for (let i = 0; i < d.length; i++) {
                  let name = d[i].name;
                  let modifiers = "Modifiers: ";
                  for (let j = 0; j < d[i].modifiers.length; j++) {
                    let mod = d[i].modifiers[j];
                    if (!mod.includes("Unknown")) {
                      modifiers += mod;
                      if (j < (d[i].modifiers.length - 1)) {
                        modifiers += ", ";
                      }
                    }
                  }

                  modifiers += "\n\nSpecific rewards: ";
                  if (d[i].rewards.length > 0) {
                    for (let j = 0; j < d[i].rewards.length; j++) {
                      let mod = d[i].rewards[j];
                      if (!mod.includes("Unknown")) {
                        modifiers += mod;
                      }

                      if (j < (d[i].rewards.length - 1)) {
                        modifiers += ", ";
                      }
                    }
                  } else {
                    modifiers += " -";
                  }

                  embed.addFields({ name: name, value: modifiers });

                  /*if (i < (d.length - 1)) {
                    embed.addFields({ name: "\u200B", value: "\u200B" });
                  }*/
                }
              }
              
              if (!replied) {
                await interaction.editReply({ embeds: [embed] });
                replied = true;
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