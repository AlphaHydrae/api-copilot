var _ = require('underscore'),
    colors = require('colors'),
    ioc = require('./ioc'),
    path = require('path'),
    slice = Array.prototype.slice;

var handlers = require('./handlers');

module.exports = function(deps) {

  deps = deps || {};
  var finder = deps.finder || ioc.create('scenario.finder'),
      listing = deps.listing || ioc.create('scenario.listing'),
      print = deps.print || console.log;

  function Listing(options) {
    // TODO: require source option
    this.options = options;
    _.bindAll(this, 'display');
  }

  _.extend(Listing.prototype, {

    execute: function() {
      return finder(this.options).then(this.display);
    },

    display: function(scenarios) {

      var scenarioListing = listing(scenarios, this.options);

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
  });

  handlers.makeHandler(Listing);

  return Listing;
};


