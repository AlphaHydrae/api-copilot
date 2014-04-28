var _ = require('underscore'),
    q = require('q'),
    path = require('path'),
    slice = Array.prototype.slice;

var handlers = require('./handlers');

module.exports = function(deps) {

  deps = deps || {};
  var readline = deps.readline || require('readline'),
      scenarioLoader = deps.scenarioLoader || require('./scenario.loader'),
      Listing = deps.Listing || require('./cli.listing')(),
      Logger = deps.Logger || require('./cli.logger')();

  function Runner(options) {
    this.options = options;
    this.listing = new Listing(options);
  }

  _.extend(Runner.prototype, {

    execute: function(scenario) {

      var scenarios = this.listing.find();
      if (!scenarios.length) {
        this.listing.display(scenarios);
        return q();
      }

      if (scenarios.length == 1 && !scenario) {
        return this.runScenario(path.resolve(_.first(scenarios).file));
      }

      if (scenario) {

        var result = this.validateAndRunScenario(scenarios, scenario);
        if (!result) {
          this.listing.display(scenarios);
          return this.scenarioNotFound(scenario);
        }

        return result;
      }

      this.listing.display(scenarios);

      var deferred = q.defer(),
          rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });

      console.log();
      rl.question("Type the number of the scenario you want to run: ", _.bind(this.runSelectedScenario, this, scenarios, rl, deferred));

      return deferred.promise;
    },

    runSelectedScenario: function(scenarios, rl, deferred, choice) {
      rl.close();

      var promise = this.validateAndRunScenario(scenarios, choice) || this.scenarioNotFound(choice);
      promise.then(_.bind(deferred.resolve, deferred), _.bind(deferred.reject, deferred));
    },

    scenarioNotFound: function(scenario) {

      var err = new Error('No such scenario "' + scenario + '"');

      console.log();
      console.warn(err.message.yellow);
      console.log();

      return q.reject(err);
    },

    validateAndRunScenario: function(scenarios, choice) {

      var scenario = _.findWhere(scenarios, { file: choice }) || _.findWhere(scenarios, { name: choice });
      if (scenario) {
        return this.runScenario(scenario.file);
      }

      if (choice.match(/^\d+$/)) {

        var number = parseInt(choice, 10);
        if (number >= 1 && number <= scenarios.length) {
          return this.runScenario(scenarios[number - 1].file);
        }
      }

      return false;
    },

    runScenario: function(file) {

      var scenario = scenarioLoader(path.resolve(file));

      new Logger(scenario);
      
      return scenario.run(this.options);
    }
  });

  handlers.makeHandler(Runner);

  return Runner;
};
