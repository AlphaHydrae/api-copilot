var _ = require('underscore'),
    colors = require('colors'),
    ioc = require('./ioc'),
    path = require('path'),
    slice = Array.prototype.slice;

module.exports = function(deps) {

  deps = deps || {};
  var finder = deps.finder || ioc.create('scenario.finder'),
      listing = deps.listing || ioc.create('scenario.listing'),
      print = deps.print || console.log;

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


