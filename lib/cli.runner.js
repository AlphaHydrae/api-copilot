var _ = require('underscore'),
    q = require('q'),
    path = require('path'),
    slice = Array.prototype.slice;

var handlers = require('./handlers');

module.exports = function(deps) {

  deps = deps || {};
  var finder = deps.finder || require('./scenario.finder')(),
      Logger = deps.Logger || require('./cli.logger')(),
      selector = deps.selector || require('./cli.selector')();

  function Runner(options) {
    this.options = options;
    _.bindAll(this, 'runScenario');
  }

  _.extend(Runner.prototype, {

    execute: function(choice) {
      return finder(this.options).then(_.bind(this.selectScenario, this, choice)).then(this.runScenario);
    },

    selectScenario: function(choice, scenarios) {
      return selector(scenarios, choice, this.options);
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
