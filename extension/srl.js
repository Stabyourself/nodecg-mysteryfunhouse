const ctx = require("./nodecg");
const nodecg = ctx.get();
const timer = require("./timer");
const fake = require("./srl-fake");
const players = require("./players");
const games = require("./games");

// follows the speedrunslive race a match was loaded from: marks finishes and forfeits like the
// .done/.forfeit buttons would, starts the timer with the race and pauses it once everyone's
// through. srl is only asked while that race is going, and for a while after it's complete:
// someone can still .undone or .unforfeit, which puts the race back on until it's over again

const API = "https://api.speedrunslive.com";
const POLL = 5000;
const RETRY = 15000;
// how long a complete race is still looked at
const AFTER_COMPLETE = 10 * 60 * 1000;
const REQUEST_TIMEOUT = 4000;
// the stream is about this far behind the race (twitch's delay): the timer runs this much
// behind srl's, and finishes and forfeits go on the layout this long after srl has them
const STREAM_DELAY = 4000;

// srl's race states
const IN_PROGRESS = 3;
const COMPLETE = 4;

// the race we follow, the matches loaded from it, the game of it that's on the layout (kept
// over restarts, so a restart doesn't put it there again over changes made by hand) and since
// when it's complete
const linkRep = nodecg.Replicant("srlLink", { defaultValue: { id: null } });
// the followed race as the dashboard shows it. slots[n] is player n's entrant (or null),
// watching: srl is still asked about it (while it's going and for a while after)
const raceRep = nodecg.Replicant("srlRace", {
  persistent: false,
  defaultValue: { race: null, slots: [null, null, null, null], watching: false, polled: 0, error: null },
});

const slots = [];
for (let i = 0; i < 4; i++) {
  const rep = (prop, defaultValue) => nodecg.Replicant(`player${i}${prop}`, { defaultValue });
  slots.push({
    srl: rep("srl", ""),
    raceState: rep("raceState", "none"),
    finalTime: rep("finalTime", ""),
  });
}

function lower(str) {
  return String(str ?? "").trim().toLowerCase();
}

// same as formatTimer(ms, false, false) on the dashboard
function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const h = Math.floor(s / 3600);
  return (h > 0 ? `${pad(h)}:` : "") + `${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

// "done", "forfeit" or null for still racing (or not started)
function result(entrant) {
  if (!entrant) return null;
  if (entrant.state == "Finished") return "done";
  if (entrant.state == "Forfeit" || entrant.state == "Disqualified") return "forfeit";
  return null;
}

function normalize(race) {
  return {
    id: race.id,
    game: race.game?.name ?? "",
    gameAbbrev: race.game?.abbrev ?? "",
    goal: race.goal ?? "",
    state: race.state,
    statetext: race.statetext,
    // unix seconds, 0 until it starts
    time: race.time,
    entrants: Object.entries(race.entrants ?? {}).map(([key, e]) => ({
      key: lower(key),
      displayname: e.displayname,
      state: e.statetext,
      place: e.place,
      // whole seconds, -1 if they didn't finish
      time: e.time,
    })),
  };
}

// which entrant each slot is, by the srl name the player table has for them
function matchSlots(race) {
  return slots.map((slot) => {
    const srl = lower(slot.srl.value);
    if (!srl) return null;

    return race.entrants.find((e) => e.key == srl || lower(e.displayname) == srl) ?? null;
  });
}

function matchCount(race) {
  return matchSlots(race).filter(Boolean).length;
}

async function getJSON(path) {
  // a test race, see srl-fake.js
  const faked = fake.get(path);
  if (faked) return faked;

  const res = await fetch(API + path, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
  if (!res.ok) throw new Error(`SRL answered ${res.status} for ${path}`);
  const json = await res.json();

  return path == "/races" ? fake.addTo(json) : json;
}

// what we last saw of the linked race, to only act on changes
let seenRaceId = null;
let seenRaceState = null;
// each slot's entrant in the followed race, null when there's none
let followedSlots = null;

// the timer pauses once all of these are done
timer.setRacers(() => followedSlots && [0, 1, 2, 3].filter((i) => followedSlots[i]));
let syncTimeout = null;

// what the layout should say for each slot: per match, the winner and loser by srl's places,
// forfeit, or none while racing. null for a slot that isn't in the race, that one's left alone
function layoutStates(matched) {
  const states = [null, null, null, null];

  for (const pair of [
    [0, 1],
    [2, 3],
  ]) {
    const finished = pair
      .filter((p) => result(matched[p]) == "done")
      .sort((a, b) => matched[a].place - matched[b].place);

    for (const p of pair) {
      if (!matched[p]) continue;
      const r = result(matched[p]);
      states[p] = r == "forfeit" ? "forfeit" : r == "done" ? (finished[0] == p ? "winner" : "loser") : "none";
    }
  }

  return states;
}

// when each entrant's result was first seen, by their key. srl has no time for a forfeit or an
// .undone, those count from then
const seenResults = new Map();

function noteResults(race) {
  const now = Date.now();
  for (const e of race.entrants) {
    const r = result(e);
    if (seenResults.get(e.key)?.result !== r) seenResults.set(e.key, { result: r, at: now });
  }
}

// the timer's time at the entrant's finish (srl's, whole seconds since the start) or forfeit
// (when it was seen), null while racing
function resultMs(race, entrant) {
  const r = result(entrant);
  if (!r) return null;
  if (r == "done" && entrant.time > 0) return entrant.time * 1000;
  return seenResults.get(entrant.key).at - race.time * 1000;
}

// when the entrant's result is on stream: their finish or forfeit, or when they were seen
// racing again, plus the stream's delay. so a look at srl that's late puts it on right away
function dueAt(race, entrant) {
  const ms = resultMs(race, entrant);
  return (ms == null ? seenResults.get(entrant.key).at : race.time * 1000 + ms) + STREAM_DELAY;
}

// the entrant as the layout shows them, for one whose change isn't on stream yet
function asShown(entrant, p) {
  const state = slots[p].raceState.value;
  return {
    ...entrant,
    state: state == "winner" || state == "loser" ? "Finished" : state == "forfeit" ? "Forfeit" : "In Progress",
    // finishers already shown came before anyone finishing on stream now
    place: state == "winner" ? -2 : -1,
    shown: true,
  };
}

// the layout always says what srl says (srl is in charge while a race is followed, a mark made
// by hand doesn't stay). true when someone's racing again after an .undone or .unforfeit
function showResults(race, matched) {
  let back = false;

  layoutStates(matched).forEach((state, p) => {
    if (state == null || slots[p].raceState.value == state) return;

    if (state == "none") {
      back = true;
    } else {
      const ms = resultMs(race, matched[p]);
      if (ms != null) slots[p].finalTime.value = formatTime(ms);
    }

    slots[p].raceState.value = state;
  });

  // the timer stops on the last finish or forfeit
  const ends = matched.filter((e) => e && !e.shown && result(e)).map((e) => resultMs(race, e));
  timer.raceStatesChanged(ends.length ? Math.max(...ends) : null);
  return back;
}

let resultsTimeout = null;

// puts on the layout what of srl's last answer is on stream by now, and comes back for the
// next change
function showDue() {
  clearTimeout(resultsTimeout);
  const race = lastRace;
  if (!race || !followedSlots || linkRep.value.id != race.id) return;

  const now = Date.now();
  let next = Infinity;
  const effective = followedSlots.map((entrant, p) => {
    if (!entrant) return null;

    const due = dueAt(race, entrant);
    if (due <= now) return entrant;
    next = Math.min(next, due);
    return asShown(entrant, p);
  });

  // someone .undone or .unforfeit after the timer stopped for everyone being through: it goes
  // on with the race
  const back = showResults(race, effective);
  if (back && race.state == IN_PROGRESS && race.time > 0 && timer.getState() == "paused") {
    syncTimer(race);
  }

  if (next < Infinity) resultsTimeout = setTimeout(showDue, next - now);
}

function syncTimer(race) {
  clearTimeout(syncTimeout);

  const start = race.time * 1000 + STREAM_DELAY;
  const wait = start - Date.now();

  // srl counts down before the start, so the start can still be ahead of us
  if (wait > 0) {
    syncTimeout = setTimeout(() => timer.startAt(start), wait);
  } else {
    timer.startAt(start);
  }
}

// watching: srl is still asked about it, so it's live on the dashboard
function follow(race, watching) {
  if (race.id != seenRaceId) {
    seenRaceId = race.id;
    seenRaceState = null;
    seenResults.clear();
  }

  const matched = matchSlots(race);
  followedSlots = matched;
  lastRace = race;
  noteResults(race);

  // the room's game or goal changed: put its game on the layout (once it names one, see games.js)
  const gameKey = `${race.gameAbbrev}|${race.game}|${race.goal}`;
  if (gameKey != linkRep.value.gameKey) {
    linkRep.value = { ...linkRep.value, gameKey };
    games.showRaceGame(race, linkRep.value.matchIds ?? []).catch((err) => {
      nodecg.log.warn("Couldn't show the race's game:", err.message);
    });
  }

  if (race.state == IN_PROGRESS && seenRaceState != IN_PROGRESS && race.time > 0 && timer.getState() != "paused") {
    syncTimer(race);
  }
  seenRaceState = race.state;

  // what srl says goes on the layout once the stream has caught up to it
  showDue();

  const { entrants, ...info } = race;

  raceRep.value = { race: info, slots: matched, watching, polled: Date.now(), error: null };
}

// srl's open and running races, for picking one
async function liveRaces() {
  const { races } = await getJSON("/races");
  return races.map(normalize).filter((race) => race.state < COMPLETE);
}

function getRace(id) {
  return getJSON(`/races/${encodeURIComponent(id)}`).then(normalize);
}

// the last look at the followed race
let lastRace = null;

function unlink() {
  linkRep.value = { id: null };
  seenRaceId = null;
  followedSlots = null;
  lastRace = null;
  clearTimeout(syncTimeout);
  clearTimeout(resultsTimeout);
  seenResults.clear();
  raceRep.value = { race: null, slots: [null, null, null, null], watching: false, polled: Date.now(), error: null };
}

let pollTimeout = null;
let polling = false;
let pollAgain = false;

// when to look at the race again, or null to stop
function nextLook(race) {
  if (race.state < COMPLETE) {
    // back on after an .undone or .unforfeit, until it's complete again
    if (linkRep.value.completedAt) linkRep.value = { ...linkRep.value, completedAt: null };
    return POLL;
  }

  if (!linkRep.value.completedAt) linkRep.value = { ...linkRep.value, completedAt: Date.now() };
  return Date.now() - linkRep.value.completedAt < AFTER_COMPLETE ? POLL : null;
}

// looks at the followed race now, or right after the look that's still running, and keeps
// looking until it's been over for a while
async function loop() {
  clearTimeout(pollTimeout);
  if (!linkRep.value.id) return;

  if (polling) {
    pollAgain = true;
    return;
  }
  polling = true;

  let next = null;
  try {
    const race = await getRace(linkRep.value.id);
    // unlinked while srl was asked
    if (linkRep.value.id == race.id) {
      next = nextLook(race);
      follow(race, next != null);
    }
  } catch (err) {
    raceRep.value = { ...raceRep.value, error: err.message };
    next = RETRY;
  }

  polling = false;

  if (pollAgain) {
    pollAgain = false;
    loop();
  } else if (next) {
    pollTimeout = setTimeout(loop, next);
  }
}

// follow the race a match was loaded from. matchIds: the challonge matches loaded from it, for
// telling apart a game drawn more than once
function followRace(id, matchIds = []) {
  // no gameKey, so its game goes on the layout once it has one
  linkRep.value = { id, matchIds };
  // loading resets the timer, a race that's already going puts it back on its time
  seenRaceState = null;
  loop();
}

// a match was loaded by id. the followed race stays while it's going and still has someone
// on the layout in it, e.g. match 1 is from srl and match 2 isn't
function matchLoaded() {
  if (lastRace && lastRace.state < COMPLETE && matchCount(lastRace) > 0) {
    // loading resets the timer, put it back on the race's time
    seenRaceState = null;
    loop();
  } else if (linkRep.value.id) {
    unlink();
  }
}

// the open races, with which racers are signed up players (by their srl name)
nodecg.listenFor("srlListRaces", async (data, ack) => {
  try {
    const [races, contacts] = await Promise.all([
      liveRaces(),
      // without the database the races still show, just nobody as known
      players.getContacts().catch(() => []),
    ]);
    const known = new Set(contacts.map((contact) => lower(contact["srl_username"])).filter(Boolean));

    ack(
      null,
      races.map((race) => ({
        id: race.id,
        game: race.game,
        goal: race.goal,
        state: race.state,
        statetext: race.statetext,
        entrants: race.entrants.map((e) => ({
          name: e.displayname,
          known: known.has(e.key) || known.has(lower(e.displayname)),
        })),
      }))
    );
  } catch (err) {
    ack(err);
  }
});

// stop following the race, finishes and the timer are back to being done by hand
nodecg.listenFor("srlDetach", (data, ack) => {
  unlink();
  if (ack && !ack.handled) ack(null);
});

// picks up a race that was being followed before a restart
loop();

exports.getRace = getRace;
exports.followRace = followRace;
exports.matchLoaded = matchLoaded;
