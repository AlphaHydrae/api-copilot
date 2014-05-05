var _ = require('underscore'),
    q = require('q'),
    path = require('path'),
    slice = Array.prototype.slice;

var handlers = require('./handlers');

module.exports = function(deps) {

  deps = deps || {};
  var Logger = deps.Logger || require('./cli.logger')(),
      cliSelector = deps.cliSelector || require('./cli.selector')();

  function Runner(options) {
    this.options = options;
    _.bindAll(this, 'runScenario');
  }

  _.extend(Runner.prototype, {

    execute: function(choice) {
      return cliSelector(choice, this.options).then(this.runScenario);
    },

    runScenario: function(scenario) {
      if (scenario) {
        new Logger(scenario);
        return scenario.run(this.options);
      }
    }
  });

  handlers.makeHandler(Runner);

  return Runner;
};
