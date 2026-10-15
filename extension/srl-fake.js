const ctx = require("./nodecg");
const nodecg = ctx.get();
const { acknowledge } = require("./acks");

// a fake srl race for testing the srl watcher, run from the "SRL test" dashboard panel: it
// shows up next to the real open races and everything about it is set by hand there (its
// game, racers readying up, the start, finishes, forfeits). its racers' challonge matches
// count as not played yet, so any of them can be loaded from it.
//
// only there with "srlTest": true in the bundle config, so a show never has it

const enabled = !!nodecg.bundleConfig?.srlTest;

// srl counts down this long after the start
const COUNTDOWN = 10;

// the fake race: { id, game, abbrev, goal, startedAt (ms, null before the start),
// entrants: [{ name, state, time (s, -1 without one) }] }. kept over restarts like a real
// race on srl, so the race followed from it is still there
const fakeRep = nodecg.Replicant("srlFake", {
  defaultValue: { enabled, race: null },
});
fakeRep.value = { enabled, race: enabled ? fakeRep.value.race : null };

function fake() {
  return fakeRep.value.race;
}

const DONE = ["Finished", "Forfeit"];

// what srl's api says about it
function race() {
  const f = fake();
  const started = f.startedAt != null;
  const done = started && f.entrants.length > 0 && f.entrants.every((e) => DONE.includes(e.state));

  const finished = f.entrants.filter((e) => e.state == "Finished").sort((a, b) => a.time - b.time);

  const entrants = {};
  for (const e of f.entrants) {
    entrants[e.name.toLowerCase()] = {
      displayname: e.name,
      place: e.state == "Finished" ? finished.indexOf(e) + 1 : e.state == "Forfeit" ? 9998 : 0,
      time: e.state == "Finished" ? e.time : -1,
      statetext: e.state,
      twitch: "",
    };
  }

  return {
    id: f.id,
    game: { name: f.game, abbrev: f.abbrev },
    goal: f.goal,
    state: done ? 4 : started ? 3 : 1,
    statetext: done ? "Complete" : started ? "In Progress" : "Entry Open",
    time: started ? Math.floor(f.startedAt / 1000) : 0,
    entrants,
  };
}

// what the api would answer for this path, or undefined to ask the real one
function get(path) {
  if (!enabled || !fake()) return undefined;
  if (path == `/races/${fake().id}`) return race();
  return undefined;
}

// the real race list with the fake in it
function addTo(list) {
  return enabled && fake() ? { ...list, races: [race(), ...list.races] } : list;
}

function open(id, goal, names) {
  fakeRep.value = {
    enabled,
    race: {
      id,
      // like a new room: no game until one is set
      game: "New Game",
      abbrev: "newgame",
      goal,
      startedAt: null,
      entrants: names.map((name) => ({ name, state: "Entered", time: -1 })),
    },
  };
}

// the current event's challonge tournament, unwrapped, and its signups
async function tournament() {
  // required here, they're only needed for testing
  const challonge = require("./challonge");
  const players = require("./players");

  const [{ tournament }, contacts] = await Promise.all([
    players.getChallongeTournament().then((slug) => challonge.getRecentTournament(slug)),
    players.getContacts(),
  ]);

  return {
    participants: (tournament.participants ?? []).map((entry) => entry.participant),
    matches: (tournament.matches ?? []).map((entry) => entry.match),
    contacts,
  };
}

function srlName(participants, contacts, participantId) {
  const participant = participants.find((participant) => participant.id == participantId);
  if (!participant) return null;

  const contact = contacts.find(
    (contact) => contact["challonge_username"]?.toLowerCase() == participant.display_name.toLowerCase()
  );
  return contact?.["srl_username"] || null;
}

// a message from the panel: answers with the error, or nothing
function listen(name, handler) {
  nodecg.listenFor(name, async (data, ack) => {
    try {
      if (!enabled) throw new Error('Test mode is off, set "srlTest": true in the bundle config');
      const answer = await handler(data ?? {});
      if (typeof ack == "function" && !ack.handled) ack(null, answer);
    } catch (err) {
      if (typeof ack == "function" && !ack.handled) ack(new Error(err.message));
      else acknowledge(ack);
    }
  });
}

// a race with the players of these challonge matches (by match id), under their srl names
listen("srlTestFromMatches", async ({ ids }) => {
  const matchIds = String(ids ?? "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  if (!matchIds.length) throw new Error("Enter one or more match ids");

  const { participants, matches, contacts } = await tournament();

  const names = [];
  for (const id of matchIds) {
    const match = matches.find((match) => match.suggested_play_order == id);
    if (!match) throw new Error(`There's no match ${id}`);

    for (const playerId of [match.player1_id, match.player2_id]) {
      const name = srlName(participants, contacts, playerId);
      if (!name) throw new Error(`A player of match ${id} has no SRL name in the player table`);
      if (!names.includes(name)) names.push(name);
    }
  }

  open(`testm${matchIds.join("-")}`, "", names);
});

// the challonge matches whose players both have srl names, to make a race from
listen("srlTestMatches", async () => {
  const { participants, matches, contacts } = await tournament();

  return matches
    .map((match) => ({
      id: match.suggested_play_order,
      players: [match.player1_id, match.player2_id].map((id) => srlName(participants, contacts, id)),
      played: match.state == "complete",
    }))
    .filter((match) => match.players.every(Boolean))
    .sort((a, b) => a.id - b.id);
});

// a finished srl race's racers, in a new room
listen("srlTestFromPast", async ({ id }) => {
  const answer = await fetch(`https://www.speedrunslive.com/api/pastresults/${encodeURIComponent(id)}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!answer.ok) throw new Error(`SRL answered ${answer.status} for race ${id}`);
  const { data } = await answer.json();

  open(
    `test${data.raceId}`,
    "",
    data.entrants.map((e) => e.playerName)
  );
});

listen("srlTestClear", () => {
  fakeRep.value = { enabled, race: null };
});

// the room's game and goal, like the race's creator sets them
listen("srlTestGame", ({ game, abbrev, goal }) => {
  const f = fake();
  if (!f) throw new Error("Make a race first");

  f.game = String(game ?? "") || "New Game";
  f.abbrev = String(abbrev ?? "") || f.game.toLowerCase().replace(/[^a-z0-9]/g, "");
  f.goal = String(goal ?? "");
});

// .go: counts down, then everyone's racing
listen("srlTestStart", () => {
  const f = fake();
  if (!f) throw new Error("Make a race first");

  f.startedAt = Date.now() + COUNTDOWN * 1000;
  for (const e of f.entrants) e.state = "In Progress";
});

// back to before the start, everyone entered again
listen("srlTestReset", () => {
  const f = fake();
  if (!f) throw new Error("Make a race first");

  f.startedAt = null;
  for (const e of f.entrants) Object.assign(e, { state: "Entered", time: -1 });
});

// one racer's .ready, .unready, .done, .forfeit or .undone
listen("srlTestEntrant", ({ name, action }) => {
  const f = fake();
  const e = f?.entrants.find((e) => e.name == name);
  if (!e) throw new Error(`No racer called ${name}`);

  const started = f.startedAt != null;

  if (action == "ready" || action == "unready") {
    if (started) throw new Error("The race already started");
    e.state = action == "ready" ? "Ready" : "Entered";
  } else if (action == "done" || action == "forfeit" || action == "undone") {
    if (!started) throw new Error("Start the race first");
    if (action == "done") {
      Object.assign(e, { state: "Finished", time: Math.max(0, Math.round((Date.now() - f.startedAt) / 1000)) });
    } else if (action == "forfeit") {
      Object.assign(e, { state: "Forfeit", time: -1 });
    } else {
      Object.assign(e, { state: "In Progress", time: -1 });
    }
  } else {
    throw new Error(`Unknown action ${action}`);
  }
});

// the games in the sheet, to set one we know
listen("srlTestGames", async () => {
  const rows = await require("./googlesheet").getGamesSheet();
  const seen = new Set();

  return rows
    .filter((row) => row["Game Title"] && !seen.has(row["Game Title"]) && seen.add(row["Game Title"]))
    .map((row) => ({ title: row["Game Title"], code: row["SRL Code"] ?? "", goal: row["Goal"] ?? "" }))
    .sort((a, b) => a.title.localeCompare(b.title));
});

exports.get = get;
exports.addTo = addTo;
exports.isFake = (id) => enabled && !!fake() && id == fake().id;
