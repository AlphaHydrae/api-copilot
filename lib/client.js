// # Client
// Promise-based HTTP client around the [request](https://github.com/mikeal/request) library.

// ## Events
// A client is an [event emitter](http://nodejs.org/api/events.html).
// The following events can be emitted:
//
// * `request` - when an HTTP request is started;
// * `error` - if an HTTP request fails;
// * `response` - when an HTTP response is received.
//
// See [Internals](#internals) for more information on these events.

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
// This module exports a factory function the can be used to inject mock dependencies.
//
// The following dependencies can be passed to the function in order:
//
// * `request` - the request library.
//
// For example:
//
//     var Client = clientFactory(requestMock);
module.exports = function(request) {

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

      var startTime = new Date().getTime(),
          requestNumber = ++this.requestNumber,
          requestHandler = options.handler;

      // The returned promise is part of chain that starts with the asynchronous construction of the request options.
      var promise = q.fcall(_.bind(this.buildRequestOptions, this), options).then(_.bind(this.checkRequestOptions, this));

      // Then the HTTP request is started.
      promise = promise.then(_.bind(this.sendRequest, this, requestNumber, requestHandler, startTime));

      // Finally, handlers are added at the end of the promise chain to emit `error` or `response` events depending on the result.
      return promise.spread(_.bind(this.handleResponse, this, requestNumber, startTime), _.bind(this.handleError, this, requestNumber));
    },

    // ## Internals

    sendRequest: function(requestNumber, requestHandler, startTime, requestOptions) {

      // **EVENT:** the `request` event is emitted when an HTTP request starts, with the request number and options as arguments.
      this.emit('request', requestNumber, requestOptions);

      var deferred = q.defer();

      // The returned promise is resolved if the request succeeds, rejected if it fails.
      var r = request(requestOptions, function(err, response, body) {
        if (err) {
          return deferred.reject(err);
        }

        deferred.resolve([ response, body ]);
      });

      // If specified, the request handler function is called with the request object.
      if (requestHandler) {
        requestHandler(r);
      }

      return deferred.promise;
    },

    handleError: function(requestNumber, err) {

      // **EVENT:** the `error` event is emitted if the request fails, with the request number and error message as arguments.
      this.emit('error', requestNumber, err);

      return q.reject(err);
    },

    handleResponse: function(requestNumber, startTime, response) {

      // **EVENT:** the `response` event is emitted if the request succeeds, with the request number, HTTP response and execution time as arguments.
      this.emit('response', requestNumber, response, new Date().getTime() - startTime);

      return response;
    },

    // An error is thrown if either the `method` or the `url` option is not a string.
    // Note that this error is caught by the promise chain and causes the returned promise to be rejected.
    checkRequestOptions: function(options) {
      if (!_.isString(options.method)) {
        throw new Error('"method" must be a string, got ' + options.method);
      } else if (!_.isString(options.url)) {
        throw new Error('"url" must be a string, got ' + options.url);
      }

      return options;
    },

    buildRequestOptions: function(options) {
      if (!_.isObject(options)) {
        throw new Error('Request options must be an object, got ' + typeof(options));
      } else if (options.handler !== undefined && typeof(options.handler) != 'function') {
        throw new Error('"handler" must be a function, got ' + typeof(options.handler));
      }

      // Options for the request library are the same as the ones provided to `#request`
      // but without the `filters` and `handler` options which are specific to this client.
      var requestOptions = _.extend(_.omit(options, 'filters', 'handler'), {
        url: options.url
      });

      // The HTTP method is automatically converted to uppercase.
      if (_.isString(options.method)) {
        requestOptions.method = options.method.toUpperCase();
      }

      var promise = q(requestOptions);

      if (options.filters) {
        _.each(options.filters, function(filter, i) {

          // Request filters are executed in a promise chain so that they may be asynchronous.
          promise = promise.then(filter).then(_.bind(this.ensureRequestOptions, this, i));
        }, this);
      }

      return promise;
    },

    // After each filter, this check ensures that the returned request options are valid.
    // Again, any error is caught by the promise chain and causes the returned promise to be rejected.
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

module.exports['@require'] = [ 'request' ];
