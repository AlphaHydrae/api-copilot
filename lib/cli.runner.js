var _ = require('underscore'),
    q = require('q'),
    path = require('path'),
    slice = Array.prototype.slice;

module.exports = function(deps) {

  deps = deps || {};
  var Logger = deps.Logger || require('./cli.logger')(),
      cliSelector = deps.cliSelector || require('./cli.selector')();

  return function(choice, options) {
    return cliSelector(choice, options).then(function(scenario) {
      return runScenario(scenario, options);
    });
  };

  function runScenario(scenario, options) {
    if (scenario) {
      new Logger(scenario);
      return scenario.run(options);
    }
  }
};
