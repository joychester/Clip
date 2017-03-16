const cheerio = require('cheerio'),
      fs = require('fs'),
      wait = require('wait-promise');

var folder_path = '',
    cont = false,
    visual_complete_duration = 0;

process.on('message', (m) => {
    console.log('transSVG got message from Parent clip Process:', m);
    if (m.bucket !== '') {
      folder_path = m.bucket;
      cont = true;
      visual_complete_duration = m.vcd;
    }
});

var promise = wait.until(function(){
    return cont;
});

promise.then( function() {
  console.log('load har file and perfCascade HTML template');
  let buf_html = fs.readFileSync('./svgTemplate.html');
  let buf_har = fs.readFileSync(folder_path + 'result.har');

  // redundant transfer??
  let har_source = JSON.parse(buf_har);
  let json_text = JSON.stringify(har_source);
  // add visualComplete custom metric on HAR file, read by perfCascade
  let updated_har = json_text.replace(/\"pageTimings\":{/, `"pageTimings":{"_visualComplete":${visual_complete_duration},`);

  let html_source = buf_html.toString();
  let $ = cheerio.load(html_source);

  $('script#harFilePlaceHolder').text('var jsonData = ' + updated_har);

  //replace current HTML file
  fs.writeFileSync(folder_path + 'harView.html', $.html());
  process.send({ transSVG: 'complete' });
});
