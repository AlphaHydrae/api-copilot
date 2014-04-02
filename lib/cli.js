var _ = require('underscore'),
    glob = require('glob'),
    log4js = require('log4js'),
    path = require('path'),
    readline = require('readline');

var pkg = require('../package'),
    Command = require('./cli.command').inject(),
    Logger = require('./cli.logger').inject();

function runCopilot(argv) {

  var command = new Command();

  var result = command.parse(argv || process.argv),
      options = result.options;

  configureLogger(options);

  var dir = path.resolve(process.cwd(), options.source);

  var scenarios = glob.sync(dir + '/**/*.scenario.js');

  if (!scenarios.length) {
    return console.warn('No API scenario found in ' + dir);
  }

  var scenario = _.first(scenarios);

  if (scenarios.length == 1) {
    runScenario(scenario, options);
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

    runScenario(scenario, options);
  });
}

function runScenario(file, options) {

  var scenario = require(file);
  new Logger(scenario);
  
  scenario.run(options).fail(function() {
    process.exit(2);
  });
}

function configureLogger(options) {

  var logPattern = '';

  if (options.showTime) {
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
}

module.exports = runCopilot;
