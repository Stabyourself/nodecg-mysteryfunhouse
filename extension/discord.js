const { Client } = require('discord.js');

const ctx = require('./nodecg')
const nodecg = ctx.get()

const client = new Client({intents: ["GUILD_MEMBERS"]});

client.login(nodecg.bundleConfig.discordKey);

exports.getMembers = function() {
    const guild = client.guilds.cache.get('83038855732658176')

    if (!guild) {
        return new Promise((res, rej) => {
            rej("Guild isn't loaded yet")
        })
    }

    return guild.members.fetch()
}
