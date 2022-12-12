const ctx = require("./nodecg");
const nodecg = ctx.get();

function uploadBoxart(url) {
  let whitelist = ["jpg", "jpeg", "png", "gif", "webp"];

  let ext = url.split(".").pop();
  if (!whitelist.includes(ext)) {
    nodecg.log.error("Invalid file type");
    return;
  }

  let filename = url.split("/").pop();
  let timestamp = Date.now();
  let filepath = `assets/nodecg-mysteryfunhouse/boxarts/${timestamp}-${filename}`;

  download(url, filepath, () => {});
}

const request = require("request");
var fs = require("fs");

const download = (url, dest, cb) => {
  const file = fs.createWriteStream(dest);
  const sendReq = request.get(url);

  // verify response code
  sendReq.on("response", (response) => {
    console.log(response.statusCode);
    if (response.statusCode !== 200) {
      file.close(cb);
      fs.unlink(dest, () => cb());
      return cb("Response status was " + response.statusCode);
    }

    sendReq.pipe(file);
  });

  // close() is async, call cb after close completes
  file.on("finish", () => file.close(cb));

  // check for request errors
  sendReq.on("error", (err) => {
    fs.unlink(dest, () => cb(err.message)); // delete the (partial) file and then return the error
  });

  file.on("error", (err) => {
    // Handle errors
    fs.unlink(dest, () => cb(err.message)); // delete the (partial) file and then return the error
  });
};
nodecg.listenFor("uploadBoxart", uploadBoxart);
