var _ = require('underscore'),
    colors = require('colors'),
    path = require('path'),
    slice = Array.prototype.slice;

module.exports = function(finder, listing, print) {

  return function(options) {
    return finder(options).then(function(scenarios) {
      return displayListing(scenarios, options);
    });
  };

  function displayListing(scenarios, options) {

    var scenarioListing = listing(scenarios, options);

    print();
    print(scenarioListing);

    if (scenarios.length) {
      print();
      print('Use `' + 'api-copilot info [scenario]'.underline + '` for more information about a scenario.');
      print('Use `' + 'api-copilot run [scenario]'.underline + '` to run a scenario.');
      print('[scenario] may be either the number, path or name of the scenario.');
      print();
    }
  }
};

module.exports['@require'] = [ 'scenario.finder', 'scenario.listing', 'cli.print' ];
