// gets a new twitch token for extension/twitch.js: `yarn twitch-auth`, open the link it prints
// signed in as the channel (twitchChannel in the bundle config) and enter the code. no redirect
// url needed. restart nodecg afterwards so it picks up the new token

const fs = require("fs");
const path = require("path");
const { startDeviceCodeFlow, exchangeDeviceCode, getTokenInfo } = require("@twurple/auth");

// updateChannelInfo (title and game) needs this one
const SCOPES = ["channel:manage:broadcast"];
const TOKEN_FILE = path.join(__dirname, "extension", "twitch_token.json");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "cfg", "nodecg-mysteryfunhouse.json"), "utf8"));
const clientId = config.twitchClientId;
const channel = String(config.twitchChannel);

const sleep = (s) => new Promise((resolve) => setTimeout(resolve, s * 1000));

async function main() {
  const device = await startDeviceCodeFlow(clientId, SCOPES);

  console.log(`\nOpen ${device.verificationUri} (signed in as the stream channel)`);
  console.log(`and enter the code: ${device.userCode}\n`);
  console.log("Waiting for you to approve...");

  const giveUp = Date.now() + device.expiresIn * 1000;
  let interval = device.interval;
  let token = null;

  while (!token) {
    if (Date.now() > giveUp) throw new Error("The code expired, run it again.");
    await sleep(interval);

    try {
      token = await exchangeDeviceCode(clientId, device.deviceCode, SCOPES);
    } catch (err) {
      const message = String(err.body ?? err.message);
      if (message.includes("authorization_pending")) continue;
      if (message.includes("slow_down")) {
        interval += 5;
        continue;
      }
      throw err;
    }
  }

  const info = await getTokenInfo(token.accessToken, clientId);
  if (info.userId != channel) {
    throw new Error(
      `That's the token of ${info.userName} (${info.userId}), but twitchChannel is ${channel}. ` +
        "Sign in as the stream channel and run it again. Nothing was saved."
    );
  }

  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 4), "utf8");
  console.log(`\nSaved the token for ${info.userName} to ${TOKEN_FILE}. Restart NodeCG.`);
}

main().catch((err) => {
  console.error("\n" + (err.message ?? err));
  process.exit(1);
});
