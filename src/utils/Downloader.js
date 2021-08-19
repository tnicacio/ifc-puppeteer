const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const URL = require('url').URL;

function createDirectoryIfNotExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true,
    });
  }
}

function download(url, filePath, callback) {
  const userURL = new URL();
  const requestCaller = userURL.protocol === 'http:' ? http : https;

  const fileName = path.basename(url);

  const req = requestCaller.get(url, function (res) {
    const fileStream = fs.createWriteStream(path.resolve(filePath, fileName));
    res.pipe(fileStream);

    fileStream.on('error', function (err) {
      console.log('Error writing to the stream');
      console.log(err);
    });

    fileStream.on('close', function () {
      callback(filename);
    });

    fileStream.on('finish', function () {
      fileStream.close();
    });
  });

  req.on('error', function (err) {
    console.log('Error downloading the file');
    console.log(err);
  });
}

module.exports = { download, createDirectoryIfNotExists };
