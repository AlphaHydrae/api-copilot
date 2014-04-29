var _ = require('underscore'),
    colors = require('colors'),
    merge = require('deepmerge'),
    q = require('q'),
    slice = Array.prototype.slice;

var handlers = require('./handlers');

module.exports = function(deps) {

  deps = deps || {};
  var Listing = deps.Listing || require('./cli.listing')(),
      Selector = deps.Selector || require('./cli.selector')();

  function Info(options) {
    this.options = options;
    this.listing = new Listing(options);
    _.bindAll(this, 'showScenarioInfo');
  }

  _.extend(Info.prototype, {

    execute: function(scenario) {

      var scenarios = this.listing.find(),
          selector = new Selector(scenarios, this.options);

      return selector.select(scenario).then(this.showScenarioInfo);
    },

    showScenarioInfo: function(scenario) {

      console.log();
      console.log(scenario.name.bold);

      console.log();
      console.log('Base configuration:');
      console.log(indent(prettyJson(scenario.baseOptions)));

      console.log();
      console.log('Current configuration:');
      console.log(indent(prettyJson(merge(scenario.baseOptions, this.options))));

      console.log();
      if (scenario.steps.length) {
        console.log('Steps (' + scenario.steps.length + '):');
        console.log();
        _.each(scenario.steps, function(step, i) {
          console.log('  ' + (i + 1) + '. ' + step.name);
        });
      } else {
        console.log('Steps: none');
      }

      console.log();

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
