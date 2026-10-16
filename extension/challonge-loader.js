const challonge = require('./challonge');
const googlesheet = require('./googlesheet');
const discord = require('./discord');
const players = require('./players');
const srl = require('./srl');
const timer = require('./timer');

const nodecg = require('./nodecg').get();

const DEFAULT_AVATAR = '/bundles/nodecg-mysteryfunhouse/dist/img/default_avatar.png';

// Bounds how long we'll wait on any single external source (Challonge, Google Sheets,
// Discord, the DB) so a hung/slow one can't leave the dashboard hanging forever.
const SOURCE_TIMEOUT_MS = 15000;

// Replicant stuff. These are the server-side declarations (and defaults) for the per-player
// and per-game state the layouts and twitch.js share; a match load resets every player one.
const PLAYER_DEFAULTS = {
  name: '',
  pronouns: '',
  flag: '',
  twitch: '',
  srl: '',
  volume: 0,
  aspectratio: false,
  streamHidden: false,
  raceState: 'none',
  finalTime: '',
  score: 0,
};

const GAME_DEFAULTS = {
  game: '',
  goal: '',
  platform: '',
  submitter: '',
  currentBoxart: null,
  match1round: '',
  match2round: '',
  // the players' scores are on the layout
  match1showScore: false,
  match2showScore: false,
};

function declareReplicants(prefix, defaults) {
  return Object.fromEntries(
    Object.entries(defaults).map(([prop, defaultValue]) => [
      prop,
      nodecg.Replicant(`${prefix}${prop}`, { defaultValue }),
    ]),
  );
}

const playerReps = [0, 1, 2, 3].map((i) => declareReplicants(`player${i}`, PLAYER_DEFAULTS));
const gameReps = declareReplicants('', GAME_DEFAULTS);
const playerInfoRep = nodecg.Replicant('playerInfo', { defaultValue: [] });

function errorMessage(err) {
  return err instanceof Error ? err.message : String(err);
}

// Runs one fetch, bounded by SOURCE_TIMEOUT_MS, and says which source it was if it fails.
async function fetchSource(what, fetch) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${SOURCE_TIMEOUT_MS / 1000}s`)), SOURCE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([fetch(), timeout]);
  } catch (err) {
    throw new Error(`Couldn't ${what}: ${errorMessage(err)}`);
  } finally {
    clearTimeout(timer);
  }
}

// Challonge wraps every participant/match in a { participant } / { match } object; those are
// unwrapped here. cached: it's the tournament from a load less than a minute ago.
async function fetchTournament(fresh) {
  const { tournament, cached } = await fetchSource('fetch the Challonge tournament', async () => {
    const slug = await players.getChallongeTournament();
    return fresh ? { tournament: await challonge.getTournament(slug), cached: false } : challonge.getRecentTournament(slug);
  });

  return {
    participants: (tournament.participants ?? []).map((entry) => entry.participant),
    matches: (tournament.matches ?? []).map((entry) => entry.match),
    cached,
  };
}

// Everything a match load looks things up in, fetched in parallel.
async function fetchSources() {
  const [tournament, careerRows, playedGamesRows, members, contacts] = await Promise.all([
    fetchTournament(false),
    fetchSource('load the career spreadsheet', googlesheet.getCareerSheet),
    fetchSource('load the played-games spreadsheet', googlesheet.getPlayedGamesSheet),
    fetchSource('fetch Discord members', discord.getMembers),
    fetchSource('load player signups from the database', players.getContacts),
  ]);

  return {
    ...tournament,
    careerRows,
    playedGamesRows,
    members,
    contacts,
  };
}

function sameName(a, b) {
  return a != null && b != null && a.toLowerCase() == b.toLowerCase();
}

function roundName(round) {
  return round > 0 ? `Winners ${round}` : `Losers ${-round}`;
}

function capitalizeWords(str) {
  return str.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function findParticipant(sources, id) {
  const participant = sources.participants.find((participant) => participant.id == id);
  if (!participant) {
    throw new Error(`Couldn't find a Challonge participant with id "${id}" in the tournament.`);
  }
  return participant;
}

function findContact(sources, challongeName) {
  return sources.contacts.find((contact) => sameName(contact['challonge_username'], challongeName));
}

function avatarFor(sources, contact) {
  const member = contact && sources.members.find((member) => member.user.id == contact['id']);
  if (!member) return DEFAULT_AVATAR;

  const avatar = member.displayAvatarURL({ size: 1024 });
  return avatar.includes('embed') ? DEFAULT_AVATAR : avatar;
}

// A participant's completed matches, oldest first, with them always as players[0].
function matchHistory(sources, participantId) {
  return sources.matches
    .filter((match) => match.state == 'complete' && (match.player1_id == participantId || match.player2_id == participantId))
    .sort((a, b) => a.id - b.id)
    .map((match) => {
      const matchPlayers = [match.player1_id, match.player2_id].map((id) => {
        const participant = findParticipant(sources, id);
        const contact = findContact(sources, participant.display_name);
        return {
          id: participant.id,
          name: contact ? contact['username'] : 'Unknown',
          avatar: avatarFor(sources, contact),
        };
      });

      let score = match.scores_csv;
      if (match.player2_id == participantId) {
        matchPlayers.reverse();
        score = score.split('-').reverse().join('-');
      }

      const gameRow = sources.playedGamesRows.find((row) => row['Match #'] == match.suggested_play_order);

      return {
        id: match.id,
        score,
        players: matchPlayers,
        round: roundName(match.round),
        winner: match.winner_id == matchPlayers[0].id ? 0 : 1,
        ...(gameRow && { game: gameRow['Game Title'], platform: gameRow['Platform'] }),
      };
    });
}

// What goes into the playerInfo replicant for the player cards and player path.
function playerInfo(sources, participant) {
  const challongeName = participant.display_name;
  const contact = findContact(sources, challongeName);
  if (!contact) {
    throw new Error(`Couldn't find challonge username "${challongeName}" in the player database. Did they sign up?`);
  }

  const career = sources.careerRows.find((row) => sameName(row['Competitor/Challonge Name'], challongeName));

  return {
    name: contact['username'],
    challonge: participant,
    contact,
    career: career ?? null,
    avatar: avatarFor(sources, contact),
    matches: matchHistory(sources, participant.id),
  };
}

function parseOptions(options) {
  const matchId = Number(options?.matchId);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    throw new Error('Invalid match ID.');
  }

  const matchNumber = Number(options?.matchNumber);
  if (matchNumber !== 1 && matchNumber !== 2) {
    throw new Error('Invalid match number, expected 1 or 2.');
  }

  return { matchId, matchNumber };
}

// Every lookup for a match, done before touching a replicant so a failure can't leave it half loaded.
function matchInfos(sources, match) {
  return [match.player1_id, match.player2_id].map((id) => playerInfo(sources, findParticipant(sources, id)));
}

// Who's on the layout before a load, by name: their score and their match's "show score".
function scoreboard() {
  const board = new Map();
  playerReps.forEach((reps, playerNumber) => {
    const match = Math.floor(playerNumber / 2) + 1;
    if (!reps.name.value) return;
    board.set(reps.name.value.toLowerCase(), {
      score: reps.score.value,
      match,
      showScore: gameReps[`match${match}showScore`].value,
    });
  });
  return board;
}

// before: a scoreboard() from before the load. When both players were in one match then, their
// scores and its "show score" stay (the next SRL race of the same racers), else they start over.
function applyMatch(match, infos, matchNumber, before = null) {
  const kept = infos.map((info) => before?.get(info.name.toLowerCase()));
  const same = kept.every((entry) => entry && entry.match == kept[0].match);

  gameReps[`match${matchNumber}showScore`].value = same ? kept[0].showScore : false;

  infos.forEach((info, i) => {
    const playerNumber = (matchNumber - 1) * 2 + i;
    const values = {
      name: info.name,
      pronouns: capitalizeWords(info.contact['pronouns'] ?? ''),
      flag: info.contact['flag'] || 'ghost.png',
      twitch: info.contact['twitch'],
      srl: info.contact['srl_username'],
      score: same ? kept[i].score : 0,
    };

    for (const [prop, rep] of Object.entries(playerReps[playerNumber])) {
      rep.value = values[prop] ?? PLAYER_DEFAULTS[prop];
    }

    // no holes when match 2 is loaded first, the pages get [null, null, ...] either way
    while (playerInfoRep.value.length < playerNumber) playerInfoRep.value.push(null);
    playerInfoRep.value[playerNumber] = info;
  });

  gameReps[`match${matchNumber}round`].value = roundName(match.round);

  return `${infos[0].name}  vs  ${infos[1].name}`;
}

async function loadMatch(options) {
  const { matchId, matchNumber } = parseOptions(options);
  let sources = await fetchSources();

  const find = () => sources.matches.find((match) => match.suggested_play_order == matchId);
  let match = find();

  // the cached tournament may be from before this match got its players
  if ((!match?.player1_id || !match?.player2_id) && sources.cached) {
    sources = { ...sources, ...(await fetchTournament(true)) };
    match = find();
  }

  if (!match) {
    throw new Error(`Couldn't find a match with ID ${matchId}. Are you sure it was correct?`);
  }

  const matchup = applyMatch(match, matchInfos(sources, match), matchNumber);
  // not a timerReset message: those reach extensions a tick later, after srl.js may already
  // have started the timer on a race that's going
  timer.reset();
  srl.matchLoaded();

  return matchup;
}

// The signed up player an SRL entrant is, by the SRL name in the player table.
function participantForEntrant(sources, entrant) {
  const contact = sources.contacts.find(
    (contact) => sameName(contact['srl_username'], entrant.key) || sameName(contact['srl_username'], entrant.displayname),
  );
  if (!contact) return null;

  return sources.participants.find((participant) => sameName(participant.display_name, contact['challonge_username']));
}

// Loads the open Challonge match of the players in an SRL race (or two without the same
// players, racing together) into match 1 (and 2) and follows the race. When other matches fit
// too, answers { choose: [...] } instead and loads nothing, then the chosen ones (matchIds, at
// most two) go into match 1 and 2 in play order.
async function loadSrlRace({ raceId, matchIds }) {
  let [race, sources] = await Promise.all([
    fetchSource('fetch the SRL race', () => srl.getRace(raceId)),
    fetchSources(),
  ]);

  let { matches, participants } = raceMatches(sources, race);

  // the cached tournament may be from before their match opened
  if (matches.length == 0 && sources.cached) {
    sources = { ...sources, ...(await fetchTournament(true)) };
    ({ matches, participants } = raceMatches(sources, race));
  }

  if (matches.length == 0) {
    const unknown = race.entrants.filter((_entrant, i) => !participants[i]).map((entrant) => entrant.displayname);
    throw new Error(
      `Couldn't find an open Challonge match between the racers.` +
        (unknown.length ? ` No player in this event has the SRL name ${unknown.join(', ')}.` : ''),
    );
  }
  if (matchIds) {
    const chosen = matches.filter((match) => matchIds.includes(match.suggested_play_order));
    if (chosen.length == 0 || chosen.length > 2) throw new Error('Pick one or two of the matches.');
    matches = chosen;
  } else if (suggestedMatches(matches).length < matches.length) {
    // not just one match, or two racing together: which ones is up to the restreamer
    return { choose: matches.map((match) => matchSummary(sources, match)), suggested: suggestedMatches(matches) };
  }

  const infos = matches.map((match) => matchInfos(sources, match));
  const before = scoreboard();
  const matchups = matches.map(
    (match, i) => `${match.suggested_play_order}: ${applyMatch(match, infos[i], i + 1, before)}`,
  );

  timer.reset();
  // its game goes on the layout from there, once the room has one
  srl.followRace(
    race.id,
    matches.map((match) => match.suggested_play_order),
  );

  return { loaded: matchups.join('  ·  ') };
}

// The Challonge matches between the racers of an SRL race, in play order.
function raceMatches(sources, race) {
  const participants = race.entrants.map((entrant) => participantForEntrant(sources, entrant));
  const ids = new Set(participants.filter(Boolean).map((participant) => participant.id));

  // only ones not played yet. a test race uses the made-up tournament, where nothing is played
  // yet either (see challonge.js)
  const matches = sources.matches.filter(
    (match) => match.state == 'open' && ids.has(match.player1_id) && ids.has(match.player2_id),
  );

  matches.sort((a, b) => a.suggested_play_order - b.suggested_play_order);

  if (challonge.testMode) matches.push(...madeUpMatches(sources, matches, ids));

  return { matches, participants };
}

// Test mode: the racers without an open match together are paired up in race order, in made
// up open matches after the tournament's. The same race always gets the same ones, so the
// matches picked in the dialog are still there when they're loaded.
function madeUpMatches(sources, matches, ids) {
  const paired = new Set(matches.flatMap((match) => [match.player1_id, match.player2_id]));
  const left = [...ids].filter((id) => !paired.has(id));
  let order = Math.max(0, ...sources.matches.map((match) => match.suggested_play_order));

  const madeUp = [];
  for (let i = 0; i + 1 < left.length; i += 2) {
    order++;
    madeUp.push({
      id: 9000 + order,
      suggested_play_order: order,
      player1_id: left[i],
      player2_id: left[i + 1],
      state: 'open',
      round: 1,
      scores_csv: '',
      winner_id: null,
    });
  }
  return madeUp;
}

// What the dialog shows of a match to choose from.
function matchSummary(sources, match) {
  const name = (id) => {
    const participant = findParticipant(sources, id);
    return findContact(sources, participant.display_name)?.['username'] ?? participant.display_name;
  };

  return {
    id: match.suggested_play_order,
    round: roundName(match.round),
    players: [name(match.player1_id), name(match.player2_id)],
    playerIds: [match.player1_id, match.player2_id],
  };
}

// The ones to tick at first: the first match, and a second one without the same players.
function suggestedMatches(matches) {
  const [first, ...rest] = matches;
  const shares = (a, b) => [a.player1_id, a.player2_id].some((id) => id == b.player1_id || id == b.player2_id);
  const second = rest.find((match) => !shares(match, first));

  return [first, second].filter(Boolean).map((match) => match.suggested_play_order);
}

let loadInProgress = false;

function listenForLoad(message, load) {
  nodecg.listenFor(message, async (options, ack) => {
    if (loadInProgress) {
      ack(new Error('Another match is already being loaded. Please wait for it to finish.'));
      return;
    }

    loadInProgress = true;
    try {
      ack(null, await load(options));
    } catch (err) {
      nodecg.log.error('Failed to load match:', err);
      ack(err instanceof Error ? err : new Error(errorMessage(err)));
    } finally {
      loadInProgress = false;
    }
  });
}

listenForLoad('loadMatch', loadMatch);
listenForLoad('loadSrlRace', (options) =>
  loadSrlRace({
    raceId: String(options?.raceId ?? ''),
    matchIds: Array.isArray(options?.matchIds) ? options.matchIds.map(Number) : null,
  }),
);
