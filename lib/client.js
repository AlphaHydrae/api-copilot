var _ = require('underscore'),
  events = require('events'),
  q = require('q'),
  util = require('util');

exports.inject = function(deps) {

  deps = deps || {};
  var request = deps.request || require('request');

  function Client() {
    this.requestNumber = 0;
    events.EventEmitter.call(this);
  }

  util.inherits(Client, events.EventEmitter);

  _.extend(Client.prototype, {

    request: function(options) {
      options = options || {};

      if (!_.isObject(options)) {
        throw new Error('Request options must be an object');
      } else if (options.handler !== undefined && typeof(options.handler) != 'function') {
        throw new Error('"handler" must be a function, got ' + typeof(options.handler));
      }

      var deferred = q.defer(),
          startTime = new Date().getTime(),
          requestNumber = ++this.requestNumber,
          requestHandler = options.handler;

      return this.buildRequestOptions(options).then(_.bind(this.checkRequestOptions, this))
        .then(_.bind(this.sendRequest, this, requestNumber, requestHandler, startTime))
        .spread(_.bind(this.handleResponse, this, requestNumber, startTime), _.bind(this.handleError, this, requestNumber));
    },

    sendRequest: function(requestNumber, requestHandler, startTime, requestOptions) {

      this.emit('request', requestNumber, requestOptions);

      var deferred = q.defer();
      var r = request(requestOptions, function(err, response, body) {
        if (err) {
          return deferred.reject(err);
        }

        deferred.resolve([ response, body ]);
      });

      if (requestHandler) {
        requestHandler(r);
      }

      return deferred.promise;
    },

    handleError: function(requestNumber, err) {
      this.emit('error', requestNumber, err);
      return q.reject(err);
    },

    handleResponse: function(requestNumber, startTime, response) {
      this.emit('response', requestNumber, response, new Date().getTime() - startTime);
      return response;
    },

    checkRequestOptions: function(options) {
      if (!_.isString(options.method)) {
        throw new Error('"method" must be a string, got ' + options.method);
      } else if (!_.isString(options.url)) {
        throw new Error('"url" must be a string, got ' + options.url);
      }

      return options;
    },

    buildRequestOptions: function(options) {

      var requestOptions = _.extend(_.omit(options, 'filters', 'handler'), {
        url: options.url
      });

      if (_.isString(options.method)) {
        requestOptions.method = options.method.toUpperCase();
      }

      // make a promise for chaining
      var promise = q(requestOptions);

      if (options.filters) {

        // add each filter to the chain
        _.each(options.filters, function(filter, i) {

          // after each filter, ensure that the returned request options are an object
          promise = promise.then(filter).then(_.bind(this.ensureRequestOptions, this, i));
        }, this);
      }

      return promise;
    },

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
