var _ = require('underscore'),
    colors = require('colors'),
    path = require('path'),
    slice = Array.prototype.slice;

var handlers = require('./handlers');

module.exports = function(deps) {

  deps = deps || {};
  var finder = deps.finder || require('./scenario.finder')(),
      print = deps.print || console.log;

  function Listing(options) {
    // TODO: require source option
    this.options = options;
    _.bindAll(this, 'display', 'displayInfoNotice');
  }

  _.extend(Listing.prototype, {

    execute: function() {
      return finder(this.options).then(this.display).then(this.displayInfoNotice);
    },

    // TODO: extract this into a separate module
    display: function(scenarios) {

      print();
      print('Source directory: ' + path.resolve(this.options.source));
      print('  (use the `-s, --source <dir>` option to list API scenarios from another directory)');

      print();
      if (!scenarios.length) {
        print('Available API scenarios: none'.yellow);
        print();
        return scenarios;
      }

      var longestFilename = _.reduce(scenarios, function(memo, scenario) {
        return scenario.file.length > memo ? scenario.file.length : memo;
      }, 0);

      var known = {};

      print(('Available API scenarios (' + scenarios.length + '):').bold);
      _.each(scenarios, function(scenario, i) {
        var name = scenario.name;
        print((i + 1) + ') ' + pad(scenario.file, longestFilename + 3, ' ') + (known[name] ? '' : '(' + name + ')'));
        known[name] = 1;
      });

      return scenarios;
    },

    displayInfoNotice: function(scenarios) {
      if (scenarios.length) {
        print();
        print('Use `' + 'api-copilot info [scenario]'.underline + '` for more information about a scenario.');
        print('Use `' + 'api-copilot run [scenario]'.underline + '` to run a scenario.');
        print('[scenario] may be either the number, path or name of the scenario.');
        print();
      }
    }
  });

  handlers.makeHandler(Listing);

  return Listing;
};

function pad(string, width, padding) {
  return string.length >= width ? string : pad(string + padding, width, padding);
}
