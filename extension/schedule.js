const ctx = require('./nodecg');
const nodecg = ctx.get();

const googlesheet = require('./googlesheet');

const scheduleRep = nodecg.Replicant('schedule', { defaultValue: [] });

function updateSchedule() {
  googlesheet.getScheduleSheet().then(function (rows) {
    let schedule = [];

    for (let row of rows) {
      let timeZone = 'EST';
      if (new Date(row['Date']).isDstObserved()) {
        timeZone = 'EDT';
      }

      let time = new Date(row['Date'] + ' ' + row['Match Time'] + ' ' + timeZone);
      let now = new Date();

      if (time < now) {
        continue;
      }

      // format round
      let round = row['Round'] ?? '';

      if (round.length === 2) {
        if (round[0] == 'W') {
          round = 'Wizards ' + round[1];
        } else if (round[0] == 'L') {
          round = 'Lizards ' + round[1];
        }
      } else {
        let roundSplit = round.split(' ');

        if (roundSplit[0] === 'W' || roundSplit[0] === 'Winners' || roundSplit[0] === 'Wizards') {
          round = 'Wizards ' + roundSplit[1];
        } else if (roundSplit[0] === 'L' || roundSplit[0] === 'Losers' || roundSplit[0] === 'Lizards') {
          round = 'Lizards ' + roundSplit[1];
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

    scheduleRep.value = schedule;
  });
}

Date.prototype.stdTimezoneOffset = function () {
  var jan = new Date(this.getFullYear(), 0, 1);
  var jul = new Date(this.getFullYear(), 6, 1);
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
};

Date.prototype.isDstObserved = function () {
  return this.getTimezoneOffset() < this.stdTimezoneOffset();
};

setTimeout(updateSchedule, 5000);
setInterval(updateSchedule, 60000);
