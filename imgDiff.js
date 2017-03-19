const Jimp = require("jimp"),
      config = require('config'),
      fs = require("fs"),
      path = require("path"),
      wait = require('wait-promise');

var imgDiffConfig = config.get('ImgDiff');

var folder_path = '',
    cont = false,
    jmap_files = [],
    selected_pic = '',
    image_files = [],
    nav_start = 0,
    threshold = imgDiffConfig.get('pixels_diff_threshold');

function isPNG(file) {
    return path.extname(file) === '.png';
}

process.on('message', (m) => {
    console.log('imgDiff got message from Parent clip Process:', m);
    if (m.bucket !== '') {
      folder_path = m.bucket;
      cont = true;
      nav_start = m.loadStart;
    }
});

var promise = wait.until(function(){
    return cont;
});

promise.then( function() {

  var files = fs.readdirSync(folder_path);

  image_files = files.filter(isPNG)
  console.log(image_files);
});

promise.then( function() {

  image_files.forEach( function(elem) {
    jmap_files.push(Jimp.read(folder_path + elem));
  });

  Promise.all(jmap_files).then( function(images) {
    console.log('Start Calculate pixels');
    // will consider to prepare base.png by users as well to do imgdiff
    let baseImg = images.pop();
    images.every( function(img, index) {
      img_diff_perc = Jimp.diff(baseImg, img).percent;
      //console.log(img_diff_perc);
      if (img_diff_perc * 10000 <= threshold) {
       selected_pic = image_files[index];
       // exit the loop
       return false;
      }
      // keep searching...
      return true;
    });
    // last screenshots is picked
    if (selected_pic === '') {
      selected_pic = image_files[image_files.length - 1];
    }

   let visual_complete_TS = selected_pic.substr(0, selected_pic.lastIndexOf('.'));
   let visual_complete_duration = visual_complete_TS - nav_start;
   console.log("Selected Screenshots TS: " + visual_complete_TS);
   console.log("visual complete duration: " +  visual_complete_duration);
   process.send( {imgDiff: 'complete', vcd: visual_complete_duration} );
  });
});
