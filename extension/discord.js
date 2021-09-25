const { Client } = require('discord.js');

const ctx = require('./nodecg')
const nodecg = ctx.get()

const client = new Client({intents: ["GUILD_MEMBERS"]});

client.login(nodecg.bundleConfig.discordKey);

client.on("ready", () => {

})

exports.getAvatar = function(nickname) {
    return new Promise(function(resolve, reject) {
        const guild = client.guilds.cache.get('83038855732658176')

        guild.members.fetch().then(members => {
            let split = nickname.split("#")

            let member = members.find(member => {
                return member.user.username == split[0] && member.user.discriminator == split[1]
            })

            if (member) {
                resolve(member.user.avatarURL({size: 1024}))
            } else {
                reject(`Couldn't find "${nickname}" in the Mystery Discord server.`)
            }
        })
    })
}
