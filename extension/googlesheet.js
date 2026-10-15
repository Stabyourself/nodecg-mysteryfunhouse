const { GoogleSpreadsheet } = require('google-spreadsheet');

const ctx = require('./nodecg');
const nodecg = ctx.get();

const auth = { apiKey: nodecg.bundleConfig.googleApiKey };

// returns a function that resolves with the sheet. it's loaded once and kept, but a load that
// failed (no network when nodecg started, google having a moment) is tried again on the next
// call instead of staying broken until a restart
function lazySheet(name, sheetId, pick) {
  const doc = new GoogleSpreadsheet(sheetId, auth);
  let loading = null;

  return function () {
    if (!loading) {
      loading = doc.loadInfo().then(() => {
        const sheet = pick(doc);
        if (!sheet) throw new Error(`the ${name} document has no such sheet`);
        return sheet;
      });

      loading.catch(() => {
        loading = null;
      });
    }

    return loading;
  };
}

const careerSheet = lazySheet('career', nodecg.bundleConfig.careerSheet, (doc) => doc.sheetsByTitle['MT Career']);
const scheduleSheet = lazySheet('schedule', nodecg.bundleConfig.scheduleSheet, (doc) => doc.sheetsByIndex[0]);
const playedGamesSheet = lazySheet('played games', nodecg.bundleConfig.playedGamesSheet, (doc) => doc.sheetsByIndex[0]);

// load them right away so the first match load doesn't wait for it
for (const [name, sheet] of [
  ['career', careerSheet],
  ['schedule', scheduleSheet],
  ['played games', playedGamesSheet],
]) {
  sheet().catch((err) => {
    nodecg.log.warn(`Could not load the ${name} sheet yet, trying again when it's needed:`, err.message);
  });
}

// Rows are handed out as plain objects keyed by header (plus `_rawData`, the cells by
// column index), so callers can use row['Header'] and put rows straight into replicants.
async function getPlainRows(sheet) {
  const rows = await (await sheet()).getRows();
  return rows.map((row) => ({ ...row.toObject(), _rawData: row._rawData }));
}

exports.getCareerSheet = function () {
  return getPlainRows(careerSheet);
};

exports.getScheduleSheet = function () {
  return getPlainRows(scheduleSheet);
};

exports.getPlayedGamesSheet = function () {
  return getPlainRows(playedGamesSheet);
};
