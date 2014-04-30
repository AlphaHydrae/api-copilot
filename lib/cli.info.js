var _ = require('underscore'),
    colors = require('colors'),
    merge = require('deepmerge'),
    path = require('path'),
    q = require('q'),
    slice = Array.prototype.slice;

var handlers = require('./handlers');

module.exports = function(deps) {

  deps = deps || {};
  var finder = deps.finder || require('./scenario.finder')(),
      print = deps.print || console.log,
      selector = deps.selector || require('./cli.selector')();

  function Info(options) {
    this.options = options;
    _.bindAll(this, 'showScenarioInfo');
  }

  _.extend(Info.prototype, {

    execute: function(choice) {
      return finder(this.options).then(_.bind(this.selectScenario, this, choice)).then(this.showScenarioInfo);
    },

    selectScenario: function(choice, scenarios) {
      return selector(scenarios, choice, this.options);
    },

    showScenarioInfo: function(scenario) {
      if (!scenario) {
        return;
      }

      print();
      print(scenario.name.bold);
      print(path.resolve(scenario.file));

      print();
      print('Base configuration of scenario object:');
      print(indent(prettyJson(scenario.baseOptions)));

      print();
      print('Effective configuration including file and command line options:');
      print(indent(prettyJson(merge(scenario.baseOptions, this.options))));

      print();
      if (scenario.steps.length) {
        print('Steps (' + scenario.steps.length + '):');
        print();
        _.each(scenario.steps, function(step, i) {
          print('  ' + (i + 1) + '. ' + step.name);
        });
      } else {
        print('Steps: none');
      }

      print();

      scenario.emit('scenario:info');

      return scenario;
    }
  });

  function indent(text, indentation) {
    var indentText = new Array((indentation || 2) + 1).join(' ');
    return text.replace(/^/mg, indentText);
  }

  function prettyJson(object) {
    return JSON.stringify(object, undefined, 2);
  }

  handlers.makeHandler(Info);

  return Info;
};
