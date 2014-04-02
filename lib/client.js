exports.inject = function(deps) {
  deps = deps || {};

  var _ = require('underscore'),
    events = require('events'),
    q = require('q'),
    request = deps.request || require('request'),
    util = require('util');

  function Client() {

    this.requestNumber = 0;

    events.EventEmitter.call(this);
    this.on('configure', _.bind(this.configure, this));
  }

  util.inherits(Client, events.EventEmitter);

  _.extend(Client.prototype, {

    configure: function(options) {
      _.extend(this, _.pick(options, 'baseUrl'));
    },

    request: function(options) {
      if (!_.isObject(options)) {
        throw new Error('Request options must be an object');
      } else if (!_.isString(options.method)) {
        throw new Error('"method" must be a string, got ' + options.method);
      } else if (!_.isString(options.url)) {
        throw new Error('"url" must be a string, got ' + options.url);
      }

      var deferred = q.defer(),
          startTime = new Date().getTime(),
          requestNumber = ++this.requestNumber;

      return this.buildRequestOptions(options).then(_.bind(this.sendRequest, this, requestNumber, startTime, options))
        .spread(_.bind(this.handleResponse, this, requestNumber, startTime), _.bind(this.handleError, this, requestNumber));
    },

    sendRequest: function(requestNumber, startTime, originalOptions, requestOptions) {
      this.emit('request', requestNumber, requestOptions, originalOptions);
      return q.nfcall(request, requestOptions);
    },

    handleError: function(requestNumber, err) {
      this.emit('error', requestNumber, err);
      return q.reject(err);
    },

    handleResponse: function(requestNumber, startTime, response) {
      this.emit('response', requestNumber, response, new Date().getTime() - startTime);
      return response;
    },

    buildUrl: function(url) {
      return this.baseUrl ? this.baseUrl + url : url;
    },

    buildRequestOptions: function(options) {

      var requestOptions = _.extend(_.omit(options, 'filters'), {
        method: options.method.toUpperCase(),
        url: this.buildUrl(options.url)
      });

      // make a promise for chaining
      var promise = q(requestOptions);

      if (options.filters) {

        // add each filter to the chain
        _.each(options.filters, function(filter, i) {

          // after each filter, ensure that the returned request options
          // are an object, or use 
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
