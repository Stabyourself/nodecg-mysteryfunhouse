const { GoogleSpreadsheet } = require('google-spreadsheet');

const ctx = require('./nodecg')
const nodecg = ctx.get()

const contactDoc = new GoogleSpreadsheet(nodecg.bundleConfig.contactSheet)
contactDoc.useApiKey(nodecg.bundleConfig.googleApiKey);

let contactSheet
contactDoc.loadInfo().then(function() {
    contactSheet = contactDoc.sheetsByIndex[0]
})



const careerDoc = new GoogleSpreadsheet(nodecg.bundleConfig.careerSheet)
careerDoc.useApiKey(nodecg.bundleConfig.googleApiKey);

let careerSheet
careerDoc.loadInfo().then(function() {
    careerSheet = careerDoc.sheetsByIndex[0]
})



exports.getContactInfo = function(challongeName) {
    return new Promise(function(resolve, reject) {
        contactSheet.getRows().then(function(rows) {
            let row = rows.find(row => {
                return row._rawData[2].toLowerCase() == challongeName.toLowerCase()
            })

            if (row) {
                resolve(Object.assign({}, row, {_sheet: undefined}))
            } else {
                reject(`Couldn't find challonge username "${challongeName}" on the Contact Sheet.`)
            }
        })
    })
}

exports.getCareerInfo = function(SRLName) {
    return new Promise(function(resolve, reject) {
        careerSheet.getRows().then(function(rows) {
            let row = rows.find(row => {
                return row._rawData[1].toLowerCase() == SRLName.toLowerCase()
            })

            if (row) {
                resolve(Object.assign({}, row, {_sheet: undefined}))
            } else {
                reject(`Couldn't find SRL username "${SRLName}" on the Career Sheet.`)
            }
        })
    })
}