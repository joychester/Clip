const robot = require('robotjs'),
      config = require('config'),
      bmp = require('bmp-js'),
      fs = require('fs'),
      path = require('path'),
      Jimp = require('jimp'),
      wait = require('wait-promise');

var clipConfig = config.get('Clip');

// Load from default config file
var deletebmp = clipConfig.get('deletebmp'),
    captureInterval = clipConfig.get('captureInterval'),
    timeLimit = clipConfig.get('timeLimit'),
    pngScale = clipConfig.get('imageCompress');

var imgBufArray = [],
    imgMetaArray = [],
    indx = 1,
    complete = [],
    splitter = path.sep,
    screenshotsPath = __dirname + splitter + 'screenshots_' + Date.now() + splitter;

// take full screenshots by robot lib
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

// encode bitmap obj
function bmpEncode(bitmapObj) {
    let rawData={data:bitmapObj.image, width:bitmapObj.width, height:bitmapObj.height}
    imgBuf = bmp.encode(rawData);
    return imgBuf;
}

var stopFlag = false;

// waiting for the signal to stop the screen capture from parent test process
process.on('message', (m) => {
    if (m.clip === 'stop') {
      stopFlag = true;
    }
});

// taking screenshots for every 200ms until 5000ms, for example
var promise = wait.every(captureInterval).before(timeLimit).until( function() {

    fullScreenCapture(indx.toString());

    indx++;
    return stopFlag;
});

// after processing the screenshots
promise.then( function() {
  for (let item of imgBufArray) {
    imgMetaArray.push(bmpEncode(item));
  }
});

// save as a bmp file
promise.then( function() {
  // create screenshots folder
  fs.mkdirSync(screenshotsPath);

  for (i = 0; i < imgBufArray.length; i++) {
    console.log("saving bmp image:" + imgBufArray[i].id);
    let bmpFile = imgBufArray[i].ts + ".bmp";
    let bmpData = imgMetaArray[i].data;
    fs.writeFileSync(screenshotsPath + bmpFile, bmpData);
  }
  console.log("All bmp files saved.");
});

// convert bmp files to png files
promise.then( function() {
  for (i = 0; i < imgBufArray.length; i++) {
    let item = imgBufArray[i];
    let bmpFile = item.ts + ".bmp";
    let pngFile = item.ts + ".png";
    Jimp.read(screenshotsPath + bmpFile).then( function (bf){
      bf.scale(pngScale).write(screenshotsPath + pngFile, function() {
        complete.push(screenshotsPath + bmpFile);
        console.log('png file converted.');
      });
    });
  }
});

// waiting for all png files generated
promise.then( function() {
  require('deasync').loopWhile(function(){
    // 'true' will enter the loop;
    // 'false' will exit the loop;
    return (complete.length < imgBufArray.length);
  });
});

// delete all bmp files
promise.then( function() {
  if (deletebmp) {
    for (i = 0; i < imgBufArray.length; i++) {
      let bmpFile = complete[i];
      fs.unlinkSync(bmpFile);
    }
    console.log('All bmp files deleted. clip process exit.');
    process.exit();
  }
});
