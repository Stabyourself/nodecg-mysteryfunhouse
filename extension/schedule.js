const ctx = require("./nodecg");
const nodecg = ctx.get();

const googlesheet = require("./googlesheet");

const scheduleRep = nodecg.Replicant("schedule", { defaultValue: [] });

function updateSchedule() {
  googlesheet.getScheduleSheet().then(function (rows) {
    let schedule = [];

    for (let row of rows) {
      let time = new Date(row["Date"] + " " + row["Match Time"] + " EST");
      let now = new Date();

      if (time < now) {
        continue;
      }

      schedule.push({
        time: time,
        player1: row["Player 1"],
        player2: row["Player 2"],
        round: row["Round"],
        match: row["_rawData"][2],
      });
    }

    schedule = schedule.sort((a, b) => a.time - b.time);

    scheduleRep.value = schedule;
  });
}

setInterval(updateSchedule, 10000);
