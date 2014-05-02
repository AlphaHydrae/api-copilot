var _ = require('underscore'),
    q = require('q'),
    path = require('path');

module.exports = function(deps) {

  deps = deps || {};
  var readline = deps.readline || require('readline'),
      scenarioLoader = deps.scenarioLoader || require('./scenario.loader'),
      Listing = deps.Listing || require('./cli.listing')();

  // TODO: refactor as function
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
        return q.fcall(this.validateAndLoad, scenarios, choice, true);
      }

      this.listing.display(scenarios);

      var names = _.pluck(scenarios, 'name');

      var deferred = q.defer(),
          rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            completer: _.bind(this.autoCompleter, this, names)
          });

      rl.question("\nType the number of the scenario you want to run: ", _.bind(this.loadSelected, this, scenarios, rl, deferred));

      return deferred.promise;
    },

    autoCompleter: function(names, token) {
      return [
        _.filter(names, function(name) {
          return name.indexOf(token) === 0;
        }),
        token
      ];
    },

    loadSelected: function(scenarios, rl, deferred, choice) {
      rl.close();
      q.fcall(this.validateAndLoad, scenarios, choice, false).then(deferred.resolve, deferred.reject);
    },

    validateAndLoad: function(scenarios, choice, displayListingOnError) {
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

      if (displayListingOnError) {
        this.listing.display(scenarios);
      }

      throw new Error('No such scenario "' + choice + '"');
    },

    loadScenario: function(file) {
      return q.fcall(scenarioLoader, path.resolve(file)).then(function(scenario) {
        return _.extend(scenario, { file: file });
      });
    }
  });

  return function(scenarios, choice, options) {
    return q.fcall(function() {
      return new ScenarioSelector(scenarios, options).select(choice);
    });
  };
};
