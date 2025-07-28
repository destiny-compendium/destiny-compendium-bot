const { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

const fs = require('fs');
const path = require('path');

const icons = require("../../Resources/resources.json").icons;

function errorEmbed(unspec = false) {
  return new EmbedBuilder()
	  .setColor(0xFF0000)
	  .setTitle("An Error Occurred")
	  .setAuthor({ name: "Destiny Compendium" })
    .setDescription(unspec ? "You need to specify a request." : "Sorry, but an internal error occurred during your request.")
	  .setThumbnail("https://i.imgur.com/MNab4aw.png")
	  .setTimestamp();
}

function timeoutEmbed() {
  return new EmbedBuilder()
	  .setColor(0xFF0000)
	  .setTitle("Timed Out")
	  .setAuthor({ name: "Destiny Compendium" })
    .setDescription("Sorry, but your request timed out during processing.")
	  .setThumbnail("https://i.imgur.com/MNab4aw.png")
	  .setTimestamp();
}

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
    dp: "https://i.imgur.com/uFdvINA.png",
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

// My hands hurty :(
const reverseDesc = {
    lw: {
        name: "Last Wish",
        entries: [
            { encounter: "All", desc: "This Raid has no specific loot table." }
        ],
        notes: "-"
    },
    gos:  {
        name: "Garden of Salvation",
        entries: [
            { encounter: "1st - 'Evade the Consecrated Mind'", desc: `${icons.void} Zealot's Reward, ${icons.kinetic} Accrued Redemption, Leg Armor` },
            { encounter: "2nd - 'Summon the Consecrated Mind'", desc: `${icons.arc} Prophet of Doom, ${icons.void} Reckless Oracle, Arms Armor` },
            { encounter: "3rd - 'Defeat the Consecrated Mind'", desc: `${icons.void} Ancient Gospel, ${icons.kinetic} Sacred Provenance, Chest Armor` },
            { encounter: "4th - 'Defeat the Sanctified Mind'", desc: `${icons.solar} Omniscient Eye, ${icons.arc} ${icons.overload} ${icons.exoticengram} Divinity, Head Armor, Class Armor` },
        ],
        notes: "-"
    },
    dsc:  {
        name: "Deep Stone Crypt",
        entries: [
            { encounter: "1st - 'Crypt Security'", desc: `${icons.solar} Trustee, Arms Armor, Leg Armor, Class Armor` },
            { encounter: "2nd - 'Atraks-1, Fallen Exo'", desc: `${icons.kinetic} Heritage, ${icons.kinetic} Succession, Arms Armor, Leg Armor, Class Armor` },
            { encounter: "3rd - 'Descent'", desc: `${icons.kinetic} Heritage, ${icons.arc} Posterity, Arms Armor, Chest Armor, Class Armor` },
            { encounter: "4th - 'Taniks, the Abomination'", desc: `${icons.void} Commemoration, ${icons.arc} Bequest, ${icons.solar} ${icons.exoticengram} Eyes of Tomorrow, Head Armor, Chest Armor, Leg Armor` },
        ],
        notes: "-"
    },
    vog:  {
        name: "Vault of Glass",
        entries: [
            { encounter: "1st - 'Confluxes'", desc: `${icons.arc} Found Verdict, ${icons.solar} Vision of Confluence, ${icons.void}, Corrective Meaure, Arms Armor, Class Armor` },
            { encounter: "2nd - 'Oracles'", desc: `${icons.arc} Found Verdict, ${icons.solar} Vision of Confluence, ${icons.kinetic} Praedyth's Revenge, Arms Armor, Leg Armor` },
            { encounter: "3rd - 'Templar'", desc: `${icons.kinetic} Fatebringer, ${icons.solar} Vision of Confluence, ${icons.void} Corrective Measure, Arms Armor, Chest Armor` },
            { encounter: "4th - 'Gatekeepers'", desc: `${icons.arc} Found Verdict, ${icons.kinetic} Fatebringer, ${icons.solar} Hezen Vengeance, Head Armor, Leg Armor` },
            { encounter: "5th - 'Atheon, Time's Conflux'", desc: `${icons.kinetic} Praedyth's Revenge, ${icons.void} Corrective Measure, ${icons.solar} Hezen Vengeance, ${icons.solar} ${icons.exoticengram} Vex Mythoclast, Head Armor, Chest Armor` },
        ],
        notes: "-"
    },
    vow:  {
        name: "Vow of the Disciple",
        entries: [
            { encounter: "1st - 'Acquisition'", desc: `${icons.kinetic} Submission, ${icons.stasis} Deliverance, ${icons.solar} Cataclysmic, Head Armor, Chest Armor, Leg Armor` },
            { encounter: "2nd - 'The Caretaker'", desc: `${icons.kinetic} Submission, ${icons.arc} Insidious, ${icons.solar} Cataclysmic, ${icons.arc} Forbearance, Head Armor, Arms Armor, Class Armor` },
            { encounter: "3rd - 'Exhibition'", desc: `${icons.kinetic} Submission, ${icons.stasis} Deliverance, Head Armor, Chest Armor, Leg Armor` },
            { encounter: "4th - 'Rhulk, Disciple of the Witness'", desc: `${icons.arc} Insidious, ${icons.arc} Forbearance, ${icons.solar} Lubrae's Ruin, ${icons.void} ${icons.exoticengram} Collective Obligation, Head Armor, Arms Armor, Class Armor` },
        ],
        notes: "-"
    },
    kf:  {
        name: "King's Fall",
        entries: [
            { encounter: "1st - 'Gate'", desc: `${icons.void} Doom of Chelchis, ${icons.stasis} Qullim's Terminus, Class Armor` },
            { encounter: "2nd - 'Basilica'", desc: `${icons.void} Doom of Chelchis, ${icons.stasis} Qullim's Terminus, Chest Armor, Leg Armor` },
            { encounter: "3rd - 'Warpriest'", desc: `${icons.kinetic} Smite of Merain, ${icons.kinetic} Defiance of Yasmin, ${icons.stasis} Qullim's Terminus, Arms Armor, Chest Armor` },
            { encounter: "4th - 'Golgoroth'", desc: `${icons.void} Doom of Chelchis, ${icons.solar} Zaouli's Bane, ${icons.arc} Midha's Reckoning, ${icons.stasis} Qullim's Terminus, Head Armor, Leg Armor` },
            { encounter: "5th - 'The Daughters'", desc: `${icons.void} Doom of Chelchis, ${icons.kinetic} Smite of Merain, ${icons.solar} Zaouli's Bane, ${icons.kinetic} Defiance of Yasmin, Arms Armor, Chest Armor` },
            { encounter: "6th - 'Oryx, the Taken King'", desc: `Any Weapon, ${icons.kinetic} ${icons.exoticengram} Touch of Malice, Any Armor` },
        ],
        notes: "-"
    },
    ron:  {
        name: "Root of Nightmares",
        entries: [
            { encounter: "1st - 'Cataclysm'", desc: `${icons.void} Nessa's Oblation, ${icons.solar} Briar's Contempt, ${icons.strand} Koraxis's Distress, Head Armor, Arms Armor, Chest Armor` },
            { encounter: "2nd - 'Scission'", desc: `${icons.void} Nessa's Oblation, ${icons.solar} Acasia's Dejection, ${icons.strand} Mykel's Reverence, ${icons.strand} Koraxis's Distress, Arms Armor, Chest Armor, Leg Armor` },
            { encounter: "3rd - 'Macrocosm'", desc: `${icons.strand} Rufus's Fury, ${icons.solar} Acasia's Dejection, ${icons.strand} Mykel's Reverence, ${icons.strand} Koraxis's Distress, Chest Armor, Leg Armor, Class Armor` },
            { encounter: "4th - 'Nezarec, Final god of Pain'", desc: `Any Weapon, ${icons.stasis} ${icons.exoticengram} Conditional Finality, Head Armor, Leg Armor, Class Armor` },
        ],
        notes: "-"
    },
    ce:  {
        name: "Crota's End",
        entries: [
            { encounter: "1st - 'The Abyss'", desc: `${icons.arc} Song of Ir Yût, ${icons.solar} Abyss Defiant, ${icons.strand} Fang of Ir Yût, Head Armor, Arms Armor, Chest Armor` },
            { encounter: "2nd - 'The Bridge'", desc: `${icons.strand} Swordbreaker, ${icons.arc} Oversoul Edict, ${icons.strand} Fang of Ir Yût, Arms Armor, Chest Armor, Leg Armor` },
            { encounter: "3rd - 'The Deathsinger'", desc: `${icons.arc} Song of Ir Yût, ${icons.arc} Oversoul Edict, ${icons.void} Word of Crota, Chest Armor, Leg Armor, Class Armor` },
            { encounter: "4th - 'Crota, Son of Oryx'", desc: `${icons.strand} Swordbreaker, ${icons.solar} Abyss Defiant, ${icons.void} Word of Crota, ${icons.kinetic} ${icons.exoticengram} Necrochasm, Head Armor, Leg Armor, Class Armor` },
        ],
        notes: "-"
    },
    se:  {
        name: "Salvation's Edge",
        entries: [
            { encounter: "1st - 'Substratum'", desc: `${icons.strand} Imminence, ${icons.arc} Non-Denouement, ${icons.solar} Nullify, Arms Armor, Chest Armor` },
            { encounter: "2nd - 'Herald of Finality'", desc: `${icons.strand} Imminence, ${icons.void} Forthcoming Deviance, ${icons.arc} Non-Denouement, Head Armor, Class Armor` },
            { encounter: "3rd - 'Repository'", desc: `${icons.stasis} Critical Anomaly, ${icons.void} Forthcoming Deviance, ${icons.solar} Nullify, Arms Armor, Class Armor` },
            { encounter: "4th - 'Verity'", desc: `${icons.strand} Imminence, ${icons.arc} Summum Bonum, ${icons.arc} Non-Denouement, Chest Armor, Leg Armor` },
            { encounter: "5th - 'The Witness'", desc: `${icons.stasis} Critical Anomaly, ${icons.arc} Summum Bonum, ${icons.solar} Nullify, ${icons.strand} ${icons.exoticengram} Euphony, Head Armor, Leg Armor` },
        ],
        notes: "-"
    },
    dp: {
        name: "The Desert Perpetual",
        entries: [
            { encounter: "Iatros, Inward-Turned (Wyvern)", desc: `${icons.stasis} The When and Where, ${icons.solar} Finite Maybe, ${icons.stasis} Intercalary, Head Armor, Chest Armor, Class Armor` },
            { encounter: "Epoptes, Lord of Quanta (Hydra)", desc: `${icons.stasis} The When and Where, ${icons.strand} Lance Ephemeral, ${icons.arc} Opaque Hourglass, Arms Armor, Leg Armor, Class Armor` },
            { encounter: "Agraios, Inherent (Hobgoblin)", desc: `${icons.arc} Antedante, ${icons.strand} Lance Ephemeral, ${icons.stasis} Intercalary, Head Armor, Arms Armor, Chest Armor` },
            { encounter: "Koregos, The Worldline (Harpy)", desc: `${icons.arc} Antedante, ${icons.solar} Finite Maybe, ${icons.arc} Opaque Hourglass, ${icons.strand} ${icons.exoticengram} Whirling Ovation, Head Armor, Arms Armor, Leg Armor` },
        ],
        notes: "-"
    },
    d_throne:  {
        name: "The Shattered Throne",
        entries: [
            { encounter: "All", desc: "This Dungeon has no specific loot table." }
        ],
        notes: "-"
    },
    d_pit:  {
        name: "Pit of Heresy",
        entries: [
            { encounter: "All", desc: "This Dungeon has no specific loot table." }
        ],
        notes: "-"
    },
    d_proph:  {
        name: "Prophecy",
        entries: [
            { encounter: "1st - 'Phalanx Echo'", desc: `${icons.arc} Prosecutor, ${icons.strand} Relentless, Leg Armor, Class Armor` },
            { encounter: "2nd - 'Hexahedron'", desc: `${icons.kinetic} Adjudicator, ${icons.void} A Sudden Death, Arms Armor` },
            { encounter: "3rd - 'Kell Echo'", desc: `${icons.stasis} Judgment, ${icons.solar} Darkest Before, Head Armor, Chest Armor, Class Armor + Any 'Moonfang' Armor Piece` },
        ],
        notes: "-"
    },
    d_grasp:  {
        name: "Grasp of Avarice",
        entries: [
            { encounter: "1st - 'Phry'zia, the Insatiable'", desc: `${icons.arc} Matador 64, Class Armor, Leg Armor` },
            { encounter: "2nd - 'De-activate the Fallen Shield'", desc: `${icons.arc} Hero of Ages, Arms Armor, Chest Armor` },
            { encounter: "3rd - 'Avarokk, the Covetous'", desc: `${icons.arc} Matador 64, ${icons.arc} Hero of Ages, ${icons.stasis} Eyasluna, ${icons.void} 1000 Yard Stare, Any Armor` },
        ],
        notes: "-"
    },
    d_duality:  {
        name: "Duality",
        entries: [
            { encounter: "1st - 'Nightmare of Gahlran'", desc: `${icons.stasis} Lingering Dread, ${icons.void} The Epicurean, Head Armor, Arms Armor, Leg Armor + Any Armor (Master Only)` },
            { encounter: "2nd - 'Unlock the Vault'", desc: `${icons.arc} Stormchaser, ${icons.void} Unforgiven, Arms Armor, Chest Armor, Class Armor + Any Armor (Master Only)` },
            { encounter: "3rd - 'Nightmare of Caiatl'", desc: `${icons.stasis} New Purpose, ${icons.solar} Fixed Odds, ${icons.void} ${icons.exoticengram} Heartshadow, Arms Armor, Chest Armor, Class Armor + Any Armor (Master Only)` },
        ],
        notes: "-"
    },
    d_spire:  {
        name: "Spire of the Watcher",
        entries: [
            { encounter: "1st - 'Ascend the Spire'", desc: `${icons.arc} Long Arm, ${icons.arc} Terminus Horizon, ${icons.kinetic} Seventh Seraph Carbine, Head Armor, Arms Armor, Leg Armor` },
            { encounter: "2nd - 'Silence the Spire'", desc: `${icons.arc} Terminus Horizon, ${icons.kinetic} Seventh Seraph Officer Revolver, Arms Armor, Chest Armor, Class Armor` },
            { encounter: "3rd - 'Persys, Primordial Ruin'", desc: `${icons.stasis} Liminal Vigil, ${icons.void} Wilderflight, Any from Previous Encounters, ${icons.solar} ${icons.exoticengram} Hierarchy of Needs, Any Armor` },
        ],
        notes: "-"
    },
    d_gotd:  {
        name: "Ghosts of the Deep",
        entries: [
            { encounter: "1st - 'Hive Ritual Disrupted'", desc: `${icons.stasis} New Pacific Epitath, ${icons.stasis} Cold Comfort, ${icons.solar} No Survivors, Head Armor, Arms Armor, Leg Armor` },
            { encounter: "2nd - 'Ecthar, Shield of Savathûn'", desc: `${icons.solar} Greasy Luck, ${icons.stasis} Cold Comfort, ${icons.solar} No Survivors, Arms Armor, Chest Armor, Class Armor` },
            { encounter: "3rd - 'Šimmumah ur-Nokru'", desc: `Any from Previous Encounters, ${icons.strand} ${icons.exoticengram} The Navigator, Any Armor` },
        ],
        notes: "-"
    },
    d_warlords:  {
        name: "Warlord's Ruin",
        entries: [
            { encounter: "1st - 'Rathil'", desc: `${icons.arc} Indebted Kindness, ${icons.strand} Vengful Whisper, ${icons.strand} Dragoncult Sickle, Head Armor, Arms Armor, Leg Armor` },
            { encounter: "2nd - 'Locus of Wailing Grief'", desc: `${icons.arc} Indebted Kindness, ${icons.strand} Vengeful Whisper, ${icons.strand} Naeem's Lance, Arms Armor, Chest Armor, Class Armor` },
            { encounter: "3rd - 'Hefnd's Vengeance'", desc: `Any from Previous Encounters, ${icons.void} ${icons.exoticengram} Buried Bloodline, Any Armor` },
        ],
        notes: "-"
    },
    d_vesper:  {
        name: "Vesper's Host",
        entries: [
            { encounter: "1st - 'Activation'", desc: `${icons.stasis} VS Chill Inhibitor, ${icons.void} VS Gravitic Arrest, ${icons.void} VS Velocity Baton, Arms Armor, Chest Armor, Leg Armor` },
            { encounter: "2nd - 'Raneiks Unified'", desc: `${icons.stasis} VS Chill Inhibitor, ${icons.void} VS Gravitic Arrest, ${icons.arc} VS Pyroelectric Propellant, Head Armor, Arms Armor, Leg Armor` },
            { encounter: "3rd - 'The Corrupted Puppeteer'", desc: `Any from Previous Encounters, ${icons.solar} ${icons.exoticengram} Icebreaker, Head Armor, Chest Armor, Leg Armor` },
        ],
        notes: "The Class item can only be acquired through the 'Rogue Network' quest"
    },
    d_sundered: {
        name: "Sundered Doctrine",
        entries: [
            { encounter: "1st - 'Solve the Riddle'", desc: `${icons.strand} Unloved, ${icons.strand} Unsworn, ${icons.arc} Unworthy, Head Armor, Chest Armor, Leg Armor` },
            { encounter: "2nd - 'Zoetic Lockset'", desc: `${icons.strand} Unloved, ${icons.strand} Unsworn, ${icons.void} Unvoiced, Head Armor, Arms Armor, Leg Armor` },
            { encounter: "3rd - 'Kerrev, the Erased'", desc: `Any from Previous Encounters, ${icons.solar} ${icons.exoticengram} Finality's Auger, Any Armor` },
        ],
        notes: "The Class item can only be acquired through the 'Drowning Labyrinth' quest (or master clears)."
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
            const category = interaction.options.getString("activity");
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
                    // TODO: Fix this processTime to be in the right place, I'm too lazy right now
                    const processTime = Date.now() - interaction.createdTimestamp;
                
                    embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle(reverseDesc[category].name + " Loot Table")
                        .setAuthor({ name: "Destiny Compendium" })
                        .setDescription("*Credit to nietcool for creating the graphic.*")
                        .setTimestamp()
                        .setImage(reverseImage[category])
                        .setFooter({ text: `Processed in ${processTime} ms` });
                } else {
                    // TODO: Fix this processTime to be in the right place, I'm too lazy right now
                    const processTime = Date.now() - interaction.createdTimestamp;
                
                    embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle(reverseDesc[category].name + " Loot Table")
                        .setAuthor({ name: "Destiny Compendium" })
                        .setTimestamp()
                        .setThumbnail("https://i.imgur.com/iR1JvU5.png")
                        .setFooter({ text: `Processed in ${processTime} ms` });
                
                    const data = reverseDesc[category].entries;
                    for (let i = 0; i < data.length; i++) {
                        embed.addFields({ name: data[i].encounter, value: data[i].desc });
                    }

                    embed.addFields({ name: "Additional Notes", value: reverseDesc[category].notes });

                    if (graphical) {
                        embed.setDescription("The Graphic for this activity doesn't exist, so you've been pointed to this instead.");
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