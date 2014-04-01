var _ = require('underscore'),
    slice = Array.prototype.slice;

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

    var keys = slice.call(arguments);
    if (!keys.length) {
      delete this.defaultRequestOptions;
    } else {
      _.each(keys, function(key) {
        delete this.defaultRequestOptions[key];
      }, this);
    }
  },

  addRequestFilter: function(name, filter) {

    var data = {};
    if (typeof(name) == 'function') {
      data = { filter: name };
    } else {
      this.removeRequestFilters(name);
      data = { name: name, filter: filter };
    }

    this.requestFilters.push(data);
  },

  removeRequestFilters: function() {

    var toRemove = slice.call(arguments);
    if (!toRemove.length) {
      this.requestFilters = [];
    }

    var namesToRemove = _.filter(toRemove, function(value) {
      return _.isString(value);
    }), functionsToRemove = _.filter(toRemove, function(value) {
      return _.isFunction(value);
    });

    this.requestFilters = _.reject(this.requestFilters, function(filter) {
      return _.contains(namesToRemove, filter.name) || _.contains(functionsToRemove, filter.filter);
    });
  },

  request: function(options) {

    options = _.extend({}, this.defaultRequestOptions, options);

    if (this.requestFilters.length) {
      options.filters = _.pluck(this.requestFilters, 'filter');
    }

    return this.client.request.apply(this.client, [ options ].concat(slice.call(arguments, 1)));
  }
};

_.each([ 'get', 'head', 'post', 'put', 'patch', 'delete' ], function(method) {

  module.exports[method] = function(options) {
    options = _.extend({}, options, { method: method.toUpperCase() });
    return this.request.apply(this, [ options ].concat(slice.call(arguments, 1)));
  };
});
