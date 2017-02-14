const robot = require('robotjs'),
      bmp = require('bmp-js'),
      fs = require('fs'),
      tinify = require('tinify'),
      Jimp = require('jimp'),
      wait = require('wait-promise');

var imgBufArray = [],
    imgMetaArray = [],
    deletebmp = true,
    tinypng = false;

tinify.key = "L0stwA6Sy6zQD-mpO4RaLUjACfcU2Uc6";

function fullScreenCapture(serial) {
  let ts = Date.now();
  let bmpData = robot.screen.capture();
  bmpData.ts = ts;
  bmpData.id = serial;
  imgBufArray.push(bmpData);

  console.log('Taking Screenshot No.' + serial);
  // return a BMP Object : { data: <Buffer 42 4d 36 ... >, width: 2880, height: 1800 }
  return imgBufArray;
}

function bmpEncode(bitmapObj) {
    // encode bitmap obj
    let rawData={data:bitmapObj.image, width:bitmapObj.width, height:bitmapObj.height}
    imgBuf = bmp.encode(rawData);
    return imgBuf;
}

function saveImage(fileName, bmpBuf, delMode, tinyMode) {
  let bmpFile = fileName + ".bmp";
  let pngFile = fileName + ".png";
  let optPngFile = fileName + "_opt.png";

  fs.writeFile(bmpFile, bmpBuf.data, function(err) {
      if(err) {
          console.log(err);
      } else {
        // convert bmp to png and optimize png file by tinypng
        Jimp.read(bmpFile).then( function(bmp) {
          bmp.scale(0.2)
             .write(pngFile, function (){
               console.log('convert bmp format to png');
               if (delMode) {
                 //remove bmp
                 fs.unlink(bmpFile, function() {
                   console.log('origin bmp file deleted.');
                 });
               }

               if (tinyMode) {
                 //png optimization by tinypng
                 let source = tinify.fromFile(pngFile);
                 source.toFile(optPngFile, function(err) {
                   if (err) {
                     // err happened..
                     throw err;
                   } else {
                     console.log('tinypng file saved');
                     // remove origin png file and just keep
                     fs.unlink(pngFile, function() {
                       console.log('origin png file deleted.');
                     });
                   }
                 });
               }
            });
        });
      }
  });
}

let indx = 1;
var stopFlag = false;

// waiting for the signal from parent test process
process.on('message', (m) => {
    if (m.clip === 'stop') {
      stopFlag = true;
    }
});

let promise = wait.every(200).before(5000).until( function() {

    fullScreenCapture(indx.toString());

    indx++;
    return stopFlag;
});

//after processing the screenshots
promise.then( function() {
  for (let item of imgBufArray) {
    imgMetaArray.push(bmpEncode(item));
  }

  for (i = 0; i < imgBufArray.length; i++) {
    console.log("saving images:" + imgBufArray[i].id);
    saveImage(imgBufArray[i].ts, imgMetaArray[i], deletebmp, tinypng);
  }
}).then( function() {
    console.log('stop the screenshot proc...');
});
