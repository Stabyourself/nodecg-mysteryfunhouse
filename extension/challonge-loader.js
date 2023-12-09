const challonge = require('./challonge');
const googlesheet = require('./googlesheet');
const discord = require('./discord');

const mariadb = require('mariadb');
const _ = require('lodash');

const ctx = require('./nodecg');
const nodecg = ctx.get();

function capitalizeWords(str) {
  return str.replace(/\b[a-z]/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
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
  prediction: 50,
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
  prediction: 50,
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

function getChallongeForId(tournament, id) {
  return tournament.participants.find((participant) => {
    return participant.participant.id == id;
  }).participant;
}

function getMemberForDiscordId(members, discordId) {
  let member = members.find((member) => {
    return member.user.id == discordId;
  });

  // fallback for when the user is not found
  if (!member) {
    member = {
      displayName: 'Unknown',
      displayAvatarURL() {
        return '/bundles/nodecg-mysteryfunhouse/dist/img/default_avatar.png';
      },
    };
  }

  return member;
}

function getAvatarForMember(member) {
  let avatar = member.displayAvatarURL({ size: 1024 });

  if (avatar.search('embed') != -1) {
    avatar = '/bundles/nodecg-mysteryfunhouse/dist/img/default_avatar.png';
  }

  return avatar;
}

async function getContacts() {
  const pool = mariadb.createPool({
    host: nodecg.bundleConfig.dbHost,
    user: nodecg.bundleConfig.dbUser,
    password: nodecg.bundleConfig.dbPass,
    database: nodecg.bundleConfig.dbName,
    connectionLimit: 5,
  });

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      'SELECT users.*, flavor FROM `users`, `signups` WHERE `users`.`id` = `signups`.`user_id` AND `signups`.`event_id` = 2',
    );
    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (conn) conn.end();
  }
}

function getContactForChallongeName(contactRows, challongeName) {
  const contact = contactRows.find((row) => {
    return row['challonge_username'].toLowerCase() == challongeName.toLowerCase();
  });

  return contact;
}

function getPlayerInfo(tournament, careerRows, discordMembers, challongeName, contactRows) {
  // Challonge stuff
  const challonge = tournament.participants.find((participant) => {
    return participant.participant.display_name.toLowerCase() == challongeName.toLowerCase();
  });

  if (!challonge) {
    return Error(`Couldn't find challonge username "${challongeName}" in tournament.`);
  }

  const rawMatches = tournament.matches.filter((match) => {
    return (
      (match.match.player1_id == challonge.participant.id || match.match.player2_id == challonge.participant.id) &&
      match.match.state == 'complete'
    );
  });

  // Contact stuff
  const contact = getContactForChallongeName(contactRows, challongeName);

  if (!contact) {
    return Error(`Couldn't find challonge username "${challongeName}" in Database.`);
  }

  // Discord stuff
  const member = getMemberForDiscordId(discordMembers, contact['id']);

  if (!member) {
    return Error(`Couldn't find "${contact['username']}" in the Mystery Discord server.`);
  }

  // Career stuff
  const SRLName = contact['srl_username'];
  let career;
  if (SRLName) {
    career = careerRows.find((row) => {
      return row['Competitor'].toLowerCase() == SRLName.toLowerCase();
    });
  }

  return {
    challonge: challonge ? challonge.participant : null,
    contact: contact,
    rawMatches: rawMatches,
    career: career ? Object.assign({}, career, { _sheet: undefined }) : null,
    discord: member,
  };
}

nodecg.listenFor('loadMatch', function (options, ack) {
  const promises = [
    challonge.getTournament(nodecg.bundleConfig.challongeTournament),
    googlesheet.getCareerSheet(),
    googlesheet.getPlayedGamesSheet(),
    discord.getMembers(),
    getContacts(),
  ];

  Promise.allSettled(promises).then((results) => {
    if (results[0].status == 'rejected') {
      return ack(new Error(`Challonge API call failed (${results[0].reason}). Try again or tell Maurice.`));
    }
    if (results[1].status == 'rejected') {
      return ack(new Error(`Googlesheet API call failed (${results[1].reason}). Try again or tell Maurice.`));
    }
    if (results[2].status == 'rejected') {
      return ack(new Error(`Googlesheet API call failed (${results[2].reason}). Try again or tell Maurice.`));
    }
    if (results[3].status == 'rejected') {
      return ack(new Error(`Discord API call failed (${results[3].reason}). Try again or tell Maurice.`));
    }
    if (results[4].status == 'rejected') {
      return ack(new Error(`Database call failed (${results[4].reason}). Try again or tell Maurice.`));
    }

    const tournament = results[0].value;
    const careerRows = results[1].value;
    const playedGamesRows = results[2].value;
    const discordMembers = results[3].value;
    const contactRows = results[4].value;

    const info = [];

    // Match stuff
    const match = tournament.matches.find((match) => {
      return match.match.suggested_play_order == options.matchId;
    });

    if (!match) {
      return ack(new Error("Couldn't find Match ID! Are you sure it was correct?"));
    }

    for (let i = 0; i < 2; i++) {
      const challongeName = getChallongeForId(tournament, match.match[`player${i + 1}_id`]).display_name;

      info[i] = getPlayerInfo(tournament, careerRows, discordMembers, challongeName, contactRows);

      if (info[i] instanceof Error) {
        return ack(info[i]);
      }

      info[i].name = info[i].discord.displayName;
      info[i].avatar = getAvatarForMember(info[i].discord);

      delete info[i].discord; // evil stuff that crashes my replicant >:(
    }

    for (let i = 0; i < 2; i++) {
      // Putting it together

      // format matches
      const matches = [];

      for (rawMatch of info[i].rawMatches) {
        rawMatch = rawMatch.match;

        let match = {};

        match.id = rawMatch.id;
        match.players = [];
        match.score = rawMatch.scores_csv;

        // fetch player info
        for (let i = 0; i < 2; i++) {
          const challonge = getChallongeForId(tournament, rawMatch[`player${i + 1}_id`]);

          const contact = getContactForChallongeName(contactRows, challonge.display_name);

          let id = challonge.id;
          let name = challonge.display_name;
          let avatar = '../../dist/img/default_avatar.png';

          if (contact) {
            let member = getMemberForDiscordId(discordMembers, contact['id']);

            if (!member) {
              return ack(new Error(`Couldn't find "${contact['username']}" in the Mystery Discord server.`));
            }

            name = member.displayName;
            avatar = getAvatarForMember(member);
          }

          match.players.push({
            id,
            name,
            avatar,
          });
        }

        // Make sure the player whose matches we're getting is 0
        if (info[i].challonge.id == rawMatch.player2_id) {
          match.players = match.players.reverse();

          // turn the score around
          match.score = match.score.split('-').reverse().join('-');
        }

        // format round
        if (rawMatch.round > 0) {
          match.round = 'Front ' + rawMatch.round;
        } else {
          match.round = 'Back ' + -rawMatch.round;
        }

        if (rawMatch.winner_id == match.players[0].id) {
          match.winner = 0;
        } else {
          match.winner = 1;
        }

        // find the game!
        const gameRow = playedGamesRows.find((row) => {
          return row['Match #'] == rawMatch.suggested_play_order;
        });

        if (gameRow) {
          match.game = gameRow['Game Title'];
          // match.genre = gameRow["Genre"];
          match.platform = gameRow['Platform'];
        }

        matches.push(match);
      }

      matches.sort((a, b) => a.id - b.id);

      info[i].matches = matches;

      // set panel fields
      const playerNumber = i + (options.matchNumber == 2 ? 2 : 0);

      let pronouns = '';
      let twitch = '';
      let flag = 'ghost.png';

      if (info[i].contact) {
        pronouns = info[i].contact['pronouns'];
        twitch = info[i].contact['twitch'];
        flag = info[i].contact['flag'];
      }

      replicants[`player${playerNumber}name`].value = info[i].name;
      replicants[`player${playerNumber}pronouns`].value = capitalizeWords(pronouns ?? '');
      replicants[`player${playerNumber}flag`].value = flag;
      replicants[`player${playerNumber}twitch`].value = twitch;
      replicants[`player${playerNumber}aspectratio`].value = false;

      replicants[`player${playerNumber}volume`].value = 0;
      replicants[`player${playerNumber}streamHidden`].value = false;
      replicants[`player${playerNumber}raceState`].value = 'none';
      replicants[`player${playerNumber}finalTime`].value = '';

      // Filter data for size reasons maybe?
      playerInfoRep.value[playerNumber] = info[i];
    }

    // Match stuff
    let round = match.match['round'];

    if (round > 0) {
      round = 'Front ' + round;
    } else {
      round = 'Back ' + -round;
    }

    replicants[`match${options.matchNumber}round`].value = round;

    // Predictions
    let player1votes = match.match['player1_votes'];
    let player2votes = match.match['player2_votes'];
    let totalVotes = player1votes + player2votes;

    let leftPlayer = options.matchNumber == 2 ? 2 : 0;

    replicants[`player${leftPlayer}prediction`].value = Math.round((player1votes / totalVotes) * 100);
    replicants[`player${leftPlayer + 1}prediction`].value = Math.round((player2votes / totalVotes) * 100);

    nodecg.sendMessage('timerReset');

    return ack(null, `${info[0].name}  vs  ${info[1].name}`);
  });
});

// nodecg.listenFor('loadAllCards', function (options, ack) {
//   const promises = [
//     challonge.getTournament(nodecg.bundleConfig.challongeTournament),
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
