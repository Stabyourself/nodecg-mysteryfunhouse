const { GoogleSpreadsheet } = require('google-spreadsheet');

const ctx = require('./nodecg')
const nodecg = ctx.get()

const contactDoc = new GoogleSpreadsheet('1r_qMIhjLBhVsjfIfL_tDK2a_iDa1_yDjCwz4tfkxbHA')
contactDoc.useApiKey(nodecg.bundleConfig.googleApiKey);

let contactSheet
contactDoc.loadInfo().then(function() {
    contactSheet = contactDoc.sheetsByIndex[0]
})



exports.getPlayerInfo = function(SRLName) {
    return new Promise(function(resolve, reject) {
        contactSheet.getRows().then(function(rows) {
            let row = rows.find(row => {
                return row._rawData[2] == SRLName
            })

            if (row) {
                resolve(row)
            } else {
                reject("Couldn't find this player on the contact sheet.")
            }
        })
    })
}