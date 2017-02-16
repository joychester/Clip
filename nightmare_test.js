const Nightmare = require('nightmare'),
      config = require('config'),
      vo = require('vo'),
      moment = require('moment'),
      cp = require('child_process');

var testConfig = config.get('Test');

var url = testConfig.get('URL');

const RENDER_TIME_MS = 250;


vo(run)(function(err, result) {
  if (err) throw err;
});

function *run() {

  var nightmare = Nightmare({ width: testConfig.get('Nightmare.width'),
      height: testConfig.get('Nightmare.height'),
      waitTimeout: testConfig.get('Nightmare.testDuration'),
      openDevTools: testConfig.get('Nightmare.openDevTools'),
      show: testConfig.get('Nightmare.showBrowser'),
      switches: {
        'ignore-certificate-errors': true
      }});

  console.log('Start the Test: ' + Date.now());

  yield nightmare
    //load landing page
    .wait(RENDER_TIME_MS);

  // execute nodejs code
  console.log("Start to clip: " + Date.now());
  const t = cp.fork(`${__dirname}/clip_sync.js`);

  yield nightmare
    .goto(url)
    .wait(1000);

  t.send({clip: 'stop'});

  yield nightmare
    .wait(RENDER_TIME_MS)
    .end()

  console.log("end of the test: " + Date.now());
}
