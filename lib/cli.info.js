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
      fs = deps.fs || require('fs'),
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
      print('API COPILOT SCENARIO'.bold);
      if (scenario.summary) {
        print();
        print(scenario.summary.replace(/^/gm, '  ').bold);
      }
      print();
      print('  Name: ' + scenario.name);
      print('  File: ' + path.resolve(scenario.file));

      print();
      if (scenario.parameters.length) {
        print(('PARAMETERS (' + scenario.parameters.length + ')').bold);
        _.each(scenario.parameters, function(parameter) {
          print();
          print(parameter.describe().replace(/^/gm, '  '));
          parameter.emit('describe', function(text) {
            print(_.isString(text) ? text.replace(/^/gm, '    ') : text);
          });
        });
      } else {
        print('PARAMETERS'.bold);
        print('  None');
      }

      print();
      print('BASE CONFIGURATION'.bold);
      print();
      print('  Options given to the scenario object:');
      print(indent(prettyJson(scenario.baseOptions), 4));

      print();
      print('EFFECTIVE CONFIGURATION'.bold);
      if (this.options.config) {
        print();
        if (fs.existsSync(this.options.config)) {
          print('  Configuration file: ' + path.resolve(this.options.config));
        } else {
          print('  No configuration file loaded (search path ' + path.resolve(this.options.config) + ')');
        }
      }
      print();
      print(indent(prettyJson(merge(scenario.baseOptions, this.options))));

      print();
      if (scenario.steps.length) {
        print(('STEPS (' + scenario.steps.length + ')').bold);
        print();
        _.each(scenario.steps, function(step, i) {
          print('  ' + (i + 1) + '. ' + step.name);
        });
      } else {
        print('STEPS'.bold);
        print('  None');
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
