const Jimp = require("jimp"),
      config = require('config'),
      fs = require("fs"),
      path = require("path"),
      wait = require('wait-promise');

var imgDiffConfig = config.get('ImgDiff');

var folder_path = '',
    cont = false,
    jmap_files = [],
    fp_pic = '',
    vc_pic = '',
    image_files = [],
    nav_start = 0,
    fp_thres = imgDiffConfig.get('first_paint_threshold');
    vc_thres = imgDiffConfig.get('visual_complete_threshold');

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
    console.log('Select First Paint PNG');
    let firstImg = images[0]
    images.every( function(img, index) {
      offset = Jimp.diff(firstImg, img).percent;
      //console.log('first paint: ' + offset);
      if (offset * 100 >= fp_thres) {
        fp_pic = image_files[index];
        console.log(fp_pic);
        return false;
      }
      return true;
    });

    console.log('Select Visual Complete PNG');
    // will consider to prepare base.png by users as well to do imgdiff
    let baseImg = images.pop();
    images.every( function(img, index) {
      img_diff_perc = Jimp.diff(baseImg, img).percent;
      //console.log(img_diff_perc);
      if (img_diff_perc * 10000 <= vc_thres) {
       vc_pic = image_files[index];
       // exit the loop
       return false;
      }
      // keep searching...
      return true;
    });
    // last screenshots is picked
    if (vc_pic === '') {
      vc_pic = image_files[image_files.length - 1];
    }

   let first_paint_TS = fp_pic.substr(0, fp_pic.lastIndexOf('.'));
   let first_paint_duration = first_paint_TS - nav_start;

   let visual_complete_TS = vc_pic.substr(0, vc_pic.lastIndexOf('.'));
   let visual_complete_duration = visual_complete_TS - nav_start;

   console.log("FirstPaint Screenshots TS: " + first_paint_TS);
   console.log("FisrtPaint duration: " +  first_paint_duration);

   console.log("VisualComplete Screenshots TS: " + visual_complete_TS);
   console.log("VisualComplete duration: " +  visual_complete_duration);

   process.send( {imgDiff: 'complete', fpd: first_paint_duration, vcd: visual_complete_duration} );
  });
});
