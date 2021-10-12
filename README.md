# NodeCG-MysteryFunHouse

It's a [NodeCG](https://www.nodecg.dev/) 1.8.1 bundle for MysteryFunHouse race restreams.

## Config
The following properties are needed for full functionality in the [bundle config](https://www.nodecg.dev/docs/bundle-configuration):

```json
{
    "challongeApiKey": "...", // Challonge API key
    "challongeTournament": "...", // Challonge tournament name, eg speedrunslive-mystery16
    "discordKey": "...", // Discord Bot Secret
    "discordGuild": "...", // Discord Server ID
    "googleApiKey": "...", // Google API key
    "contactSheet": "...", // Contact sheet ID
    "careerSheet": "...", // Career sheet ID
    "twitchClientId": "...", // Id of the twitch App
    "twitchClientSecret": "...", // Secret of the App
    "twitchChannel": "..." // Twitch channel ID (not the name, it's numerical)
}
```

## Cool Features
- Complete recreation of every element except commentators
- Boxart upload
- Challonge match import function
- Timer with pause feature
- 3d scene with spinning ghost wow cool
- Racer Cards
- Racer played matches
- Player popovers (with upload)
- Predictions
- Fancy cropping overlay
