var _ = require('underscore'),
    fs = require('fs'),
    glob = require('glob'),
    path = require('path'),
    pkg = require('../package'),
    program = require('commander'),
    readline = require('readline');

module.exports = function() {

  program
    .version(pkg.version)
    .option('-s, --source [dir]', 'Directory where API scenarios are located ("api" by default)', 'api')
    .parse(process.argv);

  var dir = path.join(process.cwd(), program.source);

  var scenarios = glob.sync(dir + '/**/*.scenario.js');

  if (!scenarios.length) {
    return console.warn('No API scenario found in ' + dir);
  }

  var scenario = _.first(scenarios);

  if (scenarios.length == 1) {
    require(scenario);
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

    require(scenario);
  });
};
