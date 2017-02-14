
const Nightmare = require('nightmare'),
      vo = require('vo'),
      moment = require('moment'),
      cp = require('child_process');


var url = "https://www.bing.com/";

const RENDER_TIME_MS = 2000;


vo(run)(function(err, result) {
  if (err) throw err;
});

function *run() {
  // To set full screen on MacOS
  var nightmare = Nightmare({width: 1400, height: 1080, waitTimeout: 15000, openDevTools: false, show: true,
      switches: {
        'ignore-certificate-errors': true
      }});

  console.log('Start the Test: ' + Date.now());

  yield nightmare
    //load landing page
    .wait(200);

  // execute nodejs code
  console.log("Start to clip: " + Date.now());
  const t = cp.fork(`${__dirname}/clip.js`);

  yield nightmare
    .goto(url)
    .wait(1000);

  t.send({clip: 'stop'});

  yield nightmare
    .wait(250)
    .end()


  console.log("end of the test: " + Date.now());
}
