var _ = require('underscore'),
    slice = Array.prototype.slice;

var handlers = require('./handlers');

module.exports = function(deps) {

  deps = deps || {};

  function Listing(options) {
    this.options = options;
  }

  _.extend(Listing.prototype, {

    execute: function() {
      console.log('listing not yet implemented');
    }
  });

  handlers.makeHandler(Listing);

  return Listing;
};
