const { CommandInteraction, ButtonInteraction, EmbedBuilder } = require("discord.js");
const { createLog } = require("../../Handlers/logHandler");
const globals = require("../../Util/globals");
const { extractImageUrl } = require("../../Commands/Query/query");

function outdatedEmbed() {
  return new EmbedBuilder()
	  .setColor(0xFF0000)
	  .setTitle("Outdated Command")
	  .setAuthor({ name: "Destiny Compendium" })
      .setDescription("This command is outdated! Try refreshing your Discord by pressing *Ctrl+R*.")
	  .setThumbnail("https://i.imgur.com/MNab4aw.png")
	  .setTimestamp();
}

function blacklistEmbed() {
  return new EmbedBuilder()
	  .setColor(0xFF0000)
	  .setTitle("Blacklisted Command")
	  .setAuthor({ name: "Destiny Compendium" })
      .setDescription("Sorry, but this command has temporarily been placed on a blacklist. Please try again later.")
	  .setThumbnail("https://i.imgur.com/MNab4aw.png")
	  .setTimestamp();
}

module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                interaction.reply({ embeds: [outdatedEmbed()] });
                createLog(`User "${interaction.user.id}" tried to run an outdated command!`, "WARNING", false, interaction.guild.id);

                return;
            }

            if (globals.getCommandBlacklist().includes(interaction.commandName)) {
                interaction.reply({ embeds: [blacklistEmbed()] });
                createLog(`User "${interaction.user.id}" tried to run a blacklisted command!`, "WARNING", false, interaction.guild.id);

                return;
            }

            await command.execute(interaction, client);
            createLog(`User "${interaction.user.id}" executed an interaction!`, "INFO", false, interaction.guild.id);
        } else if (interaction.isStringSelectMenu()) {
            // Handle query select menu
            if (interaction.customId.startsWith("query_select_")) {
                try {
                    await interaction.deferUpdate();

                    const selectedIndex = parseInt(interaction.values[0]);
                    const matchesJson = await client.redis.get(`query_matches_${interaction.id}`);

                    if (!matchesJson) {
                        await interaction.editReply({ 
                            content: "Selection expired. Please run the query again.",
                            components: [],
                            embeds: []
                        });
                        return;
                    }

                    const matches = JSON.parse(matchesJson);
                    const match = matches[selectedIndex];

                    if (!match) {
                        await interaction.editReply({ 
                            content: "Invalid selection.",
                            components: [],
                            embeds: []
                        });
                        return;
                    }

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
                        .setTimestamp();

                    if (imageBase64) {
                        embed.setThumbnail(imageBase64);
                    } else {
                        embed.setThumbnail("https://i.imgur.com/iR1JvU5.png");
                    }

                    await interaction.editReply({
                        embeds: [embed],
                        components: [],
                        ephemeral: false
                    });

                    await client.redis.set(match.matchedText, match.description);

                } catch (error) {
                    console.error("Error handling query select menu:", error);
                    await interaction.editReply({ 
                        content: "An error occurred while processing your selection.",
                        components: []
                    });
                }
            }
        } else if (interaction.isButton()) {
            if (!data) {
                return;
            } else {
                let interactionCustomId;
                let roleId;

                interactionCustomId = data.interactionCustomId;
                roleId = interaction.guild.roles.cache.get(data.role);
            }
        }
    },
}