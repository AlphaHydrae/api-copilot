var _ = require('underscore'),
    colors = require('colors'),
    path = require('path'),
    slice = Array.prototype.slice;

var handlers = require('./handlers');

module.exports = function(deps) {

  deps = deps || {};
  var glob = deps.glob || require('glob');

  function Listing(options) {
    // TODO: require source option
    this.source = options.source;
  }

  _.extend(Listing.prototype, {

    find: function() {

      var scenarios = glob.sync(path.join(this.source, '**', '*.scenario.js')).sort();

      return _.map(scenarios, function(file, i) {
        return {
          file: file,
          name: path.basename(file).replace(/\.scenario\.js$/, '')
        };
      }, this);
    },

    display: function(scenarios) {

      console.log();
      console.log('Source directory: ' + path.resolve(this.source));
      console.log('  (use the `-s, --source <dir>` option to list API scenarios from another directory)');

      console.log();
      if (!scenarios.length) {
        console.log('Available API scenarios: none'.yellow);
        console.log();
        return;
      }

      var longestFilename = _.reduce(scenarios, function(memo, scenario) {
        return scenario.file.length > memo ? scenario.file.length : memo;
      }, 0);

      var known = {};

      console.log('Available API scenarios (' + scenarios.length + '):');
      _.each(scenarios, function(scenario, i) {
        var name = scenario.name;
        console.log((i + 1) + ') ' + pad(scenario.file, longestFilename + 3, ' ') + (known[name] ? '' : '(' + name + ')'));
        known[name] = 1;
      });
    },

    execute: function() {

      var scenarios = this.find();

      this.display(scenarios);

      if (scenarios.length) {
        console.log();
        console.log('Run `api-copilot info [scenario]` for more information about a scenario.');
        console.log('[scenario] may be either the number, path or name of the scenario.');
        console.log();
      }
    }
  });

  handlers.makeHandler(Listing);

  return Listing;
};

function pad(string, width, padding) {
  return string.length >= width ? string : pad(string + padding, width, padding);
}
