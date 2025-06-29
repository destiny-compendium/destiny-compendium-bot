require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");

const { Guilds, GuildMembers, GuildMessages } = GatewayIntentBits;
const { User, Message, GuildMember, ThreadMember, Channel } = Partials;

const { loadEvents } = require("./Handlers/eventHandler");
const { loadCommands } = require("./Handlers/commandHandler");

const { google } = require("googleapis");

const redis = require("redis");

const sheets = google.sheets({
    version: "v4",
    auth: process.env.GOOGLEAUTH,
});

const redisClient = redis.createClient({
    url: "redis://localhost:6379"
});

redisClient.connect()
    .then(() => console.log("Connected to Redis!"))
    .catch((err) => {
        console.error(err);
        process.exit(1); // Can't continue
});

redisClient.select(process.env.REDISDB);

const client = new Client({
    intents: [ Guilds, GuildMembers, GuildMessages ],
    partials: [ User, Message, GuildMember, ThreadMember ],
});

client.commands = new Collection();
client.config = require("./config.json");
client.sheets = sheets;
client.sheetid = "1WaxvbLx7UoSZaBqdFr1u32F2uWVLo-CJunJB4nlGUE4"; // This is the ID for the google sheet
client.redis = redisClient;
client.bungietoken = process.env.BUNGIEAUTH;

async function main() {
    client.login(process.env.TOKEN).then(() => {
        //client.application.commands.set([]); // Unregister commands to prevernt orphaned commands
        loadEvents(client);
        loadCommands(client);
    });
}

main();