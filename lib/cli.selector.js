var _ = require('underscore'),
    q = require('q'),
    path = require('path');

module.exports = function(deps) {

  deps = deps || {};
  var readline = deps.readline || require('readline'),
      scenarioLoader = deps.scenarioLoader || require('./scenario.loader'),
      Listing = deps.Listing || require('./cli.listing')();

  function ScenarioSelector(scenarios, options) {
    this.scenarios = scenarios;
    this.listing = new Listing(options);
    _.bindAll(this, 'findScenario', 'validateAndLoad');
  }

  _.extend(ScenarioSelector.prototype, {

    select: function(choice) {
      return q.fcall(this.findScenario, choice);
    },

    findScenario: function(choice) {

      var scenarios = this.scenarios;
      if (!scenarios.length) {
        this.listing.display(scenarios);
        return q();
      }

      if (scenarios.length == 1 && !choice) {
        return this.loadScenario(scenarios[0].file);
      }

      if (choice) {
        return q.fcall(this.validateAndLoad, scenarios, choice).fail(_.bind(function(err) {
          this.listing.display(scenarios);
          return q.reject(err);
        }, this));
      }

      this.listing.display(scenarios);

      var deferred = q.defer(),
          // TODO: add auto-completer
          rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });

      console.log();
      rl.question("Type the number of the scenario you want to run: ", _.bind(this.loadSelected, this, scenarios, rl, deferred));

      return deferred.promise;
    },

    loadSelected: function(scenarios, rl, deferred, choice) {
      rl.close();

      // TODO: check if _.bind is required for deferred objects
      q.fcall(this.validateAndLoad, scenarios, choice).then(_.bind(deferred.resolve, deferred), _.bind(deferred.reject, deferred));
    },

    validateAndLoad: function(scenarios, choice) {
      choice = (choice || '').toString();

      var scenario = _.findWhere(scenarios, { file: choice }) || _.findWhere(scenarios, { name: choice });
      if (scenario) {
        return this.loadScenario(scenario.file);
      }

      if (choice.match(/^\d+$/)) {

        var number = parseInt(choice, 10);
        if (number >= 1 && number <= scenarios.length) {
          return this.loadScenario(scenarios[number - 1].file);
        }
      }

      throw new Error('No such scenario "' + choice + '"');
    },

    loadScenario: function(file) {
      return q.fcall(scenarioLoader, path.resolve(file));
    }
  });

  return function(scenarios, choice, options) {
    return q.fcall(function() {
      return new ScenarioSelector(scenarios, options).select(choice);
    });
  };
};
