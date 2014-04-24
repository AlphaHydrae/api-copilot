// # Scenario Client Extensions
// [Scenario](scenario.js.html) methods to make HTTP calls and manage request options.
//
// **Related components:**
//
// * [client.js](client.js.html) - the client that performs the HTTP requests;
// * [scenario.js](scenario.js.html) - API scenario where the client can be used.

// ## Dependencies
// The following external libraries are used:
//
// * [underscore](http://underscorejs.org) for functional utilities.
var _ = require('underscore'),
    merge = require('deepmerge'),
    slice = Array.prototype.slice;

// ## Exports
// This module exports an object with methods, to be used to extend the scenario prototype.
module.exports = {

  // ## Methods

  // <a name="method-request"></a>
  // ### #request(options)
  // Starts an HTTP request and returns a promise that will be resolved with the HTTP response
  // or rejected if an error occurs. Return this promise in a scenario step and the HTTP
  // response will be available to the next step.
  //
  //     scenario.step('a step making an HTTP call', function() {
  //       return this.request({
  //         method: 'GET',
  //         url: 'http://example.com'
  //       });
  //     });
  //
  //     scenario.step('another step using the response', function(response) {
  //       console.log(response.body);
  //     });
  //
  // See [client.js](client.js.html) for available options.
  // This method has [aliases for common HTTP methods](#request%20aliases).
  request: function(options) {

    // Default request options can be configured to be added to all requests.
    // See [#setDefaultRequestOptions](#method-setDefaultRequestOptions).
    options = _.extend({}, this.defaultRequestOptions, options);

    // A base URL can be configured to be automatically preprended to all URLs.
    // See [scenario options](scenario.js.html#constructor).
    if (this.baseUrl) {
      options.url = options.url ? this.baseUrl + options.url : this.baseUrl;
    }

    // Request filter functions can be configured to modify the request options prior to the request.
    // See [#addRequestFilter](#method-addRequestFilter).
    if (this.requestFilters.length) {
      options.filters = _.pluck(this.requestFilters, 'filter');
    }

    return this.client.request(options);
  },

  // <a name="method-setDefaultRequestOptions"></a>
  // ### #setDefaultRequestOptions(options)
  // Sets the default request options to the specified options.
  // All further requests will use these options by default.
  //
  //     this.setDefaultRequestOptions({ json: true });
  setDefaultRequestOptions: function(options) {
    this.defaultRequestOptions = options;
  },

  // <a name="method-extendDefaultRequestOptions"></a>
  // ### #extendDefaultRequestOptions(options)
  // Extends the default request options with the specified additional options.
  //
  //     this.setDefaultRequestOptions({ json: true });
  //     this.extendDefaultRequestOptions({ headers: { 'Accept': 'application/json' } });
  //     // default options will be { json: true, headers: { 'Accept': 'application/json' } }
  extendDefaultRequestOptions: function(options) {

    var newDefaultRequestOptions = _.extend({}, this.defaultRequestOptions, options);
    this.defaultRequestOptions = _.reduce(newDefaultRequestOptions, function(memo, value, name) {

      // Set an option to undefined to clear it.
      if (value !== undefined) {
        memo[name] = value;
      }

      return memo;
    }, {});
  },

  // <a name="method-mergeDefaultRequestOptions"></a>
  // ### #mergeDefaultRequestOptions(options)
  // Deep-merges additional options into the default request options.
  // This is done with the [deepmerge](https://github.com/nrf110/deepmerge) library.
  //
  //     this.setDefaultRequestOptions({ headers: { 'Content-Type': 'application/json' });
  //     this.mergeDefaultRequestOptions({ headers: { 'Accept': 'application/json' } });
  //     // default options will be { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } }
  mergeDefaultRequestOptions: function(options) {
    this.defaultRequestOptions = merge(this.defaultRequestOptions, options);
  },

  // <a name="method-clearDefaultRequestOptions"></a>
  // ### #clearDefaultRequestOptions(names...)
  // Clears the default request options with the specified names.
  //
  //     this.clearDefaultRequestOptions('json', 'headers');
  clearDefaultRequestOptions: function() {

    var names = slice.call(arguments);

    // Call this method with no arguments to clear all options.
    if (!names.length) {
      delete this.defaultRequestOptions;
    } else {
      _.each(names, function(name) {
        delete this.defaultRequestOptions[name];
      }, this);
    }
  },

  // <a name="method-addRequestFilter"></a>
  // ### #addRequestFilter(name, filter)
  // Adds a filter function to process options before an HTTP request is started.
  // The filter function will be passed the complete request options and is expected
  // to return the processed options.
  //
  //     this.addRequestFilter('signature', function(options) {
  //       options.headers = { 'X-Signature': sha1(options.method + options.url) };
  //       return options;
  //     });
  addRequestFilter: function(name, filter) {

    var data = {};

    // Call this method with only a filter function to define an unnamed filter.
    //
    //     this.addRequestFilter(function(options) {
    //       options.url = options.url + '/suffix';
    //       return options;
    //     });
    if (typeof(name) == 'function') {
      data = { filter: name };

    } else {
      this.removeRequestFilters(name);
      data = { name: name, filter: filter };
    }

    this.requestFilters.push(data);
  },

  // <a name="method-removeRequestFilters"></a>
  // ### #removeRequestFilters(namesOrFunctions...)
  // Removes the specified request filters. Arguments should be either filter names
  // or filter functions.
  //
  //     this.removeRequestFilters('signature', 'otherFilter');
  //     this.removeRequestFilters(filterFunc);
  removeRequestFilters: function() {

    var toRemove = slice.call(arguments);

    // Call this method with no arguments to remove all filters.
    if (!toRemove.length) {
      this.requestFilters = [];
      return;
    }

    var namesToRemove = _.filter(toRemove, function(value) {
      return _.isString(value);
    }), functionsToRemove = _.filter(toRemove, function(value) {
      return _.isFunction(value);
    });

    this.requestFilters = _.reject(this.requestFilters, function(filter) {
      return _.contains(namesToRemove, filter.name) || _.contains(functionsToRemove, filter.filter);
    });
  }
};

// ## Request Aliases
// The `#get`, `#head`, `#post`, `#put`, `#patch` and `#delete` methods are aliases for
// [#request](#method-request) that automatically specify the HTTP method.
_.each([ 'get', 'head', 'post', 'put', 'patch', 'delete' ], function(method) {

  module.exports[method] = function(options) {
    return this.request(_.extend({}, options, { method: method.toUpperCase() }));
  };
});
