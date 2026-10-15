const ctx = require("./nodecg");
const nodecg = ctx.get();
const googlesheet = require("./googlesheet");
const boxarts = require("./boxart-fetch");

// puts the game of an srl race on the layout: title, goal, platform, submitter and boxart from
// the games sheet row with the room's game ("Big2Small" finds "Big 2 Small"). most games
// aren't on srl until they've been raced, so a room with srl's "New Game" has it in the goal
// ("Super Mario Bros - beat the game"), and the row is the title it starts with or has in it.
// a game srl knows that isn't in the sheet shows as srl has it, a "New Game" room without a
// known title in its goal changes nothing yet. boxarts are downloaded once, named after their
// link, so a game coming back reuses its file

// how long a downloaded boxart may take to show up in the assets
const ASSET_WAIT = 10000;

const reps = {};
for (const name of ["game", "goal", "platform", "submitter"]) {
  reps[name] = nodecg.Replicant(name, { defaultValue: "" });
}
reps.currentBoxart = nodecg.Replicant("currentBoxart", { defaultValue: null });
const boxartsRep = nodecg.Replicant("assets:boxarts");

// letters and digits only: "Big 2 Small" and "Big2Small" are the same game
function simple(str) {
  return String(str ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// srl's "New Game" is a room without its game set yet
function hasGame(race) {
  return !!simple(race.game) && simple(race.game) != "newgame";
}

// words only: "Super Mario Bros. - beat the game" -> " super mario bros beat the game "
function words(str) {
  return ` ${String(str ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

// the rows of the game srl has set, or for "New Game" the game named in the goal
function rowsForRace(rows, race) {
  if (hasGame(race)) {
    const names = [simple(race.game), simple(race.gameAbbrev)].filter((name) => name && name != "newgame");
    return rows.filter((row) => names.includes(simple(row["Game Title"])) || names.includes(simple(row["SRL Code"])));
  }

  const goal = simple(race.goal);
  if (!goal) return [];

  // the title it starts with ("Big2Small - ..." too), or else one in it as whole words. not
  // titles that are just a common word though ("Unless", "Maze"), those turn up in goals
  const titled = rows.filter((row) => simple(row["Game Title"]).length > 0);
  let found = titled.filter((row) => goal.startsWith(simple(row["Game Title"])));
  if (!found.length) {
    found = titled.filter((row) => {
      const title = words(row["Game Title"]);
      const distinct = title.trim().includes(" ") || simple(row["Game Title"]).length >= 8;
      return distinct && words(race.goal).includes(title);
    });
  }

  // "Mega Man 2" over "Mega Man"
  const longest = Math.max(0, ...found.map((row) => simple(row["Game Title"]).length));
  return found.filter((row) => simple(row["Game Title"]).length == longest);
}

function findRow(rows, race, matchIds) {
  const forGame = rowsForRace(rows, race);
  const forMatch = (row) => matchIds.includes(Number(row["Match #"]));

  // a game drawn more than once: the one for this match, or the latest
  return forGame.find(forMatch) ?? forGame.at(-1) ?? null;
}

// "https://.../boxart/98_Skate%20Horse.jpg" -> "sheet-98_Skate_Horse"
function boxartName(url) {
  const file = decodeURIComponent(new URL(url).pathname.split("/").pop() || "boxart");
  const base = file.includes(".") ? file.slice(0, file.lastIndexOf(".")) : file;
  return `sheet-${base.replace(/[^\w-]+/g, "_")}`;
}

function waitForAsset(filename) {
  return new Promise((resolve) => {
    const find = (assets) => (assets || []).find((asset) => asset.base == filename);

    if (find(boxartsRep.value)) return resolve(find(boxartsRep.value));

    const onChange = (assets) => {
      if (!find(assets)) return;
      clearTimeout(timeout);
      boxartsRep.removeListener("change", onChange);
      resolve(find(assets));
    };
    const timeout = setTimeout(() => {
      boxartsRep.removeListener("change", onChange);
      resolve(null);
    }, ASSET_WAIT);

    boxartsRep.on("change", onChange);
  });
}

async function importBoxart(url) {
  const name = boxartName(url);
  const filename = (await boxarts.findBoxart(name)) ?? (await boxarts.saveBoxart(url, name));
  return waitForAsset(filename);
}

// the last call wins when the game changes again while one is still loading
let latest = 0;

// race: the followed race (game, gameAbbrev, goal), matchIds: the challonge matches loaded from it
async function showRaceGame(race, matchIds = []) {
  const call = ++latest;

  let row = null;
  try {
    row = findRow(await googlesheet.getGamesSheet(), race, matchIds);
    // it may have been added to the sheet just now
    row ??= findRow(await googlesheet.getGamesSheet(true), race, matchIds);
  } catch (err) {
    nodecg.log.warn("Couldn't load the games sheet, using the game from SRL:", err.message);
  }

  if (call != latest) return;

  // "New Game" and no game we know in the goal: wait for one
  if (!row && !hasGame(race)) return;

  // not in the sheet: what srl says, and no platform or submitter left over from the game
  // before. the boxart stays, the mt20 layouts don't work without one
  if (!row) {
    reps.game.value = race.game;
    reps.goal.value = race.goal;
    reps.platform.value = "";
    reps.submitter.value = "";
    return;
  }

  reps.game.value = row["Game Title"] ?? "";
  reps.goal.value = row["Goal"] || race.goal;
  reps.platform.value = row["Platform"] ?? "";
  reps.submitter.value = row["Submitter"] ?? "";

  const picture = row["Picture Link"];
  if (!picture) return;

  try {
    const asset = await importBoxart(picture);
    if (call != latest) return;

    if (asset) reps.currentBoxart.value = asset;
    else nodecg.log.warn(`The boxart for ${row["Game Title"]} was saved but didn't show up in the assets`);
  } catch (err) {
    nodecg.log.warn(`Couldn't get the boxart for ${row["Game Title"]}:`, err.message);
  }
}

exports.showRaceGame = showRaceGame;
exports.hasGame = hasGame;
