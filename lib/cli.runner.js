var _ = require('underscore'),
    q = require('q'),
    path = require('path'),
    slice = Array.prototype.slice;

module.exports = function(cliSelector, CliLogger) {

  return function(choice, options) {
    return cliSelector(choice, options).then(function(scenario) {
      return runScenario(scenario, options);
    });
  };

  function runScenario(scenario, options) {
    if (scenario) {
      new CliLogger(scenario);
      return scenario.run(options);
    }
  }
};

module.exports['@require'] = [ 'cli.selector', 'cli.logger' ];
