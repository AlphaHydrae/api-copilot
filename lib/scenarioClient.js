var _ = require('underscore');

module.exports = {

  setDefaultRequestOptions: function(options) {
    this.defaultRequestOptions = options;
  },

  extendDefaultRequestOptions: function(options) {

    var newDefaultRequestOptions = _.extend({}, this.defaultRequestOptions, options);
    this.defaultRequestOptions = _.reduce(newDefaultRequestOptions, function(memo, value, key) {

      if (typeof(value) != 'undefined') {
        memo[key] = value;
      }

      return memo;
    }, {});
  },

  clearDefaultRequestOptions: function() {

    var keys = Array.prototype.slice.call(arguments);
    if (!keys.length) {
      delete this.defaultRequestOptions;
    } else {
      _.each(keys, function(key) {
        delete this.defaultRequestOptions[key];
      }, this);
    }
  },

  addRequestFilter: function(name, filter) {
    this.removeRequestFilters(name);
    this.requestFilters.push({ name: name, filter: filter });
  },

  removeRequestFilters: function() {

    var names = Array.prototype.slice.call(arguments);
    if (!names.length) {
      this.requestFilters = [];
    }

    this.requestFilters = _.reject(this.requestFilters, function(filter) {
      return _.contains(names, filter.name);
    });
  },

  request: function(options) {

    options = _.extend({}, this.defaultRequestOptions, options);
    options.filters = _.pluck(this.requestFilters, 'filter');

    return this.client.request.apply(this.client, [ options ].concat(Array.prototype.slice.call(arguments, 1)));
  }
};

_.each([ 'get', 'head', 'post', 'put', 'patch', 'delete' ], function(method) {

  module.exports[method] = function(options) {
    options = _.extend({}, options, { method: method.toUpperCase() });
    return this.request.apply(this, [ options ].concat(Array.prototype.slice.call(arguments, 1)));
  };
});
