var _ = require('underscore'),
    fs = require('fs'),
    glob = require('glob'),
    log4js = require('log4js'),
    path = require('path'),
    readline = require('readline'),
    slice = Array.prototype.slice;

var handlers = require('./handlers');

module.exports = function(deps) {

  deps = deps || {};
  var Logger = deps.Logger || require('./cli.logger')();

  function Runner(options) {
    this.options = options;
  }

  _.extend(Runner.prototype, {

    execute: function(scenario) {

      var dir = path.resolve(process.cwd(), this.options.source);

      var scenarios = glob.sync(dir + '/**/*.scenario.js');

      if (!scenarios.length) {
        return console.warn('No API scenario found in ' + dir);
      }

      if (scenarios.length == 1) {
        return this.runScenario(_.first(scenarios));
      }

      if (scenario) {

        if (scenario.match(/\.scenario\.js$/) && fs.existsSync(scenario)) {
          return this.runScenario(path.resolve(scenario));
        }

        scenario = path.resolve(dir, scenario + '.scenario.js');
        if (fs.existsSync(scenario)) {
          return this.runScenario(scenario);
        }

        return console.warn('No such API scenario ' + scenario);
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

      rl.question("Type the number of the scenario you want to run: ", _.bind(this.runSelectedScenario, this, scenarios, rl));
    },

    runSelectedScenario: function(scenarios, rl, choice) {
      rl.close();

      if (!choice.match(/^\d+$/)) {
        return console.warn('You must enter a scenario number');
      }

      var n = parseInt(choice, 10),
          scenario = scenarios[n - 1];

      if (!scenario) {
        return console.warn('No scenario ' + n);
      }

      this.runScenario(scenario);
    },

    runScenario: function(file) {

      var scenario = require(file);
      if (!(scenario instanceof require('./index').Scenario)) {
        throw new Error(file + ' does not export a valid API scenario');
      }

      new Logger(scenario);
      
      scenario.run(this.options).fail(function() {
        // FIXME: move this to cli function
        process.exit(2);
      });
    }
  });

  handlers.makeHandler(Runner);

  return Runner;
};
