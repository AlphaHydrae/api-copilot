var _ = require('underscore'),
    fs = require('fs'),
    glob = require('glob'),
    log4js = require('log4js'),
    path = require('path'),
    pkg = require('../package'),
    program = require('commander'),
    readline = require('readline');

function runCopilot() {

  program
    .version(pkg.version)
    .option('-l, --log [level]', 'Log level (trace, debug, info; info by default)', 'info')
    .option('-s, --source [dir]', 'Directory where API scenarios are located ("api" by default)', 'api')
    .option('-u, --base-url [url]', 'Override the base URL of the scenario')
    .option('-t, --show-time', 'Print the date and time with each log')
    .option('-q, --show-request', 'Print options for each HTTP request (only with debug or trace log level)')
    .option('-b, --show-response-body', 'Print response body for each HTTP request (only with debug or trace log level)')
    .parse(process.argv);

  configureLogger(program);

  var dir = path.join(process.cwd(), program.source);

  var scenarios = glob.sync(dir + '/**/*.scenario.js');

  if (!scenarios.length) {
    return console.warn('No API scenario found in ' + dir);
  }

  var scenario = _.first(scenarios);

  if (scenarios.length == 1) {
    runScenario(scenario);
    return;
  }

  console.log();
  console.log('Available API scenarios:');
  _.each(scenarios, function(file, index) {
    console.log((index + 1) + ') ' + path.relative(dir, file));
  });

  console.log();

  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("Type the number of the scenario you want to run: ", function(answer) {
    rl.close();

    if (!answer.match(/^\d+$/)) {
      return console.warn('You must enter a scenario number');
    }

    var n = parseInt(answer, 10),
        scenario = scenarios[n - 1];

    if (!scenario) {
      return console.warn('No scenario ' + n);
    }

    runScenario(scenario);
  });
};

function runScenario(file) {
  require(file).run(_.pick(program, 'log', 'baseUrl', 'showTime', 'showRequest', 'showResponseBody'));
};

function configureLogger() {

  var logPattern = '';

  if (program.showTime) {
    logPattern += '%[[%d]%] ';
  }

  logPattern += '%m';

  log4js.configure({
    appenders: [
      {
        type: 'console',
        layout: {
          type: 'pattern',
          pattern: logPattern,
          tokens: {
            lvl: function(event) {
              return event.level.toString().toLowerCase();
            }
          }
        }
      }
    ]
  });
};

module.exports = runCopilot;
