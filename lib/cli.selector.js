var _ = require('underscore'),
    ioc = require('electrolyte'),
    q = require('q'),
    path = require('path');

ioc.loader(ioc.node(__dirname));

module.exports = function(deps) {

  deps = deps || {};
  var readline = deps.readline || require('readline'),
      print = deps.print || console.log,
      scenarioLoader = deps.scenarioLoader || require('./scenario.loader'),
      scenarioListing = deps.scenarioListing || ioc.create('scenario.listing');

  // TODO: refactor as function
  function ScenarioSelector(scenarios, options) {
    this.scenarios = scenarios;
    this.options = options;
    _.bindAll(this, 'findScenario', 'validateAndLoad');
  }

  _.extend(ScenarioSelector.prototype, {

    select: function(choice) {
      return q.fcall(this.findScenario, choice);
    },

    findScenario: function(choice) {

      var scenarios = this.scenarios,
          options = this.options;

      if (!scenarios.length) {
        this.printListing(scenarios, options);
        return q();
      }

      if (scenarios.length == 1 && !choice) {
        return this.loadScenario(scenarios[0].file);
      }

      if (choice) {
        return q.fcall(this.validateAndLoad, scenarios, choice, true);
      }

      this.printListing(scenarios, options);

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

    printListing: function(scenarios, options) {
      print();
      print(scenarioListing(scenarios, options));
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
        this.printListing(scenarios, this.options);
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
