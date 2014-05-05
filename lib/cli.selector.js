var _ = require('underscore'),
    q = require('q'),
    path = require('path');

module.exports = function(scenarioFinder, scenarioListing, scenarioLoader, readline, print) {

  return function(choice, options) {
    return scenarioFinder(options).then(_.bind(selectScenario, undefined, choice, options));
  };

  function selectScenario(choice, options, foundScenarios) {
    return q.fcall(findScenario, foundScenarios, choice, options);
  }

  function findScenario(scenarios, choice, options) {

    if (!scenarios.length) {
      printListing(scenarios, options);
      return q();
    }

    if (scenarios.length == 1 && !choice) {
      return loadScenario(scenarios[0].file);
    }

    if (choice) {
      return q.fcall(validateAndLoad, scenarios, choice, options, true);
    }

    printListing(scenarios, options);

    var names = _.pluck(scenarios, 'name');

    var deferred = q.defer(),
        rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          completer: _.bind(autoCompleter, undefined, names)
        });

    rl.question("\nType the number of the scenario you want to run: ", _.bind(loadSelected, undefined, scenarios, options, rl, deferred));

    return deferred.promise;
  }

  function loadSelected(scenarios, options, rl, deferred, answer) {
    rl.close();
    q.fcall(validateAndLoad, scenarios, answer, options, false).then(deferred.resolve, deferred.reject);
  }

  function validateAndLoad(scenarios, choice, options, displayListingOnError) {
    choice = (choice || '').toString();

    var scenario = _.findWhere(scenarios, { file: choice }) || _.findWhere(scenarios, { name: choice });
    if (scenario) {
      return loadScenario(scenario.file);
    }

    if (choice.match(/^\d+$/)) {

      var number = parseInt(choice, 10);
      if (number >= 1 && number <= scenarios.length) {
        return loadScenario(scenarios[number - 1].file);
      }
    }

    if (displayListingOnError) {
      printListing(scenarios, options);
    }

    throw new Error('No such scenario "' + choice + '"');
  }

  function loadScenario(file) {
    return q.fcall(scenarioLoader, path.resolve(file)).then(function(scenario) {
      return _.extend(scenario, { file: file });
    });
  }

  function autoCompleter(names, token) {
    return [
      _.filter(names, function(name) {
        return name.indexOf(token) === 0;
      }),
      token
    ];
  }

  function printListing(scenarios, options) {

    var listing = scenarioListing(scenarios, options);

    print();
    print(listing);
  }
};

module.exports['@require'] = [ 'scenario.finder', 'scenario.listing', 'scenario.loader', 'readline', 'cli.print' ];
