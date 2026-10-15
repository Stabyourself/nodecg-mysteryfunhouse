const ctx = require('./nodecg');
const nodecg = ctx.get();

const googlesheet = require('./googlesheet');

const scheduleRep = nodecg.Replicant('schedule', { defaultValue: [] });

const newYork = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' });

// minutes new york is off from utc at that moment ("GMT-4" -> -240). it switches on other
// days than europe, so this can't come from the server's own clock
function newYorkOffset(date) {
  const name = newYork.formatToParts(date).find((part) => part.type === 'timeZoneName').value;
  const match = /GMT([+-]\d+)(?::(\d+))?/.exec(name);
  if (!match) return 0;

  const hours = Number(match[1]);
  return hours * 60 + Math.sign(hours) * Number(match[2] || 0);
}

// the sheet has new york wall clock times
function parseNewYorkTime(date, time) {
  const wall = new Date(`${date} ${time} UTC`);
  if (isNaN(wall)) return wall;

  // the offset of the first guess can be the wrong one right at a switch, so look again
  const guess = wall.getTime() - newYorkOffset(wall) * 60000;
  return new Date(wall.getTime() - newYorkOffset(new Date(guess)) * 60000);
}

let lastError = null;

function updateSchedule() {
  googlesheet
    .getScheduleSheet()
    .then(function (rows) {
      let schedule = [];
      const now = new Date();

      for (let row of rows) {
        let time = parseNewYorkTime(row['Date'], row['Match Time']);

        if (isNaN(time) || time < now) {
          continue;
        }

        // format round
        let round = row['Round'] ?? '';

        if (round.length === 2) {
          if (round[0] == 'W') {
            round = 'Winners ' + round[1];
          } else if (round[0] == 'L') {
            round = 'Losers ' + round[1];
          }
        } else {
          let roundSplit = round.split(' ');

          if (roundSplit[0] === 'W' || roundSplit[0] === 'Winners') {
            round = 'Winners ' + roundSplit[1];
          } else if (roundSplit[0] === 'L' || roundSplit[0] === 'Losers') {
            round = 'Losers ' + roundSplit[1];
          }
        }

        schedule.push({
          time: time,
          player1: row['Player 1'],
          player2: row['Player 2'],
          round: round,
          match: row['_rawData'][2],
        });
      }

      schedule = schedule.sort((a, b) => a.time - b.time);

      lastError = null;

      // the same list every minute, no need to send it to everyone again
      if (JSON.stringify(schedule) !== JSON.stringify(scheduleRep.value)) {
        scheduleRep.value = schedule;
      }
    })
    .catch(function (err) {
      // once per problem, not every minute
      const message = err && err.message ? err.message : String(err);
      if (message !== lastError) {
        lastError = message;
        nodecg.log.warn('Could not update the schedule:', message);
      }
    });
}

setTimeout(updateSchedule, 5000);
setInterval(updateSchedule, 60000);
