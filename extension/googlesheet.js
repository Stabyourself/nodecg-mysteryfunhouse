const { GoogleSpreadsheet } = require('google-spreadsheet');

const ctx = require('./nodecg');
const nodecg = ctx.get();

const auth = { apiKey: nodecg.bundleConfig.googleApiKey };

const careerDoc = new GoogleSpreadsheet(nodecg.bundleConfig.careerSheet, auth);

let careerSheet;
careerDoc.loadInfo().then(function () {
  careerSheet = careerDoc.sheetsByTitle["MT Career"];
});

const scheduleDoc = new GoogleSpreadsheet(nodecg.bundleConfig.scheduleSheet, auth);

let scheduleSheet;
scheduleDoc.loadInfo().then(function () {
  scheduleSheet = scheduleDoc.sheetsByIndex[0];
});

const playedGamesDoc = new GoogleSpreadsheet(nodecg.bundleConfig.playedGamesSheet, auth);

let playedGamesSheet;
playedGamesDoc.loadInfo().then(function () {
  playedGamesSheet = playedGamesDoc.sheetsByIndex[0];
});

// Rows are handed out as plain objects keyed by header (plus `_rawData`, the cells by
// column index), so callers can use row['Header'] and put rows straight into replicants.
async function getPlainRows(sheet) {
  const rows = await sheet.getRows();
  return rows.map((row) => ({ ...row.toObject(), _rawData: row._rawData }));
}

exports.getCareerSheet = function () {
  if (!careerSheet) {
    return new Promise((res, rej) => {
      rej("Career sheet isn't loaded yet");
    });
  }
  return getPlainRows(careerSheet);
};

exports.getScheduleSheet = function () {
  if (!scheduleSheet) {
    return new Promise((res, rej) => {
      rej("Schedule sheet isn't loaded yet");
    });
  }
  return getPlainRows(scheduleSheet);
};

exports.getPlayedGamesSheet = function () {
  if (!playedGamesSheet) {
    return new Promise((res, rej) => {
      rej("Schedule sheet isn't loaded yet");
    });
  }
  return getPlainRows(playedGamesSheet);
};
