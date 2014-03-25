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
  }

  util.inherits(Client, events.EventEmitter);

  _.extend(Client.prototype, {

    configure: function(options) {
      _.extend(this, _.pick(options || {}, 'baseUrl'));
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
          requestNumber = ++this.requestNumber,
          requestOptions = this.buildRequestOptions(options);

      this.emit('request', requestNumber, requestOptions, options);

      request(requestOptions, _.bind(this.handleResponse, this, requestNumber, startTime, deferred));

      return deferred.promise;
    },

    handleResponse: function(requestNumber, startTime, deferred, err, response, body) {
      if (err) {
        this.emit('error', requestNumber, err);
        return deferred.reject(err);
      }

      this.emit('response', requestNumber, response, new Date().getTime() - startTime);

      deferred.resolve(response);
    },

    buildUrl: function(url) {
      return this.baseUrl ? this.baseUrl + url : url;
    },

    buildRequestOptions: function(options) {

      var requestOptions = _.extend(_.omit(options, 'filters'), {
        method: options.method.toUpperCase(),
        url: this.buildUrl(options.url)
      });

      if (options.filters) {
        _.each(options.filters, function(filter) {
          filter(requestOptions);
        }, this);
      }

      return requestOptions;
    }
  });

  return Client;
};
