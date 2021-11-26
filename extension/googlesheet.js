const { GoogleSpreadsheet } = require("google-spreadsheet");

const ctx = require("./nodecg");
const nodecg = ctx.get();

const contactDoc = new GoogleSpreadsheet(nodecg.bundleConfig.contactSheet);
contactDoc.useApiKey(nodecg.bundleConfig.googleApiKey);

let contactSheet;
contactDoc.loadInfo().then(function() {
  contactSheet = contactDoc.sheetsByIndex[0];
});

const careerDoc = new GoogleSpreadsheet(nodecg.bundleConfig.careerSheet);
careerDoc.useApiKey(nodecg.bundleConfig.googleApiKey);

let careerSheet;
careerDoc.loadInfo().then(function() {
  careerSheet = careerDoc.sheetsByIndex[0];
});

exports.getContactSheet = function() {
  if (!contactSheet) {
    return new Promise((res, rej) => {
      rej("Contact sheet isn't loaded yet");
    });
  }
  return contactSheet.getRows();
};

exports.getCareerSheet = function() {
  if (!careerSheet) {
    return new Promise((res, rej) => {
      rej("Career sheet isn't loaded yet");
    });
  }
  return careerSheet.getRows();
};
