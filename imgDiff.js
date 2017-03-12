const Jimp = require("jimp"),
      fs = require("fs"),
      path = require("path"),
      wait = require('wait-promise');

var folder_path = '',
    cont = false,
    jmap_files = [],
    selected_pic = '',
    image_files = [];

function isPNG(file) {
    return path.extname(file) === '.png';
}

process.on('message', (m) => {
    console.log('imgDiff got message from Parent clip Process:', m);
    if (m.bucket !== '') {
      folder_path = m.bucket;
      cont = true;
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
    let baseImg = images.pop();
    images.forEach( function(img, index) {
      img_diff_perc = Jimp.diff(baseImg, img).percent;
      //console.log(img_diff_perc);
      if (img_diff_perc * 10000 <= 1.0) {
       selected_pic = image_files[index];
      }
    });
    // last screenshots is picked
    if (selected_pic === '') {
      selected_pic = image_files[image_files.length - 1];
    }

   console.log("Selected Screenshots TS: " + selected_pic.substr(0, selected_pic.lastIndexOf('.')));
   process.send( {imgDiff: 'complete'} );
  });
});
