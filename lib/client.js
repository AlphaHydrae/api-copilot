// # Client
// Promise-based HTTP client around the [request](https://github.com/mikeal/request) library.

// ## Events
// A client is an [event emitter](http://nodejs.org/api/events.html).
// The following events can be emitted:
//
// * `request` - when an HTTP request is started;
// * `error` - if an HTTP request fails;
// * `response` - when an HTTP response is received.

// ## Dependencies
// The following external libraries are used:
//
// * [q](https://github.com/kriskowal/q) for promises;
// * [request](https://github.com/mikeal/request) to make HTTP requests;
// * [underscore](http://underscorejs.org) for functional utilities.
var _ = require('underscore'),
  events = require('events'),
  q = require('q'),
  util = require('util');

// ## Exports
// This module exports a function the can be used to inject mock dependencies.
// Call the function with no arguments to get the Client class with its real dependencies:
//
//     var clientInjector = require('./client');
//     var Client = clientInjector();
//
// To inject mock dependencies, pass an object with mocks:
//
//     var Client = clientInjector({
//       request: requestMock
//     });
//
// The following dependencies can be mocked:
//
// * `request` - the request library.
module.exports = function(deps) {

  deps = deps || {};
  var request = deps.request || require('request');

  // ## Constructor
  // Constructs a new HTTP client. No options are required.
  function Client() {
    this.requestNumber = 0;
    events.EventEmitter.call(this);
  }

  util.inherits(Client, events.EventEmitter);

  _.extend(Client.prototype, {

    // ## #request(options)
    // Starts an HTTP request and returns a promise that will be resolved with the HTTP response
    // or rejected if an error occurs.
    //
    //     var promise = this.get({
    //       method: 'GET',
    //       url: 'http://example.com'
    //     });
    //
    //     promise.then(function(response) {
    //       console.log('Server responded with: ' + response.body);
    //     }, function(err) {
    //       console.warn('An error occurred: ' + err);
    //     });
    //
    // Look at the [request library documentation](https://github.com/mikeal/request) for available options.
    //
    // **Additional options:**
    //
    // * `filters` - an array of filter functions; each function will be called with the request options
    // and is expected to return the processed options.
    //
    //     function signatureFilter(options) {
    //       options.headers = {
    //         'X-Signature': sha1(options.method + options.url)
    //       };
    //       return options;
    //     }
    //
    //     this.request({
    //       method: 'GET',
    //       url: 'http://example.com',
    //       filters: [ signatureFilter ]
    //     });
    // * `handler` - a function that is passed the request object before the
    // HTTP request starts; this supports [forms from the request library](https://github.com/mikeal/request#forms).
    //
    //     function uploadFile(request) {
    //       var form = request.form();
    //       form.append('file', fs.createReadStream(file));
    //     }
    //
    //     this.request({
    //       method: 'GET',
    //       url: 'http://example.com',
    //       handler: uploadFile
    //     });
    request: function(options) {
      options = options || {};

      if (!_.isObject(options)) {
        throw new Error('Request options must be an object');
      } else if (options.handler !== undefined && typeof(options.handler) != 'function') {
        throw new Error('"handler" must be a function, got ' + typeof(options.handler));
      }

      var startTime = new Date().getTime(),
          requestNumber = ++this.requestNumber,
          requestHandler = options.handler;

      // The returned promise is part of chain that starts with the asynchronous construction of the request options.
      var promise = this.buildRequestOptions(options).then(_.bind(this.checkRequestOptions, this));

      // Then the HTTP request is started.
      promise = promise.then(_.bind(this.sendRequest, this, requestNumber, requestHandler, startTime));

      // Finally, handlers are added at the end of the promise chain to emit `error` or `response` events depending on the result.
      return promise.spread(_.bind(this.handleResponse, this, requestNumber, startTime), _.bind(this.handleError, this, requestNumber));
    },

    // ## Internals

    sendRequest: function(requestNumber, requestHandler, startTime, requestOptions) {

      // **EVENT:** emit the `request` event with the request number and options.
      this.emit('request', requestNumber, requestOptions);

      var deferred = q.defer();

      // Start the request.
      // Reject the deferred object if the request fails.
      // Resolve it if it succeeds.
      var r = request(requestOptions, function(err, response, body) {
        if (err) {
          return deferred.reject(err);
        }

        deferred.resolve([ response, body ]);
      });

      // If specified, call the request handler with the request object.
      if (requestHandler) {
        requestHandler(r);
      }

      // Return the promise.
      return deferred.promise;
    },

    handleError: function(requestNumber, err) {

      // **EVENT:** if the request fails, emit the `error` event with the request number and error message.
      this.emit('error', requestNumber, err);

      return q.reject(err);
    },

    handleResponse: function(requestNumber, startTime, response) {

      // **EVENT:** if the request succeeds, emit the `response` event with the request number, HTTP response and execution time
      this.emit('response', requestNumber, response, new Date().getTime() - startTime);

      return response;
    },

    // Check the `method` and `url` options.
    checkRequestOptions: function(options) {
      if (!_.isString(options.method)) {
        throw new Error('"method" must be a string, got ' + options.method);
      } else if (!_.isString(options.url)) {
        throw new Error('"url" must be a string, got ' + options.url);
      }

      return options;
    },

    // Build the options for the request library.
    buildRequestOptions: function(options) {

      var requestOptions = _.extend(_.omit(options, 'filters', 'handler'), {
        url: options.url
      });

      if (_.isString(options.method)) {
        requestOptions.method = options.method.toUpperCase();
      }

      var promise = q(requestOptions);

      if (options.filters) {
        _.each(options.filters, function(filter, i) {

          // Chain request filters with promises so that they may be asynchronous.
          promise = promise.then(filter).then(_.bind(this.ensureRequestOptions, this, i));
        }, this);
      }

      return promise;
    },

    // After each filter, ensure that the returned request options are valid.
    ensureRequestOptions: function(filterIndex, options) {
      if (options === undefined) {
        throw new Error('Request filter at index ' + filterIndex + ' returned nothing; it must return the filtered request options');
      } else if (!_.isObject(options)) {
        throw new Error('Expected request filter at index ' + filterIndex + ' to return the request options as an object, got ' + typeof(options));
      }

      return options;
    }
  });

  return Client;
};
