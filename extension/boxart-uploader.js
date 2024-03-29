const ctx = require('./nodecg');
const nodecg = ctx.get();

const boxartsRep = nodecg.Replicant('assets:boxarts', { defaultValue: [] });
const currentBoxartRep = nodecg.Replicant('currentBoxart', { defaultValue: '' });

function uploadBoxart(url) {
  let whitelist = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  let ext = url.split('.').pop();
  if (!whitelist.includes(ext)) {
    nodecg.log.error('Invalid file type');
    return;
  }

  let filename = url.split('/').pop();
  let timestamp = Date.now();
  let filepath = `assets/nodecg-mysteryfunhouse/boxarts/${timestamp}-${filename}`;

  download(url, filepath, () => {});
}

const request = require('request');
var fs = require('fs');

const download = (url, dest, cb) => {
  const file = fs.createWriteStream(dest);
  const sendReq = request.get({
    url: url,
    headers: {
      'user-agent': 'curl/8.1.1',
      accept: '*/*',
    },
  });

  // verify response code
  sendReq.on('response', (response) => {
    if (response.statusCode !== 200) {
      console.log(`Download failed: ${response.statusCode}`);
      file.close(cb);
      fs.unlink(dest, () => cb());
      return cb('Response status was ' + response.statusCode);
    }

    sendReq.pipe(file);
  });

  // close() is async, call cb after close completes
  file.on('finish', () => {
    currentBoxartRep.value = { ...boxartsRep.value[boxartsRep.value.length - 1] };
    file.close(cb);
  });

  // check for request errors
  sendReq.on('error', (err) => {
    fs.unlink(dest, () => cb(err.message)); // delete the (partial) file and then return the error
  });

  file.on('error', (err) => {
    // Handle errors
    fs.unlink(dest, () => cb(err.message)); // delete the (partial) file and then return the error
  });
};
nodecg.listenFor('uploadBoxart', uploadBoxart);
