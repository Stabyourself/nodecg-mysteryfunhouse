const { GoogleSpreadsheet } = require('google-spreadsheet');

const ctx = require('./nodecg');
const nodecg = ctx.get();

const careerDoc = new GoogleSpreadsheet(nodecg.bundleConfig.careerSheet);
careerDoc.useApiKey(nodecg.bundleConfig.googleApiKey);

let careerSheet;
careerDoc.loadInfo().then(function () {
  careerSheet = careerDoc.sheetsByIndex[0];
});

const scheduleDoc = new GoogleSpreadsheet(nodecg.bundleConfig.scheduleSheet);
scheduleDoc.useApiKey(nodecg.bundleConfig.googleApiKey);

let scheduleSheet;
scheduleDoc.loadInfo().then(function () {
  scheduleSheet = scheduleDoc.sheetsByIndex[0];
});

const playedGamesDoc = new GoogleSpreadsheet(nodecg.bundleConfig.playedGamesSheet);
playedGamesDoc.useApiKey(nodecg.bundleConfig.googleApiKey);

let playedGamesSheet;
playedGamesDoc.loadInfo().then(function () {
  playedGamesSheet = playedGamesDoc.sheetsByIndex[0];
});

exports.getCareerSheet = function () {
  if (!careerSheet) {
    return new Promise((res, rej) => {
      rej("Career sheet isn't loaded yet");
    });
  }
  return careerSheet.getRows();
};

exports.getScheduleSheet = function () {
  if (!scheduleSheet) {
    return new Promise((res, rej) => {
      rej("Schedule sheet isn't loaded yet");
    });
  }
  return scheduleSheet.getRows();
};

exports.getPlayedGamesSheet = function () {
  if (!playedGamesSheet) {
    return new Promise((res, rej) => {
      rej("Schedule sheet isn't loaded yet");
    });
  }
  return playedGamesSheet.getRows();
};
