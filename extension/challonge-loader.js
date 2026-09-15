const challonge = require('./challonge');
const googlesheet = require('./googlesheet');
const discord = require('./discord');
const players = require('./players');

const ctx = require('./nodecg');
const nodecg = ctx.get();

const DEFAULT_AVATAR = '/bundles/nodecg-mysteryfunhouse/dist/img/default_avatar.png';

// Bounds how long we'll wait on any single external dependency (Challonge, Google Sheets,
// Discord, the DB) so a hung/slow one can't leave the dashboard hanging forever.
const TASK_TIMEOUT_MS = 15000;

function capitalizeWords(str) {
  return str.replace(/\b[a-z]/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function errorMessage(err) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s.`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Replicant stuff
const allInfoRep = nodecg.Replicant('allInfo', { defaultValue: [] });
const playerInfoRep = nodecg.Replicant('playerInfo', { defaultValue: [] });

const playerProps = {
  name: '',
  pronouns: '',
  flag: '',
  twitch: '',
  volume: 0,
  aspectratio: false,
  streamHidden: false,
  raceState: 'none',
  finalTime: '',
};

const props = {
  game: '',
  goal: '',
  platform: '',
  submitter: '',
  currentBoxart: null,
  showPlayerCards: false,
  match1round: '',
  match2round: '',
};

const replicants = {};

for (let i = 0; i < 4; i++) {
  for (let prop in playerProps) {
    const name = `player${i}${prop}`;
    replicants[name] = nodecg.Replicant(name, {
      defaultValue: playerProps[prop],
    });
  }
}

for (let prop in props) {
  replicants[prop] = nodecg.Replicant(prop, { defaultValue: props[prop] });
}

function getChallongeParticipant(tournament, id) {
  const entry = (tournament.participants ?? []).find((participant) => {
    return participant.participant.id == id;
  });

  if (!entry) {
    throw new Error(`Couldn't find a Challonge participant with id "${id}" in the tournament.`);
  }

  return entry.participant;
}

function getMemberForDiscordId(members, discordId) {
  const member = members.find((member) => {
    return member.user.id == discordId;
  });

  if (member) return member;

  // fallback for when the user is not found
  return {
    displayName: 'Unknown',
    displayAvatarURL() {
      return DEFAULT_AVATAR;
    },
  };
}

function getAvatarForMember(member) {
  const avatar = member.displayAvatarURL({ size: 1024 });
  return avatar.includes('embed') ? DEFAULT_AVATAR : avatar;
}

function getContactForChallongeName(contactRows, challongeName) {
  return contactRows.find((row) => {
    return row['challonge_username']?.toLowerCase() == challongeName.toLowerCase();
  });
}

function getPlayerInfo(tournament, careerRows, discordMembers, challongeName, contactRows) {
  const challongeEntry = (tournament.participants ?? []).find((participant) => {
    return participant.participant.display_name.toLowerCase() == challongeName.toLowerCase();
  });

  if (!challongeEntry) {
    throw new Error(`Couldn't find challonge username "${challongeName}" in the tournament.`);
  }

  const contact = getContactForChallongeName(contactRows, challongeName);

  if (!contact) {
    throw new Error(`Couldn't find challonge username "${challongeName}" in the player database. Did they sign up?`);
  }

  const rawMatches = (tournament.matches ?? []).filter((match) => {
    return (
      (match.match.player1_id == challongeEntry.participant.id ||
        match.match.player2_id == challongeEntry.participant.id) &&
      match.match.state == 'complete'
    );
  });

  const career = careerRows.find((row) => {
    return row['Competitor/Challonge Name']?.toLowerCase() == challongeName.toLowerCase();
  });

  return {
    name: contact['username'],
    challonge: challongeEntry.participant,
    contact,
    rawMatches,
    career: career ? { ...career, _sheet: undefined } : null,
    avatar: getAvatarForMember(getMemberForDiscordId(discordMembers, contact['id'])),
  };
}

function formatMatchHistory(rawMatches, tournament, contactRows, discordMembers, playedGamesRows, currentChallongeId) {
  const matches = rawMatches.map(({ match: rawMatch }) => {
    const match = {
      id: rawMatch.id,
      score: rawMatch.scores_csv,
      players: [1, 2].map((n) => {
        const challongeEntry = getChallongeParticipant(tournament, rawMatch[`player${n}_id`]);
        const contact = getContactForChallongeName(contactRows, challongeEntry.display_name);

        return {
          id: challongeEntry.id,
          name: contact ? contact.username : 'Unknown',
          avatar: contact ? getAvatarForMember(getMemberForDiscordId(discordMembers, contact['id'])) : DEFAULT_AVATAR,
        };
      }),
    };

    // Make sure the player whose matches we're getting is always players[0]
    if (currentChallongeId == rawMatch.player2_id) {
      match.players.reverse();
      match.score = match.score.split('-').reverse().join('-');
    }

    match.round = rawMatch.round > 0 ? `Winners ${rawMatch.round}` : `Losers ${-rawMatch.round}`;
    match.winner = rawMatch.winner_id == match.players[0].id ? 0 : 1;

    const gameRow = playedGamesRows.find((row) => row['Match #'] == rawMatch.suggested_play_order);
    if (gameRow) {
      match.game = gameRow['Game Title'];
      match.platform = gameRow['Platform'];
    }

    return match;
  });

  matches.sort((a, b) => a.id - b.id);
  return matches;
}

async function fetchTournament() {
  let tournamentSlug;
  try {
    tournamentSlug = await players.getChallongeTournament();
  } catch (err) {
    throw new Error(`Couldn't determine the Challonge tournament for the selected event: ${errorMessage(err)}`);
  }

  try {
    return await challonge.getTournament(tournamentSlug);
  } catch (err) {
    throw new Error(`Challonge API call failed: ${errorMessage(err)}`);
  }
}

async function fetchCareerRows() {
  try {
    return await googlesheet.getCareerSheet();
  } catch (err) {
    throw new Error(`Couldn't load the career spreadsheet: ${errorMessage(err)}`);
  }
}

async function fetchPlayedGamesRows() {
  try {
    return await googlesheet.getPlayedGamesSheet();
  } catch (err) {
    throw new Error(`Couldn't load the played-games spreadsheet: ${errorMessage(err)}`);
  }
}

async function fetchDiscordMembers() {
  try {
    return await discord.getMembers();
  } catch (err) {
    throw new Error(`Couldn't fetch Discord members: ${errorMessage(err)}`);
  }
}

async function fetchContacts() {
  try {
    return await players.getContacts();
  } catch (err) {
    throw new Error(`Couldn't load player signups from the database: ${errorMessage(err)}`);
  }
}

function parseLoadMatchOptions(options) {
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

async function loadMatch(rawOptions) {
  const { matchId, matchNumber } = parseLoadMatchOptions(rawOptions);

  const [tournament, careerRows, playedGamesRows, discordMembers, contactRows] = await Promise.all([
    withTimeout(fetchTournament(), TASK_TIMEOUT_MS, 'Fetching the Challonge tournament'),
    withTimeout(fetchCareerRows(), TASK_TIMEOUT_MS, 'Loading the career spreadsheet'),
    withTimeout(fetchPlayedGamesRows(), TASK_TIMEOUT_MS, 'Loading the played-games spreadsheet'),
    withTimeout(fetchDiscordMembers(), TASK_TIMEOUT_MS, 'Fetching Discord members'),
    withTimeout(fetchContacts(), TASK_TIMEOUT_MS, 'Loading player signups from the database'),
  ]);

  const match = (tournament.matches ?? []).find((match) => match.match.suggested_play_order == matchId);

  if (!match) {
    throw new Error(`Couldn't find a match with ID ${matchId}. Are you sure it was correct?`);
  }

  // Do all the lookups and formatting up front, without touching any replicants yet, so that
  // if anything above fails/throws we haven't left the dashboard in a half-updated state.
  const info = [1, 2].map((n) => {
    const challongeName = getChallongeParticipant(tournament, match.match[`player${n}_id`]).display_name;
    const playerInfo = getPlayerInfo(tournament, careerRows, discordMembers, challongeName, contactRows);

    playerInfo.matches = formatMatchHistory(
      playerInfo.rawMatches,
      tournament,
      contactRows,
      discordMembers,
      playedGamesRows,
      playerInfo.challonge.id,
    );
    delete playerInfo.rawMatches;

    return playerInfo;
  });

  const basePlayerNumber = matchNumber == 2 ? 2 : 0;

  for (let i = 0; i < 2; i++) {
    const playerNumber = basePlayerNumber + i;
    const playerInfo = info[i];

    replicants[`player${playerNumber}name`].value = playerInfo.name;
    replicants[`player${playerNumber}pronouns`].value = capitalizeWords(playerInfo.contact['pronouns'] ?? '');
    replicants[`player${playerNumber}flag`].value = playerInfo.contact['flag'] || 'ghost.png';
    replicants[`player${playerNumber}twitch`].value = playerInfo.contact['twitch'] ?? '';
    replicants[`player${playerNumber}aspectratio`].value = false;
    replicants[`player${playerNumber}volume`].value = 0;
    replicants[`player${playerNumber}streamHidden`].value = false;
    replicants[`player${playerNumber}raceState`].value = 'none';
    replicants[`player${playerNumber}finalTime`].value = '';

    playerInfoRep.value[playerNumber] = playerInfo;
  }

  const round = match.match['round'];
  replicants[`match${matchNumber}round`].value = round > 0 ? `Winners ${round}` : `Losers ${-round}`;

  nodecg.sendMessage('timerReset');

  return `${info[0].name}  vs  ${info[1].name}`;
}

let loadInProgress = false;

nodecg.listenFor('loadMatch', (rawOptions, ack) => {
  if (loadInProgress) {
    ack(new Error('Another match is already being loaded. Please wait for it to finish.'));
    return;
  }

  loadInProgress = true;

  loadMatch(rawOptions)
    .then((message) => ack(null, message))
    .catch((err) => {
      nodecg.log.error('Failed to load match:', err);
      ack(err instanceof Error ? err : new Error(errorMessage(err)));
    })
    .finally(() => {
      loadInProgress = false;
    });
});

// nodecg.listenFor('loadAllCards', function (options, ack) {
//   const promises = [
//     challonge.getTournament(players.getChallongeTournament()),
//     googlesheet.getCareerSheet(),
//     discord.getMembers(),
//   ];

//   Promise.allSettled(promises).then((results) => {
//     if (results[0].status == 'rejected') {
//       return ack(new Error(`Challonge API call failed (${results[0].reason}). Try again or tell Maurice.`));
//     }
//     if (results[1].status == 'rejected') {
//       return ack(new Error(`Googlesheet API call failed (${results[1].reason}). Try again or tell Maurice.`));
//     }
//     if (results[3].status == 'rejected') {
//       return ack(new Error(`Discord API call failed (${results[2].reason}). Try again or tell Maurice.`));
//     }

//     const tournament = results[0].value;
//     const careerRows = results[1].value;
//     const discordMembers = results[2].value;

//     const allInfo = [];

//     for (row of contactRows) {
//       info = getPlayerInfo(tournament, careerRows, discordMembers, String(row['Challonge Username']), contactRows);

//       if (!(info instanceof Error)) {
//         info.name = info.discord.displayName;
//         info.avatar = getAvatarForMember(info.discord);

//         delete info.discord; // evil stuff that crashes my replicant >:(

//         allInfo.push(info);
//       }
//     }

//     allInfoRep.value = allInfo;

//     return ack();
//   });
// });
