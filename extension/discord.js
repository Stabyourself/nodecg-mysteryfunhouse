const { Client, GatewayIntentBits } = require("discord.js");

const ctx = require("./nodecg");
const nodecg = ctx.get();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.login(nodecg.bundleConfig.discordKey);

// a match load needs every member (for the avatars). loading the other match or trying again
// right after reuses them for this long instead of asking discord again (it rate limits
// that quickly), and loads at the same time share one request
const RECENT_MS = 60000;
let recent = null;

exports.getMembers = function () {
  if (recent && Date.now() - recent.at < RECENT_MS) return recent.request;

  const guild = client.guilds.cache.get(nodecg.bundleConfig.discordGuild);

  if (!guild) {
    return Promise.reject(new Error("Guild isn't loaded yet"));
  }

  const entry = { at: Date.now(), request: guild.members.fetch() };
  recent = entry;

  // a failed one isn't reused
  entry.request.catch(() => {
    if (recent === entry) recent = null;
  });

  return entry.request;
};
