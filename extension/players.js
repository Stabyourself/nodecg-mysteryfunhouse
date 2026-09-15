const mariadb = require('mariadb');

const challonge = require('./challonge');

const ctx = require('./nodecg');
const nodecg = ctx.get();

// Replicants
const signupEventIdRep = nodecg.Replicant('signupEventId', {
  defaultValue: 4,
});

const pool = mariadb.createPool({
  host: nodecg.bundleConfig.dbHost,
  user: nodecg.bundleConfig.dbUser,
  password: nodecg.bundleConfig.dbPass,
  database: nodecg.bundleConfig.dbName,
  connectionLimit: 5,
  // Discord IDs are BIGINT and exceed Number.MAX_SAFE_INTEGER, so the driver returns them
  // as native BigInt. That can't be JSON.stringify'd (e.g. when stored in a replicant), so
  // stringify BigInts here instead of converting to Number, which would lose precision.
  typeCast: (column, next) => {
    const value = next();
    return typeof value === 'bigint' ? value.toString() : value;
  },
});

// Returns the raw `users` rows (joined with their signup for the given event)
async function getContactsForEvent(eventId) {
  let conn;
  try {
    conn = await pool.getConnection();
    return await conn.query(
      'SELECT `users`.*, `signups`.`id` AS `signup_id`, `signups`.`flavor` AS `flavor` FROM `users`, `signups` WHERE `users`.`id` = `signups`.`user_id` AND `signups`.`event_id` = ?',
      [eventId],
    );
  } finally {
    if (conn) conn.end();
  }
}

// Same, but for the currently selected event. Used by challonge-loader.js
async function getContacts() {
  return getContactsForEvent(signupEventIdRep.value);
}

// The `events` table is the source of truth for which Challonge tournament a signup event maps to.
async function getEvents() {
  let conn;
  try {
    conn = await pool.getConnection();
    return await conn.query('SELECT `id`, `name`, `challonge_id` FROM `events` ORDER BY `id` DESC');
  } finally {
    if (conn) conn.end();
  }
}

async function getChallongeTournamentForEvent(eventId) {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT `challonge_id` FROM `events` WHERE `id` = ?', [eventId]);

    if (rows.length === 0 || !rows[0].challonge_id) {
      throw new Error(`No Challonge tournament is configured for the selected event (id ${eventId}).`);
    }

    return rows[0].challonge_id;
  } finally {
    if (conn) conn.end();
  }
}

// Same, but for the currently selected event. Used by challonge-loader.js
async function getChallongeTournament() {
  return getChallongeTournamentForEvent(signupEventIdRep.value);
}

nodecg.listenFor('getEvents', async (data, ack) => {
  try {
    const rows = await getEvents();
    ack(
      null,
      rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        challongeTournament: row.challonge_id,
      })),
    );
  } catch (err) {
    ack(err);
  }
});

nodecg.listenFor('getChallongeParticipants', async (data, ack) => {
  try {
    const eventId = data && data.eventId != null ? data.eventId : signupEventIdRep.value;
    const tournamentSlug = await getChallongeTournamentForEvent(eventId);
    const tournament = await challonge.getTournament(tournamentSlug);
    ack(
      null,
      tournament.participants.map((p) => p.participant.display_name),
    );
  } catch (err) {
    ack(err);
  }
});

// Fields that carry over between a player's signups for different events. `flavor` is
// per-signup (not per-player) and `id`/`signup_id` are join keys, so neither is autofillable.
const AUTOFILL_FIELDS = ['username', 'challonge_username', 'twitch', 'pronouns', 'flag'];

nodecg.listenFor('autofillMissingData', async (data, ack) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const currentEventId = data && data.eventId != null ? data.eventId : signupEventIdRep.value;

    const previousEvents = await conn.query('SELECT `id` FROM `events` WHERE `id` < ? ORDER BY `id` DESC', [
      currentEventId,
    ]);

    const historicalRowsByEventId = new Map();
    async function getHistoricalRows(eventId) {
      if (!historicalRowsByEventId.has(eventId)) {
        historicalRowsByEventId.set(eventId, await getContactsForEvent(eventId));
      }
      return historicalRowsByEventId.get(eventId);
    }

    async function findHistoricalMatch(challongeUsername) {
      for (const event of previousEvents) {
        const historicalRows = await getHistoricalRows(Number(event.id));
        const match = historicalRows.find(
          (r) => r.challonge_username && r.challonge_username.toLowerCase() === challongeUsername.toLowerCase(),
        );
        if (match) return match;
      }
      return null;
    }

    // Players who are on Challonge for this tournament but have no signup at all for this
    // event: if we recognize their Challonge username from an older tournament, sign up
    // their existing (historical) account for this event too.
    const addedPlayers = [];

    const tournamentSlug = await getChallongeTournamentForEvent(currentEventId);
    const tournament = await challonge.getTournament(tournamentSlug);
    const participantNames = tournament.participants.map((p) => p.participant.display_name);

    let currentRows = await getContactsForEvent(currentEventId);
    const currentChallongeNames = new Set(
      currentRows.filter((row) => row.challonge_username).map((row) => row.challonge_username.toLowerCase()),
    );

    for (const name of participantNames) {
      if (currentChallongeNames.has(name.toLowerCase())) continue;

      const match = await findHistoricalMatch(name);
      if (!match) continue;

      await conn.query('INSERT INTO `signups` (`user_id`, `event_id`, `flavor`) VALUES (?, ?, ?)', [
        match.id,
        currentEventId,
        '',
      ]);

      addedPlayers.push({ discordId: match.id, challongeUsername: match.challonge_username });
    }

    // Re-fetch so newly-added players are also covered by the missing-field backfill below.
    if (addedPlayers.length > 0) {
      currentRows = await getContactsForEvent(currentEventId);
    }

    const updates = [];

    for (const row of currentRows) {
      if (!row.challonge_username) {
        // Without a Challonge username we have no way to recognize this player in past tournaments.
        continue;
      }

      const missingFields = AUTOFILL_FIELDS.filter((field) => !row[field]);
      if (missingFields.length === 0) continue;

      const filled = {};

      for (const event of previousEvents) {
        if (Object.keys(filled).length === missingFields.length) break;

        const historicalRows = await getHistoricalRows(Number(event.id));
        const match = historicalRows.find(
          (r) => r.challonge_username && r.challonge_username.toLowerCase() === row.challonge_username.toLowerCase(),
        );

        if (!match) continue;

        for (const field of missingFields) {
          if (filled[field] === undefined && match[field]) {
            filled[field] = match[field];
          }
        }
      }

      if (Object.keys(filled).length > 0) {
        updates.push({ discordId: row.id, challongeUsername: row.challonge_username, filled });
      }
    }

    for (const update of updates) {
      const setClauses = Object.keys(update.filled)
        .map((field) => `\`${field}\` = ?`)
        .join(', ');
      await conn.query(`UPDATE \`users\` SET ${setClauses} WHERE \`id\` = ?`, [
        ...Object.values(update.filled),
        update.discordId,
      ]);
    }

    ack(null, {
      addedPlayers: addedPlayers.map((p) => p.challongeUsername),
      updatedFields: updates.map((u) => ({
        challongeUsername: u.challongeUsername,
        fields: Object.keys(u.filled),
      })),
    });
  } catch (err) {
    ack(err);
  } finally {
    if (conn) conn.end();
  }
});

function rowToPlayer(row) {
  return {
    signupId: String(row.signup_id),
    discordId: row.id,
    username: row.username,
    challongeUsername: row.challonge_username,
    twitch: row.twitch,
    pronouns: row.pronouns,
    flag: row.flag,
    flavor: row.flavor,
  };
}

nodecg.listenFor('getPlayers', async (data, ack) => {
  try {
    const eventId = data && data.eventId != null ? data.eventId : signupEventIdRep.value;
    const rows = await getContactsForEvent(eventId);
    ack(null, rows.map(rowToPlayer));
  } catch (err) {
    ack(err);
  }
});

nodecg.listenFor('addPlayer', async (player, ack) => {
  let conn;
  try {
    if (!player.discordId || !player.username || !player.challongeUsername) {
      throw new Error('Discord ID, display name and Challonge username are required.');
    }

    const eventId = player.eventId != null ? player.eventId : signupEventIdRep.value;

    conn = await pool.getConnection();

    const existingSignup = await conn.query('SELECT `id` FROM `signups` WHERE `user_id` = ? AND `event_id` = ?', [
      player.discordId,
      eventId,
    ]);

    if (existingSignup.length > 0) {
      throw new Error('This player is already signed up for this event.');
    }

    const existingUser = await conn.query('SELECT `id` FROM `users` WHERE `id` = ?', [player.discordId]);

    if (existingUser.length === 0) {
      await conn.query(
        `INSERT INTO \`users\`
          (\`id\`, \`username\`, \`discriminator\`, \`email\`, \`verified\`, \`locale\`, \`mfa_enabled\`, \`slug\`,
           \`challonge_username\`, \`twitch\`, \`pronouns\`, \`timezone\`, \`availability\`, \`srl_username\`, \`flag\`)
         VALUES (?, ?, '0', '', 0, 'en', 0, ?, ?, ?, ?, '', '', '', ?)`,
        [
          player.discordId,
          player.username,
          player.discordId,
          player.challongeUsername,
          player.twitch ?? '',
          player.pronouns ?? '',
          player.flag ?? '',
        ],
      );
    } else {
      await conn.query(
        'UPDATE `users` SET `username` = ?, `challonge_username` = ?, `twitch` = ?, `pronouns` = ?, `flag` = ? WHERE `id` = ?',
        [
          player.username,
          player.challongeUsername,
          player.twitch ?? '',
          player.pronouns ?? '',
          player.flag ?? '',
          player.discordId,
        ],
      );
    }

    await conn.query('INSERT INTO `signups` (`user_id`, `event_id`, `flavor`) VALUES (?, ?, ?)', [
      player.discordId,
      eventId,
      player.flavor ?? '',
    ]);

    ack(null);
  } catch (err) {
    ack(err);
  } finally {
    if (conn) conn.end();
  }
});

nodecg.listenFor('updatePlayer', async (player, ack) => {
  let conn;
  try {
    if (!player.signupId || !player.discordId || !player.username || !player.challongeUsername) {
      throw new Error('Missing required player fields.');
    }

    conn = await pool.getConnection();

    await conn.query(
      'UPDATE `users` SET `username` = ?, `challonge_username` = ?, `twitch` = ?, `pronouns` = ?, `flag` = ? WHERE `id` = ?',
      [
        player.username,
        player.challongeUsername,
        player.twitch ?? '',
        player.pronouns ?? '',
        player.flag ?? '',
        player.discordId,
      ],
    );

    await conn.query('UPDATE `signups` SET `flavor` = ? WHERE `id` = ?', [player.flavor ?? '', player.signupId]);

    ack(null);
  } catch (err) {
    ack(err);
  } finally {
    if (conn) conn.end();
  }
});

nodecg.listenFor('removePlayer', async (signupId, ack) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('DELETE FROM `signups` WHERE `id` = ?', [signupId]);
    ack(null);
  } catch (err) {
    ack(err);
  } finally {
    if (conn) conn.end();
  }
});

exports.signupEventIdRep = signupEventIdRep;
exports.getContacts = getContacts;
exports.getChallongeTournament = getChallongeTournament;
