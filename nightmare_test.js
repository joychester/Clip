const Nightmare = require('nightmare'),
      config = require('config'),
      vo = require('vo'),
      moment = require('moment'),
      cp = require('child_process'),
      harPlugin = require('nightmare-har-plugin');

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
      .getHAR()
      /*.evaluate( function() {
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
      .end()
      .then( function(result) {
          console.log("end of the test: " + Date.now());
          // will write HAR file into local file and visualize it by PerfCascade(?)
          console.log("resources are:" + JSON.stringify(result));
      });
}
