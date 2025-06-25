const ctx = require('./nodecg');
const nodecg = ctx.get();

const boxartsRep = nodecg.Replicant('assets:boxarts', { defaultValue: [] });
const currentBoxartRep = nodecg.Replicant('currentBoxart', { defaultValue: '' });

var fs = require('fs');

function uploadBoxart(dataUrl) {
  let timestamp = Date.now();

  // Write the imageText to a file
  var regex = /^data:.+\/(.+);base64,(.*)$/;

  var matches = dataUrl.match(regex);
  var ext = matches[1];
  var data = matches[2];
  var buffer = Buffer.from(data, 'base64');
  let filename = `boxart.${ext}`;
  let filepath = `assets/nodecg-mysteryfunhouse/boxarts/${timestamp}-${filename}`;
  fs.writeFileSync(filepath, buffer);

  setTimeout(() => {
    currentBoxartRep.value = { ...boxartsRep.value[boxartsRep.value.length - 1] };
  }, 1000);
}

nodecg.listenFor('uploadBoxart', uploadBoxart);
