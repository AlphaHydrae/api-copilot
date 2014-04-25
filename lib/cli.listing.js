var _ = require('underscore'),
    slice = Array.prototype.slice;

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

  Listing.handler = function() {
    return function(options) {
      var listing = new Listing(options);
      listing.execute.apply(listing, slice.call(arguments, 1));
    };
  };

  return Listing;
};
