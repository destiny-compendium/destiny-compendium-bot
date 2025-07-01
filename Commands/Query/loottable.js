const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const fs = require('fs');
const path = require('path');

const icons = require("../../Resources/resources.json").icons;

const reverseImage = {
    lw: false,
    gos: "https://i.imgur.com/RssIasC.jpeg",
    dsc: "https://i.imgur.com/Xmu8Wzp.jpeg",
    vog: "https://i.imgur.com/rWMs5T4.jpeg",
    vow: "https://i.imgur.com/3DU2lOd.jpeg",
    kf: "https://i.imgur.com/dI7xy3H.jpeg",
    ron: "https://i.imgur.com/tnnQKqK.jpeg",
    ce: "https://i.imgur.com/PQMrvMM.jpeg",
    se: "https://i.imgur.com/0y8w6Tt.jpeg",
    d_throne: false,
    d_pit: false,
    d_proph: "https://i.imgur.com/sTwhB2k.png",
    d_grasp: "https://i.imgur.com/yAJ5seq.png",
    d_duality: "https://i.imgur.com/ekQEHUh.jpeg",
    d_spire: "https://i.imgur.com/4ivGW7U.png",
    d_gotd: "https://i.imgur.com/1Lt9DFr.png",
    d_warlords: "https://i.imgur.com/yOGEjey.png",
    d_vesper: "https://i.imgur.com/28ulVST.png",
    d_sundered: "https://i.imgur.com/hC4skNY.png"
}

const reverseDesc = {
    lw: {
        name: "Last Wish",
        entries: [
            { encounter: "All", desc: "This Raid has no specific loot table." }
        ]
    },
    gos:  {
        name: "Garden of Salvation",
        entries: [
            { encounter: "1st", desc: `${icons.void}Zealot's Reward, ${icons.kinetic}Accrued Redemption, Leg Armor` },
            { encounter: "2nd", desc: `${icons.arc}Prophet of Doom, ${icons.void}Reckless Oracle, Arms Armor` },
            { encounter: "3rd", desc: `${icons.void}Ancient Gospel, ${icons.kinetic}Sacred Provenance, Chest Armor` },
            { encounter: "4th", desc: `${icons.solar}Omniscient Eye, ${icons.arc}${icons.overload}Divinity, Head Armor, Class Armor` },
        ]
    },
    dsc:  {
        name: "Deep Stone Crypt",
        entries: [

        ]
    },
    vog:  {
        name: "Vault of Glass",
        entries: [

        ]
    },
    vow:  {
        name: "Vow of the Disciple",
        entries: [

        ]
    },
    kf:  {
        name: "King's Fall",
        entries: [

        ]
    },
    ron:  {
        name: "Root of Nightmares",
        entries: [

        ]
    },
    ce:  {
        name: "Crota's End",
        entries: [

        ]
    },
    se:  {
        name: "Salvation's Edge",
        entries: [

        ]
    },
    d_throne:  {
        name: "The Shattered Throne",
        entries: [

        ]
    },
    d_pit:  {
        name: "Pit of Heresy",
        entries: [

        ]
    },
    d_proph:  {
        name: "Prophecy",
        entries: [

        ]
    },
    d_grasp:  {
        name: "Grasp of Avarice",
        entries: [

        ]
    },
    d_duality:  {
        name: "Duality",
        entries: [

        ]
    },
    d_spire:  {
        name: "Spire of the Watcher",
        entries: [

        ]
    },
    d_gotd:  {
        name: "Ghosts of the Deep",
        entries: [

        ]
    },
    d_warlords:  {
        name: "Warlord's Ruin",
        entries: [

        ]
    },
    d_vesper:  {
        name: "Vesper's Host",
        entries: [

        ]
    },
    d_sundered: {
        name: "Sundered Doctrine",
        entries: [

        ]
    },
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("loottable")
        .setDescription("Get the per-encounter loot table of the selected Raid/Dungeon")
        .setDefaultMemberPermissions(PermissionFlagsBits.Everyone)
        .addStringOption(option => option.setName("activity").setDescription("Query category").setRequired(true)
            .addChoices(
                { name: "Last Wish", value: "lw" },
                { name: "Garden of Salvation", value: "gos" },
                { name: "Deep Stone Crypt", value: "dsc" },
                { name: "Vault of Glass", value: "vog" },
                { name: "Vow of the Disciple", value: "vow" },
                { name: "King's Fall", value: "kf" },
                { name: "Root of Nightmares", value: "ron" },
                { name: "Crota's End", value: "ce" },
                { name: "Salvation's Edge", value: "se" },
                { name: "The Shattered Throne", value: "d_throne" },
                { name: "Pit of Heresy", value: "d_pit" },
                { name: "Prophecy", value: "d_proph" },
                { name: "Grasp of Avarice", value: "d_grasp" },
                { name: "Duality", value: "d_duality" },
                { name: "Spire of the Watcher", value: "d_spire" },
                { name: "Ghosts of the Deep", value: "d_gotd" },
                { name: "Warlord's Ruin", value: "d_warlords" },
                { name: "Vesper's Host", value: "d_vesper" },
                { name: "Sundered Doctrine", value: "d_sundered" },
        ))
        .addBooleanOption(option => option.setName("graphical").setDescription("Graphical output?").setRequired(false)),

        async execute(interaction, client) {
            const category = interaction.options.getString("category");
            const graphical = interaction.options.getBoolean("graphical");

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
                let embed;
                if (graphical && reverseImage[category] !== false) {

                } else {
                    // TODO: Fix this processTime to be in the right place, I'm too lazy right now
                    const processTime = Date.now() - interaction.createdTimestamp;
                
                    embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle(reverseDesc[category].name + " Loot Table")
                        .setAuthor({ name: "Destiny Compendium" })
                        .setTimestamp()
                        .setThumbnail("https://i.imgur.com/iR1JvU5.png")
                        .setFooter({ text: `Queried for '${query}' - Processed in ${processTime} ms` });
                
                    const data = reverseDesc[category].entries;
                    for (let i = 0; i < data.length; i++) {
                        embed.addFields({ name: data[i].encounter, value: data[i].desc });
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

            return;
        },
};