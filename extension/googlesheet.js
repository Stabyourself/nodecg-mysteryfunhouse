const { GoogleSpreadsheet } = require('google-spreadsheet');

const ctx = require('./nodecg')
const nodecg = ctx.get()

const contactDoc = new GoogleSpreadsheet('1r_qMIhjLBhVsjfIfL_tDK2a_iDa1_yDjCwz4tfkxbHA')
contactDoc.useApiKey(nodecg.bundleConfig.googleApiKey);

let contactSheet
contactDoc.loadInfo().then(function() {
    contactSheet = contactDoc.sheetsByIndex[0]
})



const careerDoc = new GoogleSpreadsheet('1DWYq3T1w8u1N0CWWJ72tqQRv67c1eY098u0wyuiMEmA')
careerDoc.useApiKey(nodecg.bundleConfig.googleApiKey);

let careerSheet
careerDoc.loadInfo().then(function() {
    careerSheet = careerDoc.sheetsByIndex[0]
})



exports.getContactInfo = function(challongeName) {
    return new Promise(function(resolve, reject) {
        contactSheet.getRows().then(function(rows) {
            let row = rows.find(row => {
                return row._rawData[2] == challongeName
            })

            if (row) {
                resolve(Object.assign({}, row, {_sheet: undefined}))
            } else {
                reject("Couldn't find this player on the contact sheet.")
            }
        })
    })
}

exports.getCareerInfo = function(SRLName) {
    return new Promise(function(resolve, reject) {
        careerSheet.getRows().then(function(rows) {
            let row = rows.find(row => {
                return row._rawData[1] == SRLName
            })

            if (row) {
                resolve(Object.assign({}, row, {_sheet: undefined}))
            } else {
                reject("Couldn't find this player on the contact sheet.")
            }
        })
    })
}