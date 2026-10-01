# NodeCG-MysteryFunHouse

It's a [NodeCG](https://www.nodecg.dev/) 1.9.0 bundle for MysteryFunHouse race restreams.

## Config

The following properties are needed for full functionality in the [bundle config](https://www.nodecg.dev/docs/bundle-configuration):

```jsonc
{
  "challongeApiKey": "...", // Challonge API key
  "discordKey": "...", // Discord Bot Secret
  "discordGuild": "...", // Discord Server ID
  "googleApiKey": "...", // Google API key
  "careerSheet": "...", // Career sheet ID
  "scheduleSheet": "...", // Scheduling sheet
  "playedGamesSheet": "...", // Played games sheet
  "twitchClientId": "...", // Id of the twitch App
  "twitchClientSecret": "...", // Secret of the App
  "twitchChannel": "..." // Twitch channel ID (not the name, it's numerical)
  "dbHost": "...", // contact database data
  "dbUser": "...",
  "dbPass": "...",
  "dbName": "..."
}
```

## Building

Needs Node 22 or newer.

```bash
yarn install
yarn prod    # build dist/js and dist/css once
yarn watch   # rebuild on every change
```

The graphics (`src/js/main.js`) and the dashboard (`src/js/dashboard.js`) are built into one
file each with Vite, see `vite.config.mjs` and `build.mjs`. Both are Vue 3; only the
dashboard uses Vuetify. `dist/` is committed, and also holds the images, fonts and models.

## Cool Features

- Complete recreation of every element except commentators
- Boxart upload
- Challonge match import function
- Timer with pause feature
- 3d scene with spinning ghost wow cool
- Racer Cards
- Racer played matches
- Player popovers (with upload)
- Fancy cropping overlay
- Semi-automatic twitch stream info updating
- Players panel to manage the signup roster (add/edit/remove), pick the active event/tournament, and check/autofill against Challonge
