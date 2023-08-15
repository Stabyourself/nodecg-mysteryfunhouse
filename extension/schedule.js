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

      // format round
      let round = row["Round"] ?? "";
      if (round.length === 2) {
        if (round[0] === "W") {
          round = "Winners " + round[1];
        } else if (round[0] === "L") {
          round = "Losers " + round[1];
        }
      }

      schedule.push({
        time: time,
        player1: row["Player 1"],
        player2: row["Player 2"],
        round: round,
        match: row["_rawData"][2],
      });
    }

    schedule = schedule.sort((a, b) => a.time - b.time);

    scheduleRep.value = schedule;
  });
}

setTimeout(updateSchedule, 5000);
setInterval(updateSchedule, 60000);
