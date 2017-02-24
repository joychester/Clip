const Nightmare = require('nightmare'),
      config = require('config'),
      vo = require('vo'),
      moment = require('moment'),
      cp = require('child_process'),
      harPlugin = require('nightmare-har-plugin'),
      fs = require('fs'),
      jsonQuery = require('json-query');

harPlugin.install(Nightmare);

var testConfig = config.get('Test');

var url = testConfig.get('URL');

const RENDER_TIME_MS = 250;

vo(run)(function(err, result) {
  if (err) throw err;
});

function *run() {

  var nightmare = Nightmare(Object.assign(harPlugin.getDevtoolsOptions(),
      { width: testConfig.get('Nightmare.width'),
        height: testConfig.get('Nightmare.height'),
        waitTimeout: testConfig.get('Nightmare.testDuration'),
        openDevTools: testConfig.get('Nightmare.openDevTools'),
        show: testConfig.get('Nightmare.showBrowser'),
        switches: {
          'ignore-certificate-errors': true
        }
      }));

  console.log('Start the Test: ' + Date.now());

  yield nightmare
    //load landing page
    .waitForDevtools()
    .wait(RENDER_TIME_MS);

  // execute nodejs code
  console.log("Start to clip: " + Date.now());
  const t = cp.fork(`${__dirname}/clip.js`);

  yield nightmare
    .goto(url)
    .wait(1000);

  t.send({clip: 'stop'});

  yield nightmare
      .wait(RENDER_TIME_MS)
      /* Option1: By navigation and resource timing API
      .evaluate( function() {
        var timings_obj = {};
        let resourcesArray = window.performance.getEntries();
        let nav_start = window.performance.timing.navigationStart;

        for (var r of resourcesArray ) {
          let resource_loadtime = (nav_start + r.responseEnd).toFixed(0);
          let resource_name = r.name;

          timings_obj[resource_loadtime] = resource_name;
        }
        return timings_obj;
      })*/
      // Option2: save the Har file from Chrome devtools
      .getHAR()
      .end()
      .then( function(result) {
          console.log("end of the test: " + Date.now());
          // will write HAR file into local file and visualize it by PerfCascade(?)
          fs.writeFileSync('sample.har', JSON.stringify(result));

          // parse har file to grab url info and perf timings
          let a_url = jsonQuery('entries[**][request][url]', {data: result}).value;
          let a_startTime = jsonQuery('entries[**][startedDateTime]', {data: result}).value;
          let a_duration = jsonQuery('entries[**][time]', {data: result}).value;

          let a_endTime = [];
          a_startTime.forEach( function (elem, ind) {
            a_endTime.push(Date.parse(elem) + parseInt(a_duration[ind].toFixed(0)));
          });

          let resource_obj = {};

          a_url.forEach( function(u, ind) {
            resource_obj[a_endTime[ind]] = u;
          });
          // {"1487865242937":"resource1","1487865243011":"resource2","1487865243030":"resource3"}
          // console.log('timings_obj:' + JSON.stringify(resource_obj));
      });
}
