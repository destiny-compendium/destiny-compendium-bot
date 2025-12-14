# Destiny Compendium Bot

## Introduction
The Discord Compendium Bot is a bot for Discord that allows users to query the expansive Destiny Compendium spreadsheet without having to open a web browser and search for it there.

## How can I add this bot to my Discord server?
You can add this bot to your own Discord server by clicking <u>[this link](https://discord.com/oauth2/authorize?client_id=1385175350236938310&permissions=446676978752&integration_type=0&scope=bot)</u> and authorizing with your account.

## How can I use this bot in a Discord server?
**This part is out of date. Please turn to the /help command on the bot for usage details.**

The bot is extremely simple to use. The main command featured by the bot is the **/query** command. This command takes in 2 required arguments:

- **Category**: The category of the search refers to the specific sheet on the Destiny Compendium (eg. "Solar" or "Exotic Armor"). These are predefined and can be selected as a dropdown list.
- **Query**: The query part is effectively a simple search through the Compendium. The bot will search through the sheet, using your requested string as the base (eg. a query for "stag" will match the first entry that contains "stag" (case insensitive), that is in the requested category).

## How can I host my own version of this bot?
You can host your own version of the bot, but it takes some work.
This guide assumes that you know how to use a Linux terminal kinda decently.

### Prerequisites

#### Server Software

This "guide" assumes that you have a server with a Debian-based Linux distribution. The offical bot is hosted on an Ubuntu-based server, which itself is Debian-based.
The server does not need anything special besides the distribution and a working internet connection. No domains or SSL certificates are required, thanks to the Discord implementation.

#### Discord Application Creation

Along with the server, you'll also need to register an application on the <u>[Discord Developer Portal](https://discord.com/developers/applications)</u>. After logging in, click **New Application** in the top-right corner of the page. Name it whatever you want, agree to the ToS and click **Create**.

On the new page you'll be taken to, on the right side menu, click on **Bot** and **Create Bot**. Now, (making sure no one is looking :)), click **Reset Token**.
Write this new token down somewhere, since you'll need it later. Keep this token sacred, since anyone else with it can hijack your bot.

At the bottom of the page, also make sure to enable all **Intents**. The bot will fail to start otherwise.

#### Google API registration

**This part needs writing, I'm lazy right now**
I'll just state that you also need to keep this api key sacred and that you need to enable the Google Sheets API in the settings (somewhere?).

#### Bungie API registration

**This part needs writing, I'm lazy right now**
Since the bot uses functionality from the Bungie API, you'll also need to register an API key there.
Look up a guide on registering an application with Bungie. You don't need any special privileges, and register it as a private application.
Copy the API Key for Bungie somewhere as well (and keep it sacred!).

### Installing software

On your server, from your bash or zsh (ew) shell, you'll need to install some software.

#### Installing Node.JS

This part is relatively straightforward. Install it with the following commands:
```sh
curl -sL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
sudo apt install nodejs -y
node -v
```
The final command should return something like "v22.x.x".

#### Installing Redis

Redis is used for caching queries to avoid hammering the Google API. Install it with the following commands:

```sh
sudo apt-get install lsb-release curl gpg
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
sudo chmod 644 /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt-get update
sudo apt-get install redis

sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### Cloning the Repository and Configuration

Now it's time to clone this repository and configurate it.
Run the following:

```sh
git clone https://github.com/destiny-compendium/destiny-compendium-bot.git
```

This will clone the latest stable release of the bot (master branch).

Navigate into the newly created directory using **cd destiny-compendium-bot/**. Inside, you'll need to create a file named **.env** and put in the following:
```
```

## Miscellaneous
Written by **DcruBro** and **zShiso**. 

This project is licensed under the Apache 2.0 License.

*External resources are licensed under their corrosponding licenses*

Copyright © 2025, All rights reserved.

[Email DcruBro for any questions](mailto:info@dcrubro.com)
